import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { PROFILES, ROLES, SUPABASE } from '../../config'
import type { Role, User } from '../../data/types'
import { AuthError, type AuthService, type Backend, type Collection, type CollectionName, type Session } from '../backend'
import { NetworkError, withOutbox } from '../outbox'
import { checkPin, hasPin, pinSecret, savePin } from '../pin'

// The database backend: Supabase (Postgres + Auth). Tables and Row Level Security live in
// supabase/schema.sql. Records map 1:1 to rows with snake_case columns; nested values
// (steps, repeat pattern, reminder settings) are jsonb.

const TABLE: Record<CollectionName, string> = {
  profiles: 'profiles', routines: 'routines', completions: 'routine_completions', tasks: 'tasks',
  notifications: 'notifications', activity: 'activity', settings: 'settings', statuses: 'daily_status',
}

/** Columns Postgres returns as timestamptz; normalised back to the ISO strings the app writes. */
const TIMESTAMPS = new Set(['updated_at', 'completed_at', 'started_at', 'scheduled_for'])
const TIMESTAMP_CREATED = new Set<CollectionName>(['tasks', 'notifications', 'activity'])

const snake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
const camel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())

export function toRow(item: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(item).map(([k, v]) => [snake(k), v === undefined ? null : v]))
}

export function fromRow<T>(name: CollectionName, row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (v === null) continue
    const isTs = TIMESTAMPS.has(k) || (k === 'created_at' && TIMESTAMP_CREATED.has(name))
    out[camel(k)] = isTs && typeof v === 'string' ? new Date(v).toISOString() : v
  }
  return out as T
}

const isNetwork = (message: string) => !navigator.onLine || /fetch|network|load failed|timed? ?out/i.test(message)

function fail(error: { message: string }): never {
  if (isNetwork(error.message)) throw new NetworkError(error.message)
  throw new Error(error.message)
}

function collection<T extends { id: string }>(sb: SupabaseClient, name: CollectionName): Collection<T> {
  const table = TABLE[name]
  return {
    async list(filter) {
      const rows: T[] = []
      const page = 1000
      for (let from = 0; ; from += page) {
        const { data, error } = await sb.from(table).select('*').match(toRow(filter)).range(from, from + page - 1)
        if (error) fail(error)
        rows.push(...(data ?? []).map((r) => fromRow<T>(name, r)))
        if (!data || data.length < page) return rows
      }
    },
    async put(item) {
      // A nudge for the other person is a plain insert: their row is theirs, so it can't be upserted.
      const row = toRow(item)
      const me = (await sb.auth.getSession()).data.session?.user.id
      const { error } = name === 'notifications' && row.user_id !== me ? await sb.from(table).insert(row) : await sb.from(table).upsert(row)
      if (error) fail(error)
    },
    async remove(id) {
      const { error } = await sb.from(table).delete().eq('id', id)
      if (error) fail(error)
    },
  }
}

const UNLOCKED = 'aurelio:unlocked'

const roleFor = (email?: string | null): Role | null =>
  ROLES.find((r) => PROFILES[r].email.toLowerCase() === (email ?? '').toLowerCase()) ?? null

export function createSupabaseServices(): { backend: Backend; auth: AuthService } {
  const sb = createClient(SUPABASE.url, SUPABASE.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'aurelio:supabase-auth' },
  })

  const raw: Backend = {
    kind: 'supabase',
    profiles: collection(sb, 'profiles'),
    routines: collection(sb, 'routines'),
    completions: collection(sb, 'completions'),
    tasks: collection(sb, 'tasks'),
    notifications: collection(sb, 'notifications'),
    activity: collection(sb, 'activity'),
    settings: collection(sb, 'settings'),
    statuses: collection(sb, 'statuses'),
  }
  const backend = withOutbox(raw)
  void backend.flush()

  const userFrom = (u: { id: string; email?: string | null }): User => {
    const role = roleFor(u.email)
    if (!role) throw new AuthError('This account isn’t one of the two allowed.', 'not-allowed')
    return { id: u.id, email: PROFILES[role].email, name: PROFILES[role].name, role }
  }

  /** The stored provider session, if it belongs to this profile. Works offline from the cached session. */
  const sessionFor = async (role: Role) => {
    const { data } = await sb.auth.getSession()
    const u = data.session?.user
    return u && roleFor(u.email) === role ? userFrom(u) : null
  }

  const unlock = (user: User): Session => {
    sessionStorage.setItem(UNLOCKED, user.role)
    return { user }
  }

  const authError = (e: { message: string; status?: number }) =>
    isNetwork(e.message) ? new AuthError('You’re offline. Connect to sign in.', 'offline') : new AuthError(e.message)

  const auth: AuthService = {
    async current() {
      const role = sessionStorage.getItem(UNLOCKED) as Role | null
      if (!role) return null
      const user = await sessionFor(role)
      return user ? { user } : null
    },

    hasPin,

    async sendCode(role) {
      // Only the two existing accounts can receive a code; nobody new can sign up.
      const { error } = await sb.auth.signInWithOtp({ email: PROFILES[role].email, options: { shouldCreateUser: false } })
      if (error) throw authError(error)
    },

    async verifyCode(role, code) {
      const { error } = await sb.auth.verifyOtp({ email: PROFILES[role].email, token: code.trim(), type: 'email' })
      if (error) throw isNetwork(error.message) ? authError(error) : new AuthError('That code isn’t right, or it has expired.', 'wrong-code')
    },

    async setPin(role, pin) {
      const user = await sessionFor(role)
      if (!user) throw new AuthError('Verify your email first.', 'not-verified')
      const { error } = await sb.auth.updateUser({ password: await pinSecret(user.email, pin) })
      if (error) throw authError(error)
      await savePin(role, pin)
      return unlock(user)
    },

    async signInWithPin(role, pin) {
      const email = PROFILES[role].email
      // Fast path, also offline: the PIN matches this device's hash and the provider session is still here.
      if (await checkPin(role, pin)) {
        const user = await sessionFor(role)
        if (user) return unlock(user)
      }
      // Otherwise ask the provider (a new device's session expired, or the PIN was changed elsewhere).
      const { data, error } = await sb.auth.signInWithPassword({ email, password: await pinSecret(email, pin) })
      if (error) throw isNetwork(error.message) ? authError(error) : new AuthError('Wrong PIN.', 'wrong-pin')
      await savePin(role, pin)
      return unlock(userFrom(data.user))
    },

    async signOut() {
      // Locks the app. The provider session stays so the PIN can unlock it again offline.
      sessionStorage.removeItem(UNLOCKED)
    },
  }

  return { backend, auth }
}

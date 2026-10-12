import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { PROFILES, ROLES, SUPABASE } from '../../config'
import type { Role, User } from '../../data/types'
import { AuthError, type AuthService, type Backend, type Collection, type CollectionName, type Session } from '../backend'
import { NetworkError, withOutbox } from '../outbox'
import { checkPin, hasPin, savePin } from '../pin'

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

/** Each account carries its profile in app_metadata (set by the deploy workflow), so the app never needs the emails. */
const roleFor = (u?: { app_metadata?: Record<string, unknown> } | null): Role | null => {
  const r = u?.app_metadata?.role
  return ROLES.find((x) => x === r) ?? null
}

let client: SupabaseClient | null = null
/** The connected client, for the push and Ori services. Null in local mode. */
export const getSupabase = () => client

/** Calls the auth function and turns its error codes into the app's AuthErrors. */
async function callAuth(sb: SupabaseClient, body: Record<string, unknown>) {
  const { data, error } = await sb.functions.invoke('auth', { body })
  if (!error) return data as { session?: { access_token: string; refresh_token: string }; mode?: 'code' | 'link' }
  const ctx = (error as { context?: Response }).context
  let code = ''
  let left: number | undefined
  try {
    const j = (await ctx?.json()) as { error?: string; left?: number }
    code = j.error ?? ''
    left = j.left
  } catch {
    /* no body: a network failure */
  }
  if (!ctx || isNetwork(error.message)) throw new AuthError('You’re offline. Connect to sign in.', 'offline')
  if (code === 'wrong-pin') throw new AuthError(left && left <= 2 ? `Wrong PIN. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Wrong PIN.', 'wrong-pin')
  if (code === 'locked') throw new AuthError('Too many wrong PINs. Try again in 15 minutes, or use the email link.', 'locked')
  if (code === 'wrong-code') throw new AuthError('That code isn’t right, or it has expired.', 'wrong-code')
  if (code === 'not-verified') throw new AuthError('Verify your email first.', 'not-verified')
  if (code === 'not-allowed') throw new AuthError('This profile isn’t set up yet.', 'not-allowed')
  if (code === 'rate-limited') throw new AuthError('Too many codes sent. Wait a few minutes and try again.')
  throw new AuthError('Something went wrong. Try again.')
}

export function createSupabaseServices(): { backend: Backend; auth: AuthService } {
  // Opened from the sign-in link in the email: the client picks the session up from the URL.
  const fromLink = /[#&](access_token|error_code)=/.test(window.location.hash)
  const linkError = /error_code=otp_expired/.test(window.location.hash) ? 'That link has expired. Send a new one.' : /error_code=/.test(window.location.hash) ? 'That link didn’t work. Send a new one.' : null
  const sb = createClient(SUPABASE.url, SUPABASE.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'aurelio:supabase-auth', flowType: 'implicit', detectSessionInUrl: true },
  })
  client = sb

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

  const userFrom = (u: { id: string; app_metadata?: Record<string, unknown> }): User => {
    const role = roleFor(u)
    if (!role) throw new AuthError('This account isn’t one of the two allowed.', 'not-allowed')
    return { id: u.id, email: PROFILES[role].email, name: PROFILES[role].name, role }
  }

  /** The stored provider session, if it belongs to this profile. Works offline from the cached session. */
  const sessionFor = async (role: Role) => {
    const { data } = await sb.auth.getSession()
    const u = data.session?.user
    return u && roleFor(u) === role ? userFrom(u) : null
  }

  const unlock = (user: User): Session => {
    sessionStorage.setItem(UNLOCKED, user.role)
    return { user }
  }

  const adopt = async (s?: { access_token: string; refresh_token: string }) => {
    if (!s) throw new AuthError('Something went wrong. Try again.')
    const { data, error } = await sb.auth.setSession(s)
    if (error || !data.user) throw new AuthError('Something went wrong. Try again.')
    return userFrom(data.user)
  }

  const auth: AuthService = {
    async current() {
      const role = sessionStorage.getItem(UNLOCKED) as Role | null
      if (!role) return null
      const user = await sessionFor(role)
      return user ? { user } : null
    },

    hasPin,

    async sendCode(role) {
      // The server looks up the address for this profile; nobody new can sign up.
      const res = await callAuth(sb, { action: 'send', role })
      return res.mode ?? 'code'
    },

    async fromEmailLink() {
      if (!fromLink) return null
      if (linkError) throw new AuthError(linkError, 'wrong-code')
      const { data } = await sb.auth.getSession()
      if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search)
      return roleFor(data.session?.user)
    },

    async verifyCode(role, code) {
      const res = await callAuth(sb, { action: 'verify', role, code: code.trim() })
      await adopt(res.session)
    },

    async setPin(role, pin) {
      const user = await sessionFor(role)
      if (!user) throw new AuthError('Verify your email first.', 'not-verified')
      await callAuth(sb, { action: 'setpin', pin })
      await savePin(role, pin)
      return unlock(user)
    },

    async signInWithPin(role, pin) {
      // Fast path, also offline: the PIN matches this device's hash and the provider session is still here.
      if (await checkPin(role, pin)) {
        const user = await sessionFor(role)
        if (user) return unlock(user)
      }
      // Otherwise ask the server (a new device, an expired session, or the PIN was changed elsewhere).
      const res = await callAuth(sb, { action: 'pin', role, pin })
      const user = await adopt(res.session)
      await savePin(role, pin)
      return unlock(user)
    },

    async signOut() {
      // Locks the app. The provider session stays so the PIN can unlock it again offline.
      sessionStorage.removeItem(UNLOCKED)
    },
  }

  return { backend, auth }
}

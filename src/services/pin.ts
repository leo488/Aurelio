import type { Role } from '../data/types'
import { AuthError } from './backend'

// PIN handling shared by every auth service: a salted PBKDF2 hash per profile on this device
// (never the PIN itself) and a lockout after repeated wrong attempts.

const ITERATIONS = 210_000
const MAX_TRIES = 5

interface PinRecord { salt: string; hash: string; iterations: number }
interface Attempts { count: number; until?: number }

const store = {
  get<T>(key: string): T | null {
    try {
      const v = localStorage.getItem(key)
      return v ? (JSON.parse(v) as T) : null
    } catch {
      return null
    }
  },
  set(key: string, value: unknown) {
    try {
      if (value === null) localStorage.removeItem(key)
      else localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* private mode: the PIN just won't be remembered */
    }
  },
}

const pinKey = (role: Role) => `aurelio:pin:${role}`
const triesKey = (role: Role) => `aurelio:pin-tries:${role}`

const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
const unhex = (s: string) => new Uint8Array(s.match(/../g)!.map((h) => parseInt(h, 16)))

async function derive(pin: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256))
}

export const isValidPin = (pin: string) => /^\d{4,8}$/.test(pin)

export const hasPin = (role: Role) => !!store.get<PinRecord>(pinKey(role))

export async function savePin(role: Role, pin: string) {
  if (!isValidPin(pin)) throw new AuthError('Use 4 to 8 digits.')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  store.set(pinKey(role), { salt: hex(salt.buffer), hash: await derive(pin, salt, ITERATIONS), iterations: ITERATIONS } satisfies PinRecord)
  store.set(triesKey(role), null)
}

export const forgetPin = (role: Role) => store.set(pinKey(role), null)

/** Throws "locked" while a lockout runs; returns whether the PIN matched and counts misses. */
export async function checkPin(role: Role, pin: string): Promise<boolean> {
  const tries = store.get<Attempts>(triesKey(role)) ?? { count: 0 }
  if (tries.until && Date.now() < tries.until) {
    throw new AuthError(`Too many tries. Wait ${Math.ceil((tries.until - Date.now()) / 1000)} seconds.`, 'locked')
  }
  const rec = store.get<PinRecord>(pinKey(role))
  if (!rec) return false
  const ok = (await derive(pin, unhex(rec.salt), rec.iterations)) === rec.hash
  if (ok) store.set(triesKey(role), null)
  else {
    const count = tries.count + 1
    // 30s after five misses, doubling each time after that.
    const until = count >= MAX_TRIES ? Date.now() + 30_000 * 2 ** (count - MAX_TRIES) : undefined
    store.set(triesKey(role), { count, until })
  }
  return ok
}

/**
 * The secret the database's auth provider sees in place of the PIN: PBKDF2 of the PIN salted
 * with the account email, so the provider never receives the PIN and the value meets its
 * minimum password length. Wrong-PIN guessing is limited by the provider's rate limits.
 */
export const pinSecret = async (email: string, pin: string) =>
  derive(pin, new TextEncoder().encode(`aurelio:${email.toLowerCase()}`), 100_000)

/** The last profile used on this device, so the PIN screen can open straight away. */
export const lastProfile = {
  get: () => store.get<Role>('aurelio:last-profile'),
  set: (r: Role | null) => store.set('aurelio:last-profile', r),
}

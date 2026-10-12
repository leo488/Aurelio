import type { Activity, AppNotification, DailyStatus, Role, Routine, RoutineCompletion, Settings, Task, User } from '../data/types'

// The storage contract. The UI never sees this: screens talk to the store, the store talks to the
// services in this folder, and the services talk to a Backend. Swapping local storage for a
// database means writing another Backend, nothing above it changes.

export interface Collection<T extends { id: string }> {
  /** Every record the signed-in user may read whose fields equal the filter's. */
  list(filter: Partial<T>): Promise<T[]>
  /** Insert or replace by id. Ids are made on the device, so a retry is always safe. */
  put(item: T): Promise<void>
  remove(id: string): Promise<void>
}

export interface Backend {
  kind: 'local' | 'supabase'
  profiles: Collection<User>
  routines: Collection<Routine>
  completions: Collection<RoutineCompletion>
  tasks: Collection<Task>
  notifications: Collection<AppNotification>
  activity: Collection<Activity>
  settings: Collection<Settings>
  statuses: Collection<DailyStatus>
}

export type CollectionName = Exclude<keyof Backend, 'kind'>

export interface Session {
  user: User
}

/**
 * Two fixed accounts, a PIN for everyday sign-in and the email as the fallback.
 * PINs are never stored as typed: the local service keeps a salted PBKDF2 hash and the
 * database service hands a derived secret to the auth provider.
 */
export interface AuthService {
  /** The signed-in person, if the app is unlocked. */
  current(): Promise<Session | null>
  /** Whether this device has a PIN for the profile (decides "Enter PIN" vs first-time setup). */
  hasPin(role: Role): boolean
  /** Send a one-time code to the profile's email. 'link' means the email carries a sign-in link instead. */
  sendCode(role: Role): Promise<'code' | 'link' | void>
  /** The profile confirmed by opening the email's sign-in link, when the app was opened that way. */
  fromEmailLink?(): Promise<Role | null>
  /** Check the emailed code. After this, setPin finishes setup. */
  verifyCode(role: Role, code: string): Promise<void>
  /** Create or replace the PIN once the email is verified. */
  setPin(role: Role, pin: string): Promise<Session>
  signInWithPin(role: Role, pin: string): Promise<Session>
  /** Lock the app; the PIN is needed next time. */
  signOut(): Promise<void>
  /** Shown on the verification step, e.g. the demo code in local mode. */
  codeHint?: string
}

export type AuthErrorCode = 'wrong-pin' | 'wrong-code' | 'locked' | 'not-verified' | 'offline' | 'not-allowed' | 'unknown'

export class AuthError extends Error {
  readonly code: AuthErrorCode
  constructor(message: string, code: AuthErrorCode = 'unknown') {
    super(message)
    this.code = code
  }
}

import { PROFILES } from '../../config'
import type { Role } from '../../data/types'
import { AuthError, type AuthService, type Session } from '../backend'
import { checkPin, hasPin, savePin } from '../pin'

// Device-only sign-in for local mode. The email step is simulated with a fixed code so the
// first-time flow is the same one the database version runs.

const DEMO_CODE = '123456'
const SESSION = 'aurelio:session'

const sessionFor = (role: Role): Session => ({ user: { id: role, role, name: PROFILES[role].name, email: PROFILES[role].email } })

const verified = new Set<Role>()

export const localAuth: AuthService = {
  codeHint: `Local mode sends no email. Use ${DEMO_CODE}.`,

  async current() {
    // Unlocking lasts for this visit only; closing the app locks it again.
    const role = sessionStorage.getItem(SESSION) as Role | null
    return role && role in PROFILES ? sessionFor(role) : null
  },

  hasPin,

  async sendCode() {},

  async verifyCode(role, code) {
    if (code.trim() !== DEMO_CODE) throw new AuthError('That code isn’t right.', 'wrong-code')
    verified.add(role)
  },

  async setPin(role, pin) {
    if (!verified.has(role)) throw new AuthError('Verify your email first.', 'not-verified')
    await savePin(role, pin)
    verified.delete(role)
    sessionStorage.setItem(SESSION, role)
    return sessionFor(role)
  },

  async signInWithPin(role, pin) {
    if (!(await checkPin(role, pin))) throw new AuthError('Wrong PIN.', 'wrong-pin')
    sessionStorage.setItem(SESSION, role)
    return sessionFor(role)
  },

  async signOut() {
    sessionStorage.removeItem(SESSION)
  },
}

import { create } from 'zustand'
import { partnerRole, PROFILES } from '../config'
import type { Session } from '../services/backend'
import { useData } from './store'
import type { Role, User } from './types'

/** Who is signed in. `checked` turns true once the auth service has answered at start-up. */
interface AuthState {
  session: Session | null
  checked: boolean
  setSession: (s: Session | null) => void
}

export const useAuth = create<AuthState>()((set) => ({
  session: null,
  checked: false,
  setSession: (session) => set({ session, checked: true }),
}))

export const displayName = (r: Role) => PROFILES[r].name

const NOBODY: User = { id: '', role: 'leo', name: PROFILES.leo.name, email: PROFILES.leo.email }

/** The signed-in person and the other one. Screens behind the login can rely on `me`. */
export function useMe() {
  const me = useData((s) => s.me) ?? NOBODY
  const partner = useData((s) => s.partner)
  const pRole = partnerRole(me.role)
  return { me, role: me.role, partner, partnerRole: pRole, name: me.name, partnerName: partner?.name ?? PROFILES[pRole].name }
}

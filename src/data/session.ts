import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from './types'

interface SessionState {
  user: User | null
  setUser: (user: User | null) => void
}

export const useSession = create<SessionState>()(
  persist((set) => ({ user: null, setUser: (user) => set({ user }) }), { name: 'aurelio-session' }),
)

export const partnerOf = (u: User): User => (u === 'leo' ? 'soniya' : 'leo')
export const displayName: Record<User, string> = { leo: 'Leo', soniya: 'Soniya' }
/** Pronouns used in the design copy ("She can check items off too"). */
export const pronoun: Record<User, { they: string; them: string; their: string }> = {
  leo: { they: 'he', them: 'him', their: 'his' },
  soniya: { they: 'she', them: 'her', their: 'her' },
}

/** The signed-in user; screens behind the profile picker can rely on it. */
export function useMe() {
  const user = useSession((s) => s.user) ?? 'leo'
  const partner = partnerOf(user)
  return { me: user, partner, name: displayName[user], partnerName: displayName[partner], partnerPronoun: pronoun[partner] }
}

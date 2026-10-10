import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type User = 'leo' | 'soniya'

export const partnerOf = (u: User): User => (u === 'leo' ? 'soniya' : 'leo')
export const displayName: Record<User, string> = { leo: 'Leo', soniya: 'Soniya' }

interface SessionState {
  user: User | null
  setUser: (user: User | null) => void
}

export const useSession = create<SessionState>()(
  persist((set) => ({ user: null, setUser: (user) => set({ user }) }), { name: 'aurelio-session' }),
)

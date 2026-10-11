import type { Role } from './data/types'

// The two people this app is for. Emails come from the environment (.env.local or the host's
// settings) so they live in one place; nothing else in the app hard-codes them.

export interface Profile {
  role: Role
  name: string
  email: string
}

const env = import.meta.env

export const PROFILES: Record<Role, Profile> = {
  leo: { role: 'leo', name: 'Leo', email: (env.VITE_LEO_EMAIL as string | undefined)?.trim() || 'leo@example.com' },
  sonia: { role: 'sonia', name: 'Sonia', email: (env.VITE_SONIA_EMAIL as string | undefined)?.trim() || 'sonia@example.com' },
}

export const ROLES: Role[] = ['leo', 'sonia']

export const partnerRole = (r: Role): Role => (r === 'leo' ? 'sonia' : 'leo')

/** Which backend to use: Supabase when both values are set, otherwise data stays on this device. */
export const SUPABASE = {
  url: (env.VITE_SUPABASE_URL as string | undefined)?.trim() || '',
  anonKey: (env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '',
}
export const useSupabase = !!(SUPABASE.url && SUPABASE.anonKey)

/** "l••@gmail.com", shown on the verification step. */
export const maskEmail = (email: string) => {
  const [name, domain] = email.split('@')
  return `${name.slice(0, 1)}${'•'.repeat(Math.max(2, name.length - 1))}@${domain ?? ''}`
}

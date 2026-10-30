import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.117.3'

export const URL_ = Deno.env.get('SUPABASE_URL')!
export const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

/** Full access, for work the app itself may not do (the allowlist, PIN lockout, sending pushes). */
export const admin = (): SupabaseClient => createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } })

/** The same access the app has, for the provider's sign-in calls. */
export const publicClient = (): SupabaseClient => createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false, flowType: 'implicit' } })

export type Role = 'leo' | 'sonia'
export const isRole = (r: unknown): r is Role => r === 'leo' || r === 'sonia'

export async function emailFor(role: Role): Promise<string | null> {
  const { data } = await admin().from('members').select('email').eq('role', role).maybeSingle()
  return (data?.email as string | undefined) ?? null
}

/** The signed-in member behind a request's bearer token, or null. */
export async function memberFrom(req: Request): Promise<{ id: string; role: Role; email: string } | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const db = admin()
  const { data } = await db.auth.getUser(token)
  const email = data.user?.email?.toLowerCase()
  if (!data.user || !email) return null
  const { data: m } = await db.from('members').select('role').ilike('email', email).maybeSingle()
  return m && isRole(m.role) ? { id: data.user.id, role: m.role, email } : null
}

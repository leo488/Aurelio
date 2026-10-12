// Sign-in for the two members, by profile rather than by email, so the addresses never ship in
// the public app. Actions:
//   send    { role }        → emails a 6-digit code (or, on Supabase's own sender, a sign-in link)
//   verify  { role, code }  → checks the code and returns a session
//   setpin  { pin }         → (signed in) sets the PIN as the account's password
//   pin     { role, pin }   → signs in with the PIN; five wrong tries lock the profile for 15 minutes
import { admin, cors, emailFor, isRole, json, memberFrom, publicClient, type Role } from '../_shared/common.ts'

const PEPPER = Deno.env.get('PIN_PEPPER') ?? ''
const MAX_TRIES = 5
const LOCK_MINUTES = 15

/** The password the provider stores for a PIN: an HMAC with a server-only key, never the PIN itself. */
async function secretFor(role: Role, pin: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(PEPPER), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`aurelio:${role}:${pin}`))
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('')
}

const session = (s: { access_token: string; refresh_token: string } | null | undefined) =>
  s ? { access_token: s.access_token, refresh_token: s.refresh_token } : null

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (!PEPPER) return json({ error: 'not-configured' }, 500)
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'bad-request' }, 400)
  }
  const action = body.action
  const pin = typeof body.pin === 'string' ? body.pin : ''

  if (action === 'setpin') {
    const me = await memberFrom(req)
    if (!me) return json({ error: 'not-verified' }, 401)
    if (!/^\d{4,8}$/.test(pin)) return json({ error: 'bad-pin' }, 400)
    const { error } = await admin().auth.admin.updateUserById(me.id, { password: await secretFor(me.role, pin) })
    if (error) return json({ error: 'unknown', message: error.message }, 500)
    await admin().from('pin_attempts').upsert({ role: me.role, failures: 0, locked_until: null })
    return json({ ok: true })
  }

  if (!isRole(body.role)) return json({ error: 'bad-request' }, 400)
  const role = body.role
  const email = await emailFor(role)
  if (!email) return json({ error: 'not-allowed' }, 403)

  if (action === 'send') {
    const { error } = await publicClient().auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
    if (error) return json({ error: error.status === 429 ? 'rate-limited' : 'unknown', message: error.message }, error.status === 429 ? 429 : 500)
    const { data } = await admin().from('server_config').select('value').eq('key', 'email_mode').maybeSingle()
    return json({ ok: true, mode: data?.value === 'link' ? 'link' : 'code' })
  }

  if (action === 'verify') {
    const code = typeof body.code === 'string' ? body.code.trim() : ''
    const { data, error } = await publicClient().auth.verifyOtp({ email, token: code, type: 'email' })
    if (error || !data.session) return json({ error: 'wrong-code' }, 401)
    return json({ session: session(data.session) })
  }

  if (action === 'pin') {
    const db = admin()
    const { data: row } = await db.from('pin_attempts').select('failures, locked_until').eq('role', role).maybeSingle()
    if (row?.locked_until && new Date(row.locked_until as string) > new Date()) return json({ error: 'locked', until: row.locked_until }, 429)
    const { data, error } = await publicClient().auth.signInWithPassword({ email, password: await secretFor(role, pin) })
    if (error || !data.session) {
      const failures = ((row?.failures as number | undefined) ?? 0) + 1
      const lock = failures >= MAX_TRIES
      await db.from('pin_attempts').upsert({ role, failures: lock ? 0 : failures, locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null })
      return json({ error: lock ? 'locked' : 'wrong-pin', left: lock ? 0 : MAX_TRIES - failures }, lock ? 429 : 401)
    }
    await db.from('pin_attempts').upsert({ role, failures: 0, locked_until: null })
    return json({ session: session(data.session) })
  }

  return json({ error: 'bad-request' }, 400)
})

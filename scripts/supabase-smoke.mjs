// End-to-end checks against the live project after a deploy, without sending any email:
// sign-in by code, privacy rules, the AI, and the push dispatcher. Leaves no data behind.
// Needs SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY, LEO_EMAIL.
const REF = process.env.SUPABASE_PROJECT_REF
const URL_ = `https://${REF}.supabase.co`
const SERVICE = process.env.SUPABASE_SERVICE_KEY
const ANON = process.env.SUPABASE_ANON_KEY
const LEO = process.env.LEO_EMAIL.trim().toLowerCase()

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ` (${detail})`}`)
  if (!ok) failed++
}
const sql = async (query) => {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }),
  })
  return res.json()
}
const fn = (name, body, token = ANON, extra = {}) =>
  fetch(`${URL_}/functions/v1/${name}`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(body) })
const rest = (path, token, init = {}) =>
  fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init.headers ?? {}) } })

// Functions answer and refuse strangers.
const cronSecret = (await sql(`select value from public.server_config where key = 'cron_secret'`))[0]?.value
check('push dispatcher refuses calls without the cron secret', (await fn('push-dispatch', {})).status === 403)
const disp = await fn('push-dispatch', {}, ANON, { 'x-cron-secret': cronSecret })
check('push dispatcher runs', disp.status === 200, `${disp.status} ${await disp.clone().text()}`)
check('Ori refuses anyone not signed in', (await fn('ori', { transcript: 'hi' })).status === 401)
check('wrong code is refused', (await fn('auth', { action: 'verify', role: 'leo', code: '000000' })).status === 401)

// Sign in as Leo with a one-time code made by the admin API (nothing is emailed).
const link = await fetch(`${URL_}/auth/v1/admin/generate_link`, {
  method: 'POST', headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'magiclink', email: LEO }),
}).then((r) => r.json())
const otp = link.email_otp ?? link.properties?.email_otp
const v = await fn('auth', { action: 'verify', role: 'leo', code: otp }).then((r) => r.json())
const token = v.session?.access_token
check('code sign-in returns a session', !!token, JSON.stringify(v).slice(0, 200))
if (!token) process.exit(1)
const me = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
check('the session carries the profile', me.app_metadata?.role === 'leo')

// Privacy rules.
check('the allowlist is not readable', (await rest('members?select=email', token).then((r) => r.json())).length === 0)
const id = `smoke-${Date.now()}`
const put = await rest('tasks', token, { method: 'POST', body: JSON.stringify({ id, user_id: me.sub, title: 'Smoke test', priority: 'low' }) })
check('can write own task', put.status === 201, `${put.status} ${await put.clone().text()}`)
const other = await rest('tasks', token, { method: 'POST', body: JSON.stringify({ id: `${id}-x`, user_id: '00000000-0000-0000-0000-000000000000', title: 'x', priority: 'low' }) })
check('cannot write someone else’s task', other.status >= 400)
await rest(`tasks?id=eq.${id}`, token, { method: 'DELETE' })
const anonRead = await rest('tasks?select=id', ANON).then((r) => r.json())
check('nothing is readable without signing in', Array.isArray(anonRead) && anonRead.length === 0)
const cfg = await rest('app_config?select=key', token).then((r) => r.json())
check('the push key is published to members', cfg.some((r) => r.key === 'vapid_public_key'))

// A due reminder gets picked up by the dispatcher (no phone is subscribed here, so nothing is shown).
await rest('scheduled_pushes', token, { method: 'POST', body: JSON.stringify({ user_id: me.sub, key: `smoke|${id}`, fire_at: new Date(Date.now() - 1000).toISOString(), title: 'Smoke test' }) })
await fn('push-dispatch', {}, ANON, { 'x-cron-secret': cronSecret })
const row = await rest(`scheduled_pushes?key=eq.smoke|${id}&select=sent_at`, token).then((r) => r.json())
check('due reminders are processed', !!row[0]?.sent_at, JSON.stringify(row))
await rest(`scheduled_pushes?key=eq.smoke|${id}`, token, { method: 'DELETE' })

// The AI, both ways.
if (process.env.ANTHROPIC_API_KEY) {
  const items = await fn('ori', { transcript: 'Dentist tomorrow at 3pm', now: '2026-10-12 Monday 21:00', today: '2026-10-12', routines: [] }, token).then((r) => r.json())
  check('Ori turns speech into items', Array.isArray(items.items) && items.items.length > 0, JSON.stringify(items).slice(0, 200))
  const draft = await fn('ori', { mode: 'routine', prompt: 'Every morning I pray, drink water, do 20 minutes of exercise and shower' }, token).then((r) => r.json())
  check('Ori drafts a routine', Array.isArray(draft.routine?.steps) && draft.routine.steps.length > 1, JSON.stringify(draft).slice(0, 200))
} else console.log('- Ori AI skipped (no ANTHROPIC_API_KEY)')

// Leave sign-in as it was: the code above created a session, which is harmless; drop it.
await fetch(`${URL_}/auth/v1/logout?scope=local`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${token}` } })

if (failed) {
  console.log(`\n${failed} check(s) failed`)
  process.exit(1)
}
console.log('\nAll checks passed')

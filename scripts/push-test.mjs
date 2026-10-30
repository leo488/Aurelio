// Sends one test push to a member's phones right away and reports what happened.
// Needs: SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN, and LEO_EMAIL or SONIYA_EMAIL (WHO picks which).
const REF = process.env.SUPABASE_PROJECT_REF
const who = process.env.WHO === 'soniya' ? 'SONIYA_EMAIL' : 'LEO_EMAIL'
const email = process.env[who]?.toLowerCase()
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`
const sql = async (query) => {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error(`query → ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return res.json()
}

const [user] = await sql(`select id from auth.users where lower(email) = ${lit(email)}`)
if (!user) throw new Error('No account for that member')
const [{ n }] = await sql(`select count(*)::int as n from public.push_subscriptions where user_id = ${lit(user.id)}`)
console.log(`phones with reminders on: ${n}`)
if (!n) {
  console.log('::warning::No phone has turned on reminders for this account yet. Tap "Turn on reminders" in the app, then run this again.')
  process.exit(1)
}
const key = `test|${Date.now()}`
await sql(`insert into public.scheduled_pushes (user_id, key, fire_at, title, body, url)
  values (${lit(user.id)}, ${lit(key)}, now(), 'Aurelio is connected', 'This came from the server, so reminders will reach you even with the app closed.', 'today')`)
const [{ value: secret }] = await sql(`select value from public.server_config where key = 'cron_secret'`)
const res = await fetch(`https://${REF}.supabase.co/functions/v1/push-dispatch`, { method: 'POST', headers: { 'x-cron-secret': secret, 'Content-Type': 'application/json' }, body: '{}' })
const out = await res.json()
console.log('dispatch:', JSON.stringify(out))
const [row] = await sql(`select sent_at from public.scheduled_pushes where user_id = ${lit(user.id)} and key = ${lit(key)}`)
console.log(row?.sent_at ? `sent at ${row.sent_at}` : 'not sent yet (the every-minute job will pick it up)')

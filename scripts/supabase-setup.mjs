// Sets up (or updates) the Supabase project from GitHub Actions. Safe to run on every deploy.
// Needs: SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN, LEO_EMAIL, SONIYA_EMAIL. ANTHROPIC_API_KEY is optional.
// Writes the project's public anon key to $GITHUB_OUTPUT for the app build. Never prints secrets.
import { randomBytes } from 'node:crypto'
import { appendFileSync, readFileSync } from 'node:fs'
import webpush from 'web-push'

const env = (k) => {
  const v = process.env[k]?.trim()
  if (!v) throw new Error(`Missing ${k}`)
  return v
}
const REF = env('SUPABASE_PROJECT_REF')
const TOKEN = env('SUPABASE_ACCESS_TOKEN')
const EMAILS = { leo: env('LEO_EMAIL').toLowerCase(), sonia: env('SONIYA_EMAIL').toLowerCase() }
const ANTHROPIC = process.env.ANTHROPIC_API_KEY
const URL_ = `https://${REF}.supabase.co`
const SITE = process.env.SITE_URL ?? 'https://leo488.github.io/Aurelio/'

const step = (s) => console.log(`\n▸ ${s}`)
const mask = (v) => process.env.GITHUB_ACTIONS && console.log(`::add-mask::${v}`)

async function api(method, path, body) {
  const res = await fetch(`https://api.supabase.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 400)}`)
  return text ? JSON.parse(text) : null
}
const sql = (query) => api('POST', `/projects/${REF}/database/query`, { query })
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`

step('Database tables and privacy rules')
await sql(readFileSync('supabase/schema.sql', 'utf8'))
await sql(readFileSync('supabase/push.sql', 'utf8'))
await sql(`insert into public.members (email, role) values (${lit(EMAILS.leo)}, 'leo'), (${lit(EMAILS.sonia)}, 'sonia')
  on conflict (role) do update set email = excluded.email;`)
console.log('  ok')

// Bump to empty everyone's data once (accounts and settings stay). Must match DATA_EPOCH in src/boot.ts.
const DATA_EPOCH = '2026-10-12'
const [done] = await sql(`select value from public.server_config where key = 'data_epoch'`)
if (done?.value !== DATA_EPOCH) {
  await sql(`truncate public.routine_completions, public.routines, public.tasks, public.notifications, public.activity,
    public.settings, public.daily_status, public.weekly_goals, public.scheduled_pushes, public.push_subscriptions, public.pin_attempts, public.profiles;
    insert into public.server_config (key, value) values ('data_epoch', ${lit(DATA_EPOCH)}) on conflict (key) do update set value = excluded.value;`)
  console.log(`  wiped all data (epoch ${DATA_EPOCH})`)
}

step('API keys')
const keys = await api('GET', `/projects/${REF}/api-keys?reveal=true`)
const pick = (name) => keys.find((k) => k.name === name)?.api_key
const anon = pick('anon') ?? keys.find((k) => k.type === 'publishable')?.api_key
const service = pick('service_role') ?? keys.find((k) => k.type === 'secret')?.api_key
if (!anon || !service) throw new Error('Could not read the project API keys')
mask(service)
if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, `SUPABASE_SERVICE_KEY=${service}\nSUPABASE_ANON_KEY=${anon}\n`)
console.log('  ok')

step('The two accounts')
const authApi = async (method, path, body) => {
  const res = await fetch(`${URL_}/auth/v1${path}`, {
    method,
    headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`auth ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : null
}
const { users } = await authApi('GET', '/admin/users?per_page=200')
for (const [role, email] of Object.entries(EMAILS)) {
  const u = users.find((x) => x.email?.toLowerCase() === email)
  if (u) await authApi('PUT', `/admin/users/${u.id}`, { app_metadata: { ...u.app_metadata, role }, email_confirm: true })
  else await authApi('POST', '/admin/users', { email, email_confirm: true, app_metadata: { role } })
  console.log(`  ${role}: ${u ? 'updated' : 'created'}`)
}

step('Sign-in settings')
const base = { disable_signup: true, site_url: SITE, uri_allow_list: `${SITE}**`, mailer_otp_exp: 900 }
const template = {
  mailer_subjects_magic_link: 'Your Aurelio sign-in code',
  mailer_templates_magic_link_content:
    '<h2>Your Aurelio code</h2><p style="font-size:28px;letter-spacing:6px;font-weight:bold">{{ .Token }}</p><p>Type it into the app. It works for 15 minutes.</p><p>Or <a href="{{ .ConfirmationURL }}">tap here to sign in</a> on this phone.</p>',
}
// Optional: a Gmail address and app password send the email from Gmail, which lets it carry the
// code and reach both people. Without it, Supabase's own sender sends its default sign-in link.
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const smtp = SMTP_USER && SMTP_PASS
  ? { smtp_host: 'smtp.gmail.com', smtp_port: '465', smtp_user: SMTP_USER, smtp_pass: SMTP_PASS, smtp_admin_email: SMTP_USER, smtp_sender_name: 'Aurelio' }
  : {}
if (SMTP_PASS) mask(SMTP_PASS)
let emailMode = 'code'
try {
  // The sender goes in first: the plan allows a custom template only once it has its own sender.
  if (SMTP_USER) await api('PATCH', `/projects/${REF}/config/auth`, { ...base, ...smtp })
  await api('PATCH', `/projects/${REF}/config/auth`, { ...base, ...template })
} catch (e) {
  if (!/template/i.test(String(e))) throw e
  await api('PATCH', `/projects/${REF}/config/auth`, base)
  emailMode = 'link'
}
await sql(`insert into public.server_config (key, value) values ('email_mode', ${lit(emailMode)}) on conflict (key) do update set value = excluded.value`)
console.log(`  ok (${SMTP_USER ? 'Gmail sender' : 'Supabase sender'}; email carries a ${emailMode})`)

step('Server secrets')
const have = new Set((await api('GET', `/projects/${REF}/secrets`)).map((s) => s.name))
const [cfg] = [await sql(`select key, value from public.app_config union all select key, value from public.server_config`)]
const value = (k) => cfg.find((r) => r.key === k)?.value
const secrets = [{ name: 'VAPID_SUBJECT', value: `mailto:${EMAILS.leo}` }]
if (ANTHROPIC) secrets.push({ name: 'ANTHROPIC_API_KEY', value: ANTHROPIC })
else console.log('  no ANTHROPIC_API_KEY; Ori stays on the on-device parser')
if (!have.has('PIN_PEPPER')) secrets.push({ name: 'PIN_PEPPER', value: randomBytes(32).toString('hex') })
if (!have.has('VAPID_PRIVATE_KEY') || !value('vapid_public_key')) {
  const v = webpush.generateVAPIDKeys()
  secrets.push({ name: 'VAPID_PUBLIC_KEY', value: v.publicKey }, { name: 'VAPID_PRIVATE_KEY', value: v.privateKey })
  await sql(`insert into public.app_config (key, value) values ('vapid_public_key', ${lit(v.publicKey)}) on conflict (key) do update set value = excluded.value`)
  console.log('  new push keys')
}
if (!have.has('CRON_SECRET') || !value('cron_secret')) {
  const c = randomBytes(24).toString('hex')
  secrets.push({ name: 'CRON_SECRET', value: c })
  await sql(`insert into public.server_config (key, value) values ('cron_secret', ${lit(c)}) on conflict (key) do update set value = excluded.value`)
}
for (const s of secrets) mask(s.value)
await api('POST', `/projects/${REF}/secrets`, secrets)
console.log(`  set ${secrets.map((s) => s.name).join(', ')}`)

step('Every-minute push check')
await sql(`create extension if not exists pg_cron;
  create extension if not exists pg_net with schema extensions;
  select cron.unschedule(jobid) from cron.job where jobname = 'aurelio-push';
  select cron.schedule('aurelio-push', '* * * * *', $cmd$
    select net.http_post(
      url := ${lit(`${URL_}/functions/v1/push-dispatch`)},
      headers := jsonb_build_object('Content-Type', 'application/json',
        'x-cron-secret', (select value from public.server_config where key = 'cron_secret')),
      body := '{}'::jsonb,
      timeout_milliseconds := 20000)
  $cmd$);`)
console.log('  ok')

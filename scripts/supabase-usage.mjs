// Reports how much space the Supabase database uses and what takes it up. Read-only, and prints
// only sizes and counts, never what's inside the rows.
// Needs: SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN.
const REF = process.env.SUPABASE_PROJECT_REF?.trim()
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN?.trim()
if (!REF || !TOKEN) throw new Error('Missing SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN')

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`query → ${res.status}: ${text.slice(0, 300)}`)
  return JSON.parse(text)
}

const FREE_MB = 500
const [{ bytes }] = await sql(`select pg_database_size(current_database())::bigint as bytes`)
const mb = Number(bytes) / 1024 / 1024
console.log(`\n▸ Database size: ${mb.toFixed(1)} MB of the free plan's ${FREE_MB} MB (${((mb / FREE_MB) * 100).toFixed(1)}%)`)

console.log('\n▸ Biggest tables (data, indexes and stored extras)')
const tables = await sql(`
  select n.nspname as schema, c.relname as name, pg_total_relation_size(c.oid)::bigint as bytes, c.reltuples::bigint as approx_rows
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where c.relkind in ('r', 'm', 'p') and n.nspname not in ('pg_catalog', 'information_schema')
  order by pg_total_relation_size(c.oid) desc limit 15`)
for (const t of tables) console.log(`  ${(Number(t.bytes) / 1024 / 1024).toFixed(2).padStart(8)} MB  ${t.schema}.${t.name}  (~${Math.max(0, Number(t.approx_rows))} rows)`)

console.log('\n▸ App tables, exact rows')
const counts = await sql(`
  select 'notes' as t, count(*) from public.notes union all
  select 'track_items', count(*) from public.track_items union all
  select 'track_checks', count(*) from public.track_checks union all
  select 'journal_entries', count(*) from public.journal_entries union all
  select 'tasks', count(*) from public.tasks union all
  select 'activity', count(*) from public.activity union all
  select 'notifications', count(*) from public.notifications`)
for (const c of counts) console.log(`  ${c.t}: ${c.count}`)

const photos = await sql(`select coalesce(sum(length(coalesce(image, '')) + length(images::text)), 0)::bigint as bytes from public.notes`)
console.log(`\n▸ Note photos: ${(Number(photos[0].bytes) / 1024 / 1024).toFixed(2)} MB`)

const cron = await sql(`select count(*) as runs, min(start_time) as since from cron.job_run_details`).catch(() => null)
if (cron) console.log(`\n▸ Push-check run log: ${cron[0].runs} runs kept since ${cron[0].since}`)

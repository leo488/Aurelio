// Prints the project's public (anon) key into GITHUB_ENV as VITE_SUPABASE_ANON_KEY for the build.
// Fetched at build time so a rotated key never breaks a deploy.
import { appendFileSync } from 'node:fs'

const REF = process.env.SUPABASE_PROJECT_REF
const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`, {
  headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` },
})
if (!res.ok) throw new Error(`api-keys → ${res.status}`)
const keys = await res.json()
const anon = keys.find((k) => k.name === 'anon')?.api_key ?? keys.find((k) => k.type === 'publishable')?.api_key
if (!anon) throw new Error('No public key found')
appendFileSync(process.env.GITHUB_ENV, `VITE_SUPABASE_ANON_KEY=${anon}\n`)
console.log('ok')

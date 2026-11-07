import { useAuth } from './data/session'
import { seed } from './data/seed'
import { useData } from './data/store'
import { useSupabase } from './config'
import { backendKind, getAuth, initServices } from './services'
import { LOCAL_SEEDED, replaceLocalData } from './services/local/localBackend'

/** Pick the backend, seed demo data in local mode, and restore a session if the app is unlocked. */
export async function boot() {
  if (useSupabase) wipeOnce()
  await initServices()
  if (backendKind() === 'local') {
    try {
      if (!localStorage.getItem(LOCAL_SEEDED)) {
        replaceLocalData(seed() as unknown as Parameters<typeof replaceLocalData>[0])
        localStorage.setItem(LOCAL_SEEDED, new Date().toISOString())
        // Data from the first version used a different shape and is replaced by the seed.
        localStorage.removeItem('aurelio-data')
        localStorage.removeItem('aurelio-session')
      }
    } catch {
      /* storage blocked: the app still runs, it just won't remember anything */
    }
  }
  const session = await getAuth().current().catch(() => null)
  useAuth.getState().setSession(session)
  if (session) void useData.getState().load(session.user)
}

/** Put the demo data back (local mode only). */
export function resetLocalDemo() {
  replaceLocalData(seed() as unknown as Parameters<typeof replaceLocalData>[0])
  localStorage.setItem(LOCAL_SEEDED, new Date().toISOString())
}

// Bump to clear what an earlier version left on this device (demo data, PINs, a stale session) the
// next time the app opens. Must match DATA_EPOCH in scripts/supabase-setup.mjs, which empties the database.
const DATA_EPOCH = '2026-10-12'
const EPOCH_KEY = 'aurelio:epoch'

function wipeOnce() {
  try {
    if (localStorage.getItem(EPOCH_KEY) === DATA_EPOCH) return
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i) ?? '')
    // Keep the dismissed install and reminder hints; they're about the phone, not the data.
    for (const k of keys) if (k.startsWith('aurelio') && !k.endsWith('-dismissed')) localStorage.removeItem(k)
    sessionStorage.clear()
    localStorage.setItem(EPOCH_KEY, DATA_EPOCH)
  } catch {
    /* storage blocked */
  }
}

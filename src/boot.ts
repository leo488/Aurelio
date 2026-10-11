import { useAuth } from './data/session'
import { seed } from './data/seed'
import { useData } from './data/store'
import { backendKind, getAuth, initServices } from './services'
import { LOCAL_SEEDED, replaceLocalData } from './services/local/localBackend'

/** Pick the backend, seed demo data in local mode, and restore a session if the app is unlocked. */
export async function boot() {
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

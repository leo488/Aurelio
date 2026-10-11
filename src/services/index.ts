import { useSupabase } from '../config'
import type { Activity, AppNotification, DailyStatus, Routine, RoutineCompletion, Settings, Task, User } from '../data/types'
import type { AuthService, Backend } from './backend'
import { localAuth } from './local/localAuth'
import { localBackend } from './local/localBackend'

// The service layer. The store calls these; they decide nothing about the UI and know nothing
// about which storage sits underneath. Pick the backend once, at start-up.

let backend: Backend = localBackend
let auth: AuthService = localAuth

/** Connect the database backend when it's configured. Called once before the app renders. */
export async function initServices() {
  if (!useSupabase) return
  const { createSupabaseServices } = await import('./supabase/supabaseBackend')
  const s = createSupabaseServices()
  backend = s.backend
  auth = s.auth
}

export const getAuth = () => auth
export const backendKind = () => backend.kind

/** For tests and the local demo seed. */
export const setBackendForTests = (b: Backend, a: AuthService = localAuth) => {
  backend = b
  auth = a
}

export const profileService = {
  getProfiles: () => backend.profiles.list({}),
  saveProfile: (u: User) => backend.profiles.put(u),
}

export const routineService = {
  getRoutines: (userId: string) => backend.routines.list({ userId }),
  createRoutine: (r: Routine) => backend.routines.put(r),
  updateRoutine: (r: Routine) => backend.routines.put(r),
  async deleteRoutine(id: string, completions: RoutineCompletion[]) {
    await backend.routines.remove(id)
    await Promise.all(completions.filter((c) => c.routineId === id).map((c) => backend.completions.remove(c.id)))
  },
  getCompletions: (userId: string) => backend.completions.list({ userId }),
  /** Ticking a step, skipping a day or finishing the routine all land here as one record per day. */
  saveCompletion: (c: RoutineCompletion) => backend.completions.put(c),
}

export const taskService = {
  getTasks: (userId: string) => backend.tasks.list({ userId }),
  createTask: (t: Task) => backend.tasks.put(t),
  updateTask: (t: Task) => backend.tasks.put(t),
  deleteTask: (id: string) => backend.tasks.remove(id),
}

export const notificationService = {
  getNotifications: (userId: string) => backend.notifications.list({ userId }),
  saveNotification: (n: AppNotification) => backend.notifications.put(n),
}

export const settingsService = {
  async getSettings(userId: string) {
    return (await backend.settings.list({ userId }))[0] ?? null
  },
  saveSettings: (s: Settings) => backend.settings.put(s),
}

/** The lightweight shared layer: what the other person may see, and nudges between the two. */
export const sharedService = {
  getActivity: (userIds: string[]) => Promise.all(userIds.map((userId) => backend.activity.list({ userId }))).then((x) => x.flat()),
  addActivity: (a: Activity) => backend.activity.put(a),
  getStatus: (userId: string, date: string) => backend.statuses.list({ userId, date }).then((x) => x[0] ?? null),
  publishStatus: (s: DailyStatus) => backend.statuses.put(s),
  /** A reminder or note for the other person; it waits in their notifications until its time. */
  sendNudge: (n: AppNotification) => backend.notifications.put(n),
}

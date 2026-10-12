import { create } from 'zustand'
import { flash } from '../components/Toast'
import { haptic } from '../lib/haptics'
import { addDays, logicalToday, minutesOf, hhmm } from '../lib/date'
import {
  backfilledRecently, completionId, completionOf, isComplete, MAX_SKIPS_PER_WEEK, requiredSteps, routineStreak, skipsThisWeek,
  stepsOn, type Completions,
} from '../lib/streak'
import { goalService, notificationService, profileService, routineService, settingsService, sharedService, taskService } from '../services'
import { defaultSettings } from './seed'
import type { Activity, AppNotification, DailyStatus, Routine, RoutineCompletion, RoutineStep, Settings, Task, User, WeeklyGoal } from './types'

// Application state. Screens read from here and call these actions; each action updates the
// state straight away and hands the change to the service layer to persist. Nothing in here
// knows which backend is underneath.

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

const nowIso = () => new Date().toISOString()

/** Persist in the background; a failure is reported, the optimistic state stays. */
function save(p: Promise<unknown>) {
  p.catch((e) => {
    console.error(e)
    flash('Couldn’t save that. Check your connection.')
  })
}

export type RoutineInput = Omit<Routine, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'active' | 'inactiveRanges' | 'scheduleHistory'>
export type TaskInput = Omit<Task, 'id' | 'userId' | 'completed' | 'completedAt' | 'createdAt' | 'updatedAt'>

export interface DataState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  me: User | null
  partner: User | null
  routines: Routine[]
  completions: Completions
  tasks: Task[]
  goals: WeeklyGoal[]
  notifications: AppNotification[]
  activity: Activity[]
  settings: Settings | null
  partnerStatus: DailyStatus | null
  /** Keys of reminders already shown on this device, so the scheduler never repeats one. */
  sent: Record<string, number>
}

interface Actions {
  load: (me: User) => Promise<void>
  /** Pick up what the other person changed: nudges, cheers, their status. */
  refreshShared: () => Promise<void>
  clear: () => void

  createRoutine: (r: RoutineInput) => Routine
  updateRoutine: (id: string, patch: Partial<RoutineInput> & { active?: boolean }) => void
  deleteRoutine: (id: string) => void
  upsertStep: (routineId: string, step: RoutineStep) => void
  deleteStep: (routineId: string, stepId: string) => void
  moveStep: (fromId: string, toId: string, stepId: string) => void
  reorderSteps: (routineId: string, from: number, to: number) => void
  toggleStep: (routineId: string, stepId: string, date?: string) => { completedRoutine: boolean; streak: number }
  markRunStart: (routineId: string) => void
  skipStepToday: (routineId: string, stepId: string) => void
  skipDay: (routineId: string) => boolean
  backfill: (routineId: string) => number | null

  addTask: (t: TaskInput) => Task
  updateTask: (id: string, patch: Partial<TaskInput>) => void
  toggleTask: (id: string) => void
  removeTask: (id: string) => void

  addGoal: (week: string, title: string) => void
  toggleGoal: (id: string) => void
  renameGoal: (id: string, title: string) => void
  removeGoal: (id: string) => void

  updateSettings: (patch: Partial<Pick<Settings, 'notif' | 'oriConfirm'>>) => void
  /** Log a notification for me. A fixed id makes it idempotent (the same reminder from two devices is one record). */
  notify: (n: Omit<AppNotification, 'id' | 'userId' | 'status' | 'createdAt' | 'scheduledFor'> & { id?: string; scheduledFor?: string; status?: AppNotification['status'] }) => void
  setNotificationStatus: (id: string, status: AppNotification['status']) => void
  markAllRead: () => void
  markSent: (key: string) => void

  addActivity: (a: Omit<Activity, 'userId' | 'createdAt' | 'id'> & { id?: string }) => void
  cheer: () => boolean
  sendNudge: (title: string, at?: string) => boolean
  publishStatus: (s: Omit<DailyStatus, 'id' | 'userId' | 'updatedAt'>) => void
}

const SENT_KEY = 'aurelio:sent'
const loadSent = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) ?? '{}')
  } catch {
    return {}
  }
}

const empty = (): Omit<DataState, 'sent'> => ({
  status: 'idle', me: null, partner: null, routines: [], completions: {}, tasks: [], goals: [], notifications: [], activity: [], settings: null, partnerStatus: null,
})

const byNewest = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt)

export const useData = create<DataState & Actions>()((set, get) => {
  const me = () => {
    const u = get().me
    if (!u) throw new Error('Not signed in')
    return u
  }

  const putRoutine = (r: Routine) => {
    set((s) => ({ routines: s.routines.some((x) => x.id === r.id) ? s.routines.map((x) => (x.id === r.id ? r : x)) : [...s.routines, r] }))
    save(routineService.updateRoutine(r))
  }
  const patchRoutine = (id: string, fn: (r: Routine) => Routine) => {
    const r = get().routines.find((x) => x.id === id)
    if (r) putRoutine({ ...fn(r), updatedAt: nowIso() })
  }

  /** Read-modify-write one day's record. Today's record re-snapshots the counted steps; past ones keep theirs. */
  const writeCompletion = (routineId: string, date: string, fn: (c: RoutineCompletion) => RoutineCompletion) => {
    const r = get().routines.find((x) => x.id === routineId)
    if (!r) return
    const cur = completionOf(get().completions, routineId, date) ?? { id: completionId(routineId, date), routineId, userId: r.userId, date, completedStepIds: [], updatedAt: nowIso() }
    const snapshot = date === logicalToday() || !cur.requiredStepIds ? stepsOn(r, date).filter((s) => s.countsTowardStreak).map((s) => s.id) : cur.requiredStepIds
    let next: RoutineCompletion = { ...fn({ ...cur, requiredStepIds: snapshot }), updatedAt: nowIso() }
    const full = isComplete(r, date, next)
    next = { ...next, completedAt: full ? (next.completedAt ?? nowIso()) : undefined }
    set((s) => ({ completions: { ...s.completions, [next.id]: next } }))
    save(routineService.saveCompletion(next))
  }

  const putTask = (t: Task) => {
    set((s) => ({ tasks: s.tasks.some((x) => x.id === t.id) ? s.tasks.map((x) => (x.id === t.id ? t : x)) : [...s.tasks, t] }))
    save(taskService.updateTask(t))
  }

  const putNotification = (n: AppNotification) => {
    if (n.userId === get().me?.id) {
      set((s) => ({ notifications: [n, ...s.notifications.filter((x) => x.id !== n.id)].sort((a, b) => b.scheduledFor.localeCompare(a.scheduledFor)) }))
    }
    save(notificationService.saveNotification(n))
  }

  return {
    ...empty(),
    sent: loadSent(),

    load: async (user) => {
      set({ ...empty(), status: 'loading', me: user })
      try {
        const [profiles, routines, completions, tasks, notifications, settings, goals] = await Promise.all([
          profileService.getProfiles(), routineService.getRoutines(user.id), routineService.getCompletions(user.id),
          taskService.getTasks(user.id), notificationService.getNotifications(user.id), settingsService.getSettings(user.id),
          // A database without the goals table yet still loads everything else.
          goalService.getGoals(user.id).catch(() => [] as WeeklyGoal[]),
        ])
        if (!profiles.some((p) => p.id === user.id)) save(profileService.saveProfile(user))
        const partner = profiles.find((p) => p.role !== user.role) ?? null
        const ids = [user.id, ...(partner ? [partner.id] : [])]
        const [activity, partnerStatus] = await Promise.all([
          sharedService.getActivity(ids), partner ? sharedService.getStatus(partner.id, logicalToday()) : Promise.resolve(null),
        ])
        if (get().me?.id !== user.id) return
        set({
          status: 'ready', partner, routines, tasks, partnerStatus,
          goals: goals.sort((a, b) => a.position - b.position),
          completions: Object.fromEntries(completions.map((c) => [c.id, c])),
          notifications: notifications.sort((a, b) => b.scheduledFor.localeCompare(a.scheduledFor)),
          activity: activity.sort(byNewest).slice(0, 40),
          settings: settings ?? defaultSettings(user.id),
        })
      } catch (e) {
        console.error(e)
        set({ status: 'error' })
      }
    },

    refreshShared: async () => {
      const { me: u, partner } = get()
      if (!u) return
      try {
        const [notifications, activity, partnerStatus, profiles] = await Promise.all([
          notificationService.getNotifications(u.id),
          sharedService.getActivity([u.id, ...(partner ? [partner.id] : [])]),
          partner ? sharedService.getStatus(partner.id, logicalToday()) : Promise.resolve(null),
          partner ? Promise.resolve(null) : profileService.getProfiles(),
        ])
        if (get().me?.id !== u.id) return
        set({
          notifications: notifications.sort((a, b) => b.scheduledFor.localeCompare(a.scheduledFor)),
          activity: activity.sort(byNewest).slice(0, 40),
          partnerStatus,
          ...(profiles ? { partner: profiles.find((p) => p.role !== u.role) ?? null } : {}),
        })
      } catch {
        /* offline: keep what we have */
      }
    },

    clear: () => set({ ...empty() }),

    // ─── Routines ──────────────────────────────────────────────────────────

    createRoutine: (input) => {
      const t = nowIso()
      const r: Routine = { ...input, id: uid(), userId: me().id, active: true, createdAt: logicalToday(), updatedAt: t }
      set((s) => ({ routines: [...s.routines, r] }))
      save(routineService.createRoutine(r))
      return r
    },

    updateRoutine: (id, patch) =>
      patchRoutine(id, (r) => {
        const today = logicalToday()
        const next: Routine = { ...r, ...patch }
        // A new schedule applies from today; earlier days keep the one they had.
        if (patch.repeatPattern && patch.repeatPattern.days.join() !== r.repeatPattern.days.join() && r.createdAt < today) {
          const history = r.scheduleHistory ?? []
          if (!history.some((h) => h.until === today)) next.scheduleHistory = [...history, { until: today, days: r.repeatPattern.days }]
        }
        if (patch.active !== undefined && patch.active !== r.active) {
          const ranges = r.inactiveRanges ?? []
          next.inactiveRanges = patch.active
            ? ranges.map((x) => (x.to ? x : { ...x, to: today })).filter((x) => x.from !== x.to)
            : [...ranges, { from: today }]
        }
        return next
      }),

    deleteRoutine: (id) => {
      const recs = Object.values(get().completions).filter((c) => c.routineId === id)
      set((s) => ({
        routines: s.routines.filter((r) => r.id !== id),
        completions: Object.fromEntries(Object.entries(s.completions).filter(([, c]) => c.routineId !== id)),
      }))
      save(routineService.deleteRoutine(id, recs))
    },

    upsertStep: (routineId, step) =>
      patchRoutine(routineId, (r) => ({
        ...r, steps: r.steps.some((s) => s.id === step.id) ? r.steps.map((s) => (s.id === step.id ? step : s)) : [...r.steps, step],
      })),
    deleteStep: (routineId, stepId) => patchRoutine(routineId, (r) => ({ ...r, steps: r.steps.filter((s) => s.id !== stepId) })),
    moveStep: (fromId, toId, stepId) => {
      const step = get().routines.find((r) => r.id === fromId)?.steps.find((s) => s.id === stepId)
      if (!step) return
      patchRoutine(fromId, (r) => ({ ...r, steps: r.steps.filter((s) => s.id !== stepId) }))
      patchRoutine(toId, (r) => ({ ...r, steps: [...r.steps, { ...step, days: r.repeatPattern.days }] }))
    },
    reorderSteps: (routineId, from, to) =>
      patchRoutine(routineId, (r) => {
        const steps = [...r.steps]
        const [moved] = steps.splice(from, 1)
        steps.splice(to, 0, moved)
        return { ...r, steps }
      }),

    toggleStep: (routineId, stepId, date = logicalToday()) => {
      const r = get().routines.find((x) => x.id === routineId)!
      const wasFull = isComplete(r, date, completionOf(get().completions, routineId, date))
      writeCompletion(routineId, date, (c) => ({
        ...c, completedStepIds: c.completedStepIds.includes(stepId) ? c.completedStepIds.filter((i) => i !== stepId) : [...c.completedStepIds, stepId],
      }))
      const after = completionOf(get().completions, routineId, date)
      const completedRoutine = !wasFull && isComplete(r, date, after)
      haptic(completedRoutine ? 20 : 8)
      const streak = routineStreak(r, get().completions, logicalToday()).current
      if (completedRoutine && date === logicalToday()) {
        get().addActivity({ id: `${me().id}|routine-done|${routineId}|${date}`, kind: 'routine-done', text: `finished ${r.name}` })
      }
      return { completedRoutine, streak }
    },

    markRunStart: (routineId) => writeCompletion(routineId, logicalToday(), (c) => ({ ...c, startedAt: c.startedAt ?? nowIso() })),

    skipStepToday: (routineId, stepId) =>
      writeCompletion(routineId, logicalToday(), (c) => ({ ...c, skippedStepIds: Array.from(new Set([...(c.skippedStepIds ?? []), stepId])) })),

    skipDay: (routineId) => {
      const r = get().routines.find((x) => x.id === routineId)
      if (!r || skipsThisWeek(r, get().completions, logicalToday()) >= MAX_SKIPS_PER_WEEK) return false
      writeCompletion(routineId, logicalToday(), (c) => ({ ...c, skipped: true }))
      return true
    },

    backfill: (routineId) => {
      const s = get()
      const r = s.routines.find((x) => x.id === routineId)
      const today = logicalToday()
      const b = r && routineStreak(r, s.completions, today).lastBreak
      if (!r || !b || b.date < addDays(today, -2) || backfilledRecently(s.completions, r.userId, today)) return null
      writeCompletion(routineId, b.date, (c) => ({ ...c, completedStepIds: Array.from(new Set([...c.completedStepIds, ...requiredSteps(r, b.date, c)])), backfilled: true }))
      return routineStreak(r, get().completions, today).current
    },

    // ─── Tasks ─────────────────────────────────────────────────────────────

    addTask: (input) => {
      const t = nowIso()
      const task: Task = { ...input, id: uid(), userId: me().id, completed: false, createdAt: t, updatedAt: t }
      set((s) => ({ tasks: [...s.tasks, task] }))
      save(taskService.createTask(task))
      return task
    },
    updateTask: (id, patch) => {
      const t = get().tasks.find((x) => x.id === id)
      if (t) putTask({ ...t, ...patch, updatedAt: nowIso() })
    },
    toggleTask: (id) => {
      const t = get().tasks.find((x) => x.id === id)
      if (!t) return
      const completed = !t.completed
      haptic()
      putTask({ ...t, completed, completedAt: completed ? nowIso() : undefined, updatedAt: nowIso() })
      const today = logicalToday()
      if (completed && t.date === today) {
        const todays = get().tasks.filter((x) => x.date === today)
        if (todays.every((x) => x.completed)) get().addActivity({ id: `${me().id}|day-done|${today}`, kind: 'day-done', text: 'finished everything on today’s plan' })
      }
    },
    removeTask: (id) => {
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
      save(taskService.deleteTask(id))
    },

    // ─── Weekly goals ──────────────────────────────────────────────────────

    addGoal: (week, title) => {
      const t = nowIso()
      const position = Math.max(0, ...get().goals.filter((g) => g.week === week).map((g) => g.position + 1))
      const goal: WeeklyGoal = { id: uid(), userId: me().id, week, title: title.trim(), done: false, position, createdAt: t, updatedAt: t }
      set((s) => ({ goals: [...s.goals, goal] }))
      save(goalService.saveGoal(goal))
    },
    toggleGoal: (id) => {
      const g = get().goals.find((x) => x.id === id)
      if (!g) return
      haptic()
      const done = !g.done
      const next: WeeklyGoal = { ...g, done, doneAt: done ? nowIso() : undefined, updatedAt: nowIso() }
      set((s) => ({ goals: s.goals.map((x) => (x.id === id ? next : x)) }))
      save(goalService.saveGoal(next))
      if (done) {
        const week = get().goals.filter((x) => x.week === g.week)
        if (week.length > 1 && week.every((x) => x.done)) get().addActivity({ id: `${me().id}|week-goals|${g.week}`, kind: 'week-goals', text: 'hit every goal this week' })
      }
    },
    renameGoal: (id, title) => {
      const g = get().goals.find((x) => x.id === id)
      if (!g || !title.trim()) return
      const next = { ...g, title: title.trim(), updatedAt: nowIso() }
      set((s) => ({ goals: s.goals.map((x) => (x.id === id ? next : x)) }))
      save(goalService.saveGoal(next))
    },
    removeGoal: (id) => {
      set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }))
      save(goalService.deleteGoal(id))
    },

    // ─── Settings and notifications ───────────────────────────────────────

    updateSettings: (patch) => {
      const cur = get().settings ?? defaultSettings(me().id)
      const next = { ...cur, ...patch, updatedAt: nowIso() }
      set({ settings: next })
      save(settingsService.saveSettings(next))
    },

    notify: (n) => {
      const t = nowIso()
      putNotification({ ...n, id: n.id ?? uid(), userId: me().id, status: n.status ?? 'sent', scheduledFor: n.scheduledFor ?? t, createdAt: t })
    },
    setNotificationStatus: (id, status) => {
      const n = get().notifications.find((x) => x.id === id)
      if (n && n.status !== status) putNotification({ ...n, status })
    },
    markAllRead: () => {
      const now = nowIso()
      for (const n of get().notifications) if (n.status === 'sent' && n.scheduledFor <= now) get().setNotificationStatus(n.id, 'read')
    },
    markSent: (key) => {
      const sent = { ...get().sent, [key]: Date.now() }
      // Keep the map small: a week is plenty to avoid repeats.
      for (const [k, v] of Object.entries(sent)) if (Date.now() - v > 8 * 86400000) delete sent[k]
      set({ sent })
      try {
        localStorage.setItem(SENT_KEY, JSON.stringify(sent))
      } catch {
        /* ignore */
      }
    },

    // ─── Shared ───────────────────────────────────────────────────────────

    addActivity: (a) => {
      const act: Activity = { ...a, id: a.id ?? uid(), userId: me().id, createdAt: nowIso() }
      set((s) => ({ activity: [act, ...s.activity.filter((x) => x.id !== act.id)].slice(0, 40) }))
      save(sharedService.addActivity(act))
    },

    cheer: () => {
      const { partner } = get()
      if (!partner) return false
      const u = me()
      get().addActivity({ kind: 'cheer', text: `cheered ${partner.name}` })
      save(sharedService.sendNudge({
        id: uid(), userId: partner.id, kind: 'partner', title: `${u.name} sent you some encouragement`, scheduledFor: nowIso(), status: 'scheduled', fromUserId: u.id, createdAt: nowIso(),
      }))
      return true
    },

    sendNudge: (title, at) => {
      const { partner } = get()
      if (!partner || !title.trim()) return false
      const u = me()
      const when = at ? new Date(at).toISOString() : nowIso()
      save(sharedService.sendNudge({
        id: uid(), userId: partner.id, kind: 'nudge', title: title.trim(), body: `From ${u.name}`, refType: 'nudge', scheduledFor: when, status: 'scheduled', fromUserId: u.id, createdAt: nowIso(),
      }))
      get().addActivity({ kind: 'nudge', text: `sent ${partner.name} a reminder` })
      return true
    },

    publishStatus: (s) => {
      const u = get().me
      if (!u) return
      const status: DailyStatus = { ...s, id: `${u.id}|${s.date}`, userId: u.id, updatedAt: nowIso() }
      save(sharedService.publishStatus(status))
    },
  }
})

/** Shift a routine's start time, e.g. after a miss. */
export const laterStart = (time: string, minutes = 30) => hhmm(minutesOf(time) + minutes)


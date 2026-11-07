import { create } from 'zustand'
import { flash } from '../components/Toast'
import { haptic } from '../lib/haptics'
import { addDays, logicalToday, minutesOf, hhmm } from '../lib/date'
import {
  backfilledRecently, completionId, completionOf, isComplete, MAX_SKIPS_PER_WEEK, requiredSteps, routineStreak, skipsThisWeek,
  stepsOn, type Completions,
} from '../lib/streak'
import { goalService, journalService, noteService, notificationService, profileService, routineService, settingsService, sharedService, taskService, trackService } from '../services'
import { checkId, STARTER, weekList } from '../lib/track'
import { mondayOf as mondayFor, weekKey } from '../lib/date'
import { defaultSettings } from './seed'
import type { Activity, AppNotification, DailyStatus, Routine, RoutineCompletion, RoutineStep, Settings, Task, User, WeeklyGoal, TrackItem, TrackCheck, TrackSlot, Note, JournalEntry } from './types'

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
  /** Leo's weekly tracker list, its ticks by id, his notes and journal. Empty for Soniya. */
  trackItems: TrackItem[]
  trackChecks: Record<string, TrackCheck>
  notes: Note[]
  journal: JournalEntry[]
  notifications: AppNotification[]
  activity: Activity[]
  settings: Settings | null
  partnerStatus: DailyStatus | null
  /** Keys of reminders already shown on this device, so the scheduler never repeats one. */
  sent: Record<string, number>
}

interface Actions {
  load: (me: User) => Promise<void>

  /** With `parentId`, a sub to-do under that item. */
  addTrackItem: (title: string, slot: TrackSlot, week: string, onlyThisWeek?: boolean, parentId?: string) => void
  renameTrackItem: (id: string, title: string) => void
  /** Drag and drop: to `index` among the items of `slot`, or among the sub to-dos of `parentId`. */
  moveTrackItem: (id: string, to: { slot: TrackSlot; parentId?: string; index: number }, week: string) => void
  /** Off the list from `week` on; earlier weeks keep it. */
  removeTrackItem: (id: string, week: string) => void
  toggleCheck: (itemId: string, date: string) => void
  saveNote: (note: Note) => void
  deleteNote: (id: string) => void
  saveJournal: (date: string, prompt: string, body: string) => void
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
  updateGoal: (id: string, patch: Partial<Pick<WeeklyGoal, 'steps' | 'routineId'>>) => void
  addGoalStep: (id: string, title: string) => void
  toggleGoalStep: (id: string, stepId: string) => void
  removeGoalStep: (id: string, stepId: string) => void
  removeGoal: (id: string) => void
  renameGoalStep: (id: string, stepId: string, title: string) => void
  setPriority: (id: string, on: boolean) => void
  reorderGoals: (week: string, ids: string[]) => void
  nestGoal: (id: string, targetId: string, index?: number) => void
  moveGoalStep: (fromId: string, stepId: string, toId: string, index: number) => void
  stepToGoal: (id: string, stepId: string, index: number) => void

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
  status: 'idle', me: null, partner: null, routines: [], completions: {}, tasks: [], goals: [], trackItems: [], trackChecks: {}, notes: [], journal: [], notifications: [], activity: [], settings: null, partnerStatus: null,
})

/** A goal with new steps: it is done exactly when it has steps and all of them are. */
const withSteps = (g: WeeklyGoal, steps: WeeklyGoal['steps'] & object): WeeklyGoal => {
  const done = steps.length ? steps.every((st) => st.done) : g.done
  return { ...g, steps, done, doneAt: done ? g.doneAt ?? nowIso() : undefined, updatedAt: nowIso() }
}

const byNewest = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt)

export const useData = create<DataState & Actions>()((set, get) => {
  const me = () => {
    const u = get().me
    if (!u) throw new Error('Not signed in')
    return u
  }

  /** Write a few goals at once: new ones are added, known ones replaced. */
  const putGoals = (changed: WeeklyGoal[]) => {
    if (!changed.length) return
    const ids = new Set(changed.map((g) => g.id))
    set((s) => ({ goals: [...s.goals.filter((g) => !ids.has(g.id)), ...changed] }))
    changed.forEach((g) => save(goalService.saveGoal(g)))
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
        // Leo's tracker, notes and journal. A table that isn't there yet leaves them empty; only a
        // list that really came back empty gets the starter items.
        const leo = user.role === 'leo'
        const [trackItems, trackChecks, notes, journal] = leo
          ? await Promise.all([
              trackService.getItems(user.id).catch(() => null), trackService.getChecks(user.id).catch(() => [] as TrackCheck[]),
              noteService.getNotes(user.id).catch(() => [] as Note[]), journalService.getEntries(user.id).catch(() => [] as JournalEntry[]),
            ])
          : [[], [], [], []]
        let items = trackItems ?? []
        if (leo && trackItems?.length === 0) {
          const t = nowIso()
          const week = weekKey(logicalToday())
          items = STARTER.map(([slug, slot, title], i) => ({ id: `track-${slug}-${user.id.slice(0, 8)}`, userId: user.id, title, slot, position: i, startWeek: week, createdAt: t, updatedAt: t }))
          items.forEach((i) => save(trackService.saveItem(i)))
        }
        if (get().me?.id !== user.id) return
        set({
          trackItems: items, trackChecks: Object.fromEntries(trackChecks.map((c) => [c.id, c])),
          notes: notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), journal: journal.sort((a, b) => b.date.localeCompare(a.date)),
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

    // ─── Leo's weekly tracker, notes and journal ───────────────────────────

    addTrackItem: (title, slot, week, onlyThisWeek, parentId) => {
      if (!title.trim()) return
      const t = nowIso()
      const parent = parentId ? get().trackItems.find((i) => i.id === parentId) : undefined
      const at = parent?.slot ?? slot
      const position = Math.max(0, ...get().trackItems.filter((i) => i.slot === at && i.parentId === parent?.id).map((i) => i.position + 1))
      const item: TrackItem = {
        id: uid(), userId: me().id, title: title.trim(), slot: at, position, startWeek: week,
        endWeek: onlyThisWeek ? week : parent?.endWeek, parentId: parent?.id, createdAt: t, updatedAt: t,
      }
      set((s) => ({ trackItems: [...s.trackItems, item] }))
      save(trackService.saveItem(item))
    },
    renameTrackItem: (id, title) => {
      const i = get().trackItems.find((x) => x.id === id)
      if (!i || !title.trim()) return
      const next = { ...i, title: title.trim(), updatedAt: nowIso() }
      set((s) => ({ trackItems: s.trackItems.map((x) => (x.id === id ? next : x)) }))
      save(trackService.saveItem(next))
    },
    moveTrackItem: (id, to, week) => {
      const items = get().trackItems
      const item = items.find((x) => x.id === id)
      if (!item || to.parentId === id) return
      const { top, subs } = weekList(items, week)
      const parentId = to.parentId && top.some((i) => i.id === to.parentId) ? to.parentId : undefined
      const slot = parentId ? items.find((i) => i.id === parentId)!.slot : to.slot
      const siblings = (parentId ? subs.get(parentId) ?? [] : top.filter((i) => i.slot === slot)).filter((i) => i.id !== id)
      siblings.splice(Math.max(0, Math.min(to.index, siblings.length)), 0, item)
      const t = nowIso()
      const changed = new Map<string, TrackItem>()
      siblings.forEach((x, position) => {
        const next = x.id === id ? { ...x, slot, parentId, position } : { ...x, position }
        if (next.position !== x.position || next.slot !== x.slot || next.parentId !== x.parentId) changed.set(x.id, { ...next, updatedAt: t })
      })
      // One level deep: an item dropped under another brings its own sub to-dos along; they follow its slot.
      const own = subs.get(id) ?? []
      own.forEach((x, i) => {
        if (parentId) changed.set(x.id, { ...x, slot, parentId, position: siblings.length + i, updatedAt: t })
        else if (x.slot !== slot) changed.set(x.id, { ...x, slot, updatedAt: t })
      })
      if (!changed.size) return
      set((s) => ({ trackItems: s.trackItems.map((x) => changed.get(x.id) ?? x) }))
      changed.forEach((x) => save(trackService.saveItem(x)))
    },
    removeTrackItem: (id, week) => {
      const i = get().trackItems.find((x) => x.id === id)
      if (!i) return
      const ids = [id, ...get().trackItems.filter((x) => x.parentId === id).map((x) => x.id)]
      // Added this week: delete it and its ticks. Older: end it the week before, so past weeks keep it.
      if (i.startWeek >= week) {
        const gone = Object.values(get().trackChecks).filter((c) => ids.includes(c.itemId)).map((c) => c.id)
        set((s) => ({ trackItems: s.trackItems.filter((x) => !ids.includes(x.id)), trackChecks: Object.fromEntries(Object.entries(s.trackChecks).filter(([k]) => !gone.includes(k))) }))
        gone.forEach((c) => save(trackService.deleteCheck(c)))
        // Sub to-dos first, so the item's delete never waits on them.
        ids.slice(1).forEach((x) => save(trackService.deleteItem(x)))
        save(trackService.deleteItem(id))
        return
      }
      const endWeek = weekKey(addDays(mondayFor(week), -7))
      const t = nowIso()
      const ended = get().trackItems.filter((x) => ids.includes(x.id) && !(x.endWeek && x.endWeek < endWeek)).map((x) => ({ ...x, endWeek: x.startWeek > endWeek ? x.startWeek : endWeek, updatedAt: t }))
      // A sub to-do added this week has no past to keep.
      const fresh = ended.filter((x) => x.id !== id && x.startWeek >= week)
      const kept = ended.filter((x) => !fresh.includes(x))
      set((s) => ({ trackItems: s.trackItems.filter((x) => !fresh.some((f) => f.id === x.id)).map((x) => kept.find((k) => k.id === x.id) ?? x) }))
      fresh.forEach((x) => save(trackService.deleteItem(x.id)))
      kept.forEach((x) => save(trackService.saveItem(x)))
    },
    toggleCheck: (itemId, date) => {
      haptic()
      const { top, subs } = weekList(get().trackItems, weekKey(date))
      const has = (i: string) => !!get().trackChecks[checkId(i, date)]
      const want = new Map<string, boolean>([[itemId, !has(itemId)]])
      const parent = top.find((i) => subs.get(i.id)?.some((x) => x.id === itemId))
      // Ticking an item ticks its sub to-dos; ticking the last sub to-do ticks the item.
      subs.get(itemId)?.forEach((x) => want.set(x.id, want.get(itemId)!))
      if (parent) want.set(parent.id, subs.get(parent.id)!.every((x) => (x.id === itemId ? want.get(itemId) : has(x.id))))
      const add: TrackCheck[] = []
      const drop: string[] = []
      want.forEach((on, i) => {
        if (on === has(i)) return
        if (on) add.push({ id: checkId(i, date), userId: me().id, itemId: i, date, createdAt: nowIso() })
        else drop.push(checkId(i, date))
      })
      set((s) => {
        const next = { ...s.trackChecks }
        drop.forEach((k) => delete next[k])
        add.forEach((c) => (next[c.id] = c))
        return { trackChecks: next }
      })
      drop.forEach((k) => save(trackService.deleteCheck(k)))
      add.forEach((c) => save(trackService.saveCheck(c)))
    },
    saveNote: (note) => {
      const next = { ...note, updatedAt: nowIso() }
      set((s) => ({ notes: [next, ...s.notes.filter((n) => n.id !== note.id)] }))
      save(noteService.saveNote(next))
    },
    deleteNote: (id) => {
      set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }))
      save(noteService.deleteNote(id))
    },
    saveJournal: (date, prompt, body) => {
      const id = `${me().id}|${date}`
      const old = get().journal.find((e) => e.id === id)
      if (!old && !body.trim()) return
      const t = nowIso()
      const entry: JournalEntry = { id, userId: me().id, date, prompt, body, createdAt: old?.createdAt ?? t, updatedAt: t }
      set((s) => ({ journal: [entry, ...s.journal.filter((e) => e.id !== id)].sort((a, b) => b.date.localeCompare(a.date)) }))
      save(journalService.saveEntry(entry))
    },

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
    updateGoal: (id, patch) => {
      const g = get().goals.find((x) => x.id === id)
      if (!g) return
      const next = { ...g, ...patch, updatedAt: nowIso() }
      set((s) => ({ goals: s.goals.map((x) => (x.id === id ? next : x)) }))
      save(goalService.saveGoal(next))
    },
    addGoalStep: (id, title) => {
      const g = get().goals.find((x) => x.id === id)
      if (!g || !title.trim()) return
      // A new open step reopens a goal that was ticked through its steps.
      const steps = [...(g.steps ?? []), { id: uid(), title: title.trim(), done: false }]
      const next: WeeklyGoal = { ...g, steps, done: g.done && !(g.steps?.length), doneAt: g.done && !(g.steps?.length) ? g.doneAt : undefined, updatedAt: nowIso() }
      set((s) => ({ goals: s.goals.map((x) => (x.id === id ? next : x)) }))
      save(goalService.saveGoal(next))
    },
    toggleGoalStep: (id, stepId) => {
      const g = get().goals.find((x) => x.id === id)
      if (!g) return
      haptic()
      const steps = (g.steps ?? []).map((st) => (st.id === stepId ? { ...st, done: !st.done } : st))
      const all = steps.length > 0 && steps.every((st) => st.done)
      const next: WeeklyGoal = { ...g, steps, done: all, doneAt: all ? g.doneAt ?? nowIso() : undefined, updatedAt: nowIso() }
      set((s) => ({ goals: s.goals.map((x) => (x.id === id ? next : x)) }))
      save(goalService.saveGoal(next))
    },
    removeGoalStep: (id, stepId) => {
      const g = get().goals.find((x) => x.id === id)
      if (!g) return
      putGoals([withSteps(g, (g.steps ?? []).filter((st) => st.id !== stepId))])
    },
    removeGoal: (id) => {
      set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }))
      save(goalService.deleteGoal(id))
    },
    renameGoalStep: (id, stepId, title) => {
      const g = get().goals.find((x) => x.id === id)
      if (!g || !title.trim()) return
      get().updateGoal(id, { steps: (g.steps ?? []).map((st) => (st.id === stepId ? { ...st, title: title.trim() } : st)) })
    },
    setPriority: (id, on) => {
      const g = get().goals.find((x) => x.id === id)
      if (!g) return
      haptic()
      // One top priority a week: setting one clears the others.
      const changed = get().goals
        .filter((x) => x.week === g.week && (x.id === id ? !!x.priority !== on : x.priority && on))
        .map((x) => ({ ...x, priority: x.id === id ? on : false, updatedAt: nowIso() }))
      putGoals(changed)
    },
    reorderGoals: (week, ids) => {
      const goals = get().goals.filter((g) => g.week === week)
      putGoals(ids.flatMap((id, i) => {
        const g = goals.find((x) => x.id === id)
        return g && g.position !== i ? [{ ...g, position: i, updatedAt: nowIso() }] : []
      }))
    },
    nestGoal: (id, targetId, index) => {
      const g = get().goals.find((x) => x.id === id)
      const target = get().goals.find((x) => x.id === targetId)
      if (!g || !target || id === targetId) return
      haptic(12)
      // The goal becomes a step, and its own steps come along right after it.
      const moved = [{ id: uid(), title: g.title, done: g.done }, ...(g.steps ?? [])]
      const steps = [...(target.steps ?? [])]
      steps.splice(index ?? steps.length, 0, ...moved)
      putGoals([withSteps(target, steps)])
      set((s) => ({ goals: s.goals.filter((x) => x.id !== id) }))
      save(goalService.deleteGoal(id))
    },
    moveGoalStep: (fromId, stepId, toId, index) => {
      const from = get().goals.find((x) => x.id === fromId)
      const to = get().goals.find((x) => x.id === toId)
      const step = from?.steps?.find((st) => st.id === stepId)
      if (!from || !to || !step) return
      const rest = (from.steps ?? []).filter((st) => st.id !== stepId)
      if (fromId === toId) {
        rest.splice(index, 0, step)
        putGoals([withSteps(from, rest)])
        return
      }
      const steps = [...(to.steps ?? [])]
      steps.splice(index, 0, step)
      putGoals([withSteps(from, rest), withSteps(to, steps)])
    },
    stepToGoal: (id, stepId, index) => {
      const g = get().goals.find((x) => x.id === id)
      const step = g?.steps?.find((st) => st.id === stepId)
      if (!g || !step) return
      const t = nowIso()
      const goal: WeeklyGoal = { id: uid(), userId: me().id, week: g.week, title: step.title, done: step.done, doneAt: step.done ? t : undefined, position: 0, createdAt: t, updatedAt: t }
      const parent = withSteps(g, (g.steps ?? []).filter((st) => st.id !== stepId))
      const order = get().goals.filter((x) => x.week === g.week).sort((a, b) => a.position - b.position).map((x) => (x.id === id ? parent : x))
      order.splice(index, 0, goal)
      const was = new Map(get().goals.map((x) => [x.id, x.position]))
      putGoals(order.map((x, i) => ({ ...x, position: i })).filter((x) => x.id === goal.id || x.id === id || was.get(x.id) !== x.position))
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


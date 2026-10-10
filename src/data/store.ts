import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { addDays, logicalToday, minutesOf, hhmm } from '../lib/date'
import { liveStreak, logKey, MAX_SKIPS_PER_WEEK, outcome, settle, skipsThisWeek } from '../lib/streak'
import { seed, type SeedData } from './seed'
import type { Activity, CalEvent, DayLog, Notice, Routine, RoutineItem, Settings, Task, User } from './types'

const uid = () => Math.random().toString(36).slice(2, 10)

interface Actions {
  /** Close out finished days (runs on launch and when the day rolls over). */
  settleDays: () => void
  toggleItem: (routineId: string, itemId: string, date?: string) => { completedRoutine: boolean; streak: number }
  markRunStart: (routineId: string) => void
  skipItemToday: (routineId: string, itemId: string) => void
  skipDay: (routineId: string) => boolean
  backfill: (routineId: string) => number | null

  addRoutine: (r: Omit<Routine, 'id' | 'streak' | 'createdAt' | 'paused'>) => Routine
  updateRoutine: (id: string, patch: Partial<Routine>) => void
  copyRoutine: (fromId: string, to: User) => Routine | null
  upsertItem: (routineId: string, item: RoutineItem) => void
  deleteItem: (routineId: string, itemId: string) => void
  moveItem: (fromId: string, toId: string, itemId: string) => void
  reorderItems: (routineId: string, from: number, to: number) => void

  toggleTask: (id: string) => void
  addTask: (t: Omit<Task, 'id' | 'done'>) => Task
  updateTask: (id: string, patch: Partial<Task>) => void
  removeTask: (id: string) => void
  addEvent: (e: Omit<CalEvent, 'id'>) => CalEvent
  removeEvent: (id: string) => void

  updateSettings: (user: User, patch: Partial<Settings>) => void
  addActivity: (a: Omit<Activity, 'id' | 'at'>) => void
  pushNotice: (user: User, n: Omit<Notice, 'id' | 'at' | 'read'>) => void
  markInboxRead: (user: User) => void
  /** Keys of reminders already sent, so the scheduler never repeats one. */
  markSent: (key: string) => void
  resetDemo: () => void
}

export interface DataState extends SeedData {
  sent: Record<string, number>
  lastBackfill: Partial<Record<string, string>>
}

const initial = (): DataState => ({ ...seed(), sent: {}, lastBackfill: {} })

export const useData = create<DataState & Actions>()(
  persist(
    (set, get) => {
      const patchRoutine = (id: string, fn: (r: Routine) => Routine) =>
        set((s) => ({ routines: s.routines.map((r) => (r.id === id ? fn(r) : r)) }))
      const patchLog = (date: string, routineId: string, fn: (l: DayLog) => DayLog) =>
        set((s) => {
          const key = logKey(date, routineId)
          const cur = s.logs[key] ?? { date, routineId, doneItemIds: [] }
          return { logs: { ...s.logs, [key]: fn(cur) } }
        })

      return {
        ...initial(),

        settleDays: () => {
          const s = get()
          const yesterday = addDays(logicalToday(), -1)
          if (s.settledThrough >= yesterday) return
          set({
            routines: s.routines.map((r) => ({ ...r, streak: settle(r, s.logs, s.settledThrough, yesterday) })),
            settledThrough: yesterday,
          })
        },

        toggleItem: (routineId, itemId, date = logicalToday()) => {
          const before = get().logs[logKey(date, routineId)]
          const r = get().routines.find((x) => x.id === routineId)!
          const wasFull = outcome(r, date, before) === 'full'
          patchLog(date, routineId, (l) => {
            const done = l.doneItemIds.includes(itemId) ? l.doneItemIds.filter((i) => i !== itemId) : [...l.doneItemIds, itemId]
            return { ...l, doneItemIds: done }
          })
          const after = get().logs[logKey(date, routineId)]
          const isFull = outcome(r, date, after) === 'full'
          const completedRoutine = !wasFull && isFull
          if (completedRoutine) patchLog(date, routineId, (l) => ({ ...l, finishedAt: Date.now() }))
          return { completedRoutine, streak: liveStreak(r, date, after) }
        },

        markRunStart: (routineId) => patchLog(logicalToday(), routineId, (l) => ({ ...l, startedAt: l.startedAt ?? Date.now() })),

        skipItemToday: (routineId, itemId) =>
          patchLog(logicalToday(), routineId, (l) => ({
            ...l, skippedItemIds: Array.from(new Set([...(l.skippedItemIds ?? []), itemId])),
          })),

        skipDay: (routineId) => {
          const r = get().routines.find((x) => x.id === routineId)
          if (!r || skipsThisWeek(r, get().logs, logicalToday()) >= MAX_SKIPS_PER_WEEK) return false
          patchLog(logicalToday(), routineId, (l) => ({ ...l, skipped: true }))
          return true
        },

        backfill: (routineId) => {
          const s = get()
          const r = s.routines.find((x) => x.id === routineId)
          const b = r?.streak.lastBreak
          const today = logicalToday()
          const last = s.lastBackfill[r?.owner ?? '']
          if (!r || !b || b.backfilled || b.date < addDays(today, -2)) return null
          if (last && last > addDays(today, -7)) return null
          const counted = r.items.filter((i) => i.countsTowardStreak).map((i) => i.id)
          patchLog(b.date, routineId, (l) => ({ ...l, doneItemIds: Array.from(new Set([...l.doneItemIds, ...counted])), backfilled: true }))
          const current = b.value + 1
          patchRoutine(routineId, (x) => ({
            ...x, streak: { current, longest: Math.max(x.streak.longest, current), lastBreak: { ...b, backfilled: true } },
          }))
          set((st) => ({ lastBackfill: { ...st.lastBackfill, [r.owner]: today } }))
          return liveStreak({ ...r, streak: { ...r.streak, current } }, today, get().logs[logKey(today, routineId)])
        },

        addRoutine: (r) => {
          const routine: Routine = { ...r, id: `${r.owner}-${uid()}`, paused: false, createdAt: logicalToday(), streak: { current: 0, longest: 0 } }
          set((s) => ({ routines: [...s.routines, routine] }))
          return routine
        },
        updateRoutine: (id, patch) => patchRoutine(id, (r) => ({ ...r, ...patch })),
        copyRoutine: (fromId, to) => {
          const src = get().routines.find((r) => r.id === fromId)
          if (!src) return null
          const copy: Routine = {
            ...src, id: `${to}-${uid()}`, owner: to, sharedWith: undefined, createdAt: logicalToday(),
            streak: { current: 0, longest: 0 }, items: src.items.map((i) => ({ ...i, id: uid() })),
          }
          set((s) => ({ routines: [...s.routines, copy] }))
          return copy
        },
        upsertItem: (routineId, item) =>
          patchRoutine(routineId, (r) => ({
            ...r, items: r.items.some((i) => i.id === item.id) ? r.items.map((i) => (i.id === item.id ? item : i)) : [...r.items, item],
          })),
        deleteItem: (routineId, itemId) => patchRoutine(routineId, (r) => ({ ...r, items: r.items.filter((i) => i.id !== itemId) })),
        moveItem: (fromId, toId, itemId) => {
          const item = get().routines.find((r) => r.id === fromId)?.items.find((i) => i.id === itemId)
          if (!item) return
          patchRoutine(fromId, (r) => ({ ...r, items: r.items.filter((i) => i.id !== itemId) }))
          patchRoutine(toId, (r) => ({ ...r, items: [...r.items, { ...item, days: r.days }] }))
        },
        reorderItems: (routineId, from, to) =>
          patchRoutine(routineId, (r) => {
            const items = [...r.items]
            const [moved] = items.splice(from, 1)
            items.splice(to, 0, moved)
            return { ...r, items }
          }),

        toggleTask: (id) =>
          set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done, doneAt: t.done ? undefined : Date.now() } : t)) })),
        addTask: (t) => {
          const task: Task = { ...t, id: uid(), done: false }
          set((s) => ({ tasks: [...s.tasks, task] }))
          return task
        },
        updateTask: (id, patch) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
        removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
        addEvent: (e) => {
          const ev: CalEvent = { ...e, id: uid() }
          set((s) => ({ events: [...s.events, ev] }))
          return ev
        },
        removeEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

        updateSettings: (user, patch) => set((s) => ({ settings: { ...s.settings, [user]: { ...s.settings[user], ...patch } } })),
        addActivity: (a) => set((s) => ({ activity: [{ ...a, id: uid(), at: Date.now() }, ...s.activity].slice(0, 40) })),
        pushNotice: (user, n) =>
          set((s) => ({ inbox: { ...s.inbox, [user]: [{ ...n, id: uid(), at: Date.now(), read: false }, ...s.inbox[user]].slice(0, 60) } })),
        markInboxRead: (user) => set((s) => ({ inbox: { ...s.inbox, [user]: s.inbox[user].map((n) => ({ ...n, read: true })) } })),
        markSent: (key) => set((s) => ({ sent: { ...s.sent, [key]: Date.now() } })),
        resetDemo: () => set(initial()),
      }
    },
    { name: 'aurelio-data', version: 1 },
  ),
)

/** Shift a routine's start time, e.g. after a miss. */
export const laterStart = (time: string, minutes = 30) => hhmm(minutesOf(time) + minutes)

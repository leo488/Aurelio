import { addDays, dt, logicalToday, weekday } from '../lib/date'
import { isScheduled, itemsOn, logKey } from '../lib/streak'
import type { Activity, CalEvent, DayLog, Notice, Routine, RoutineItem, Settings, Task, User } from './types'

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6]

const item = (id: string, name: string, extra: Partial<RoutineItem> = {}, days = EVERY_DAY): RoutineItem => ({
  id, name, days, countsTowardStreak: true, ...extra,
})

export const defaultSettings = (): Settings => ({
  notif: { routineStart: true, deadlines: true, partner: false, quiet: { on: true, from: '22:30', to: '06:15' } },
  oriConfirm: true,
})

/** Days before `today` going back: the last `current` scheduled days are full (with the odd partial or skip), then one miss. */
function history(r: Routine, today: string, current: number, todayDone: string[], days = 120): Record<string, DayLog> {
  const logs: Record<string, DayLog> = {}
  let fullLeft = current
  let broke = false
  let n = 0
  for (let i = 1; i <= days; i++) {
    const date = addDays(today, -i)
    if (!isScheduled(r, date)) continue
    n++
    const ids = itemsOn(r, date).map((it) => it.id)
    let done = ids
    let skipped = false
    if (fullLeft > 0) {
      // A partial day every so often holds the run without adding to it.
      if (n % 9 === 4) done = ids.slice(0, Math.ceil(ids.length * 0.8))
      else if (n % 17 === 8) skipped = true
      else fullLeft--
    } else if (!broke) {
      done = ids.slice(0, 1)
      broke = true
    } else {
      const roll = (i * 7919 + r.id.length * 31) % 10
      if (roll < 1) done = ids.slice(0, 1)
      else if (roll < 3) done = ids.slice(0, Math.ceil(ids.length * 0.8))
    }
    logs[logKey(date, r.id)] = { date, routineId: r.id, doneItemIds: done, skipped: skipped || undefined }
  }
  if (todayDone.length) logs[logKey(today, r.id)] = { date: today, routineId: r.id, doneItemIds: todayDone }
  return logs
}

export interface SeedData {
  routines: Routine[]
  tasks: Task[]
  events: CalEvent[]
  logs: Record<string, DayLog>
  settings: Record<User, Settings>
  activity: Activity[]
  inbox: Record<User, Notice[]>
  settledThrough: string
}

export function seed(now = new Date()): SeedData {
  const today = logicalToday(now)
  const yesterday = addDays(today, -1)
  const created = addDays(today, -400)
  const t = now.getTime()

  const routine = (r: Omit<Routine, 'createdAt' | 'remind' | 'paused'> & Partial<Routine>): Routine => ({
    remind: true, paused: false, createdAt: created, ...r,
  })

  const routines: Routine[] = [
    routine({
      id: 'leo-morning', owner: 'leo', name: 'Morning', icon: 'sun', time: '06:30', days: EVERY_DAY,
      items: [
        item('water', 'Drink water'), item('pray', 'Pray'), item('exercise', 'Exercise', { durationMin: 20 }),
        item('shower', 'Shower'), item('read', 'Read', { durationMin: 30, shared: true }),
      ],
      streak: { current: 23, longest: 41 },
    }),
    routine({
      id: 'leo-evening', owner: 'leo', name: 'Evening', icon: 'moon', time: '21:00', days: EVERY_DAY,
      items: [item('tidy', 'Tidy the kitchen', { durationMin: 10 }), item('plan', 'Plan tomorrow', { durationMin: 5 }), item('stretch', 'Stretch', { durationMin: 10 })],
      streak: { current: 8, longest: 19 },
    }),
    routine({
      id: 'leo-gym', owner: 'leo', name: 'Gym', icon: 'dumbbell', time: '18:00', days: [0, 2, 4],
      items: [
        item('warm', 'Warm up', { durationMin: 5 }, [0, 2, 4]), item('push', 'Push day', { durationMin: 40 }, [0, 2, 4]),
        item('cool', 'Cool down', { durationMin: 10 }, [0, 2, 4]), item('log', 'Log the session', {}, [0, 2, 4]),
      ],
      streak: { current: 5, longest: 12 },
    }),
    routine({
      id: 'leo-study', owner: 'leo', name: 'Study', icon: 'book', time: '19:30', days: [0, 1, 2, 3, 4], paused: true,
      items: [item('notes', 'Review notes', { durationMin: 25 }, [0, 1, 2, 3, 4]), item('problems', 'Practice problems', { durationMin: 45 }, [0, 1, 2, 3, 4])],
      streak: { current: 12, longest: 15 },
    }),
    routine({
      id: 'soniya-morning', owner: 'soniya', name: 'Morning', icon: 'sun', time: '07:00', days: EVERY_DAY,
      items: [
        item('s-stretch', 'Stretch', { durationMin: 10 }), item('s-water', 'Drink water'), item('s-journal', 'Journal', { durationMin: 10 }),
        item('s-shower', 'Shower'), item('s-read', 'Read', { durationMin: 30, shared: true }),
      ],
      streak: { current: 11, longest: 19 },
    }),
    routine({
      id: 'soniya-evening', owner: 'soniya', name: 'Evening', icon: 'moon', time: '21:30', days: EVERY_DAY,
      items: [item('s-dishes', 'Dishes'), item('s-bag', 'Pack tomorrow’s bag'), item('s-skin', 'Skincare'), item('s-phone', 'Phone away by 22:30')],
      streak: { current: 6, longest: 14 },
    }),
    routine({
      id: 'both-sunday', owner: 'both', sharedWith: 'soniya', name: 'Sunday reset', icon: 'sun', time: '10:00', days: [6],
      items: ['Laundry', 'Groceries', 'Clean the bathroom', 'Meal prep', 'Water the plants', 'Plan the week'].map((n, i) => item(`sr-${i}`, n, {}, [6])),
      streak: { current: 3, longest: 7 },
    }),
  ]

  const byId = Object.fromEntries(routines.map((r) => [r.id, r]))
  const sundayThisWeek = addDays(today, 6 - weekday(today))
  const logs: Record<string, DayLog> = {
    ...history(byId['leo-morning'], today, 23, ['water', 'pray', 'exercise']),
    ...history(byId['leo-evening'], today, 8, []),
    ...history(byId['leo-gym'], today, 5, []),
    ...history(byId['soniya-morning'], today, 11, ['s-stretch', 's-water', 's-journal', 's-shower', 's-read']),
    ...history(byId['soniya-evening'], today, 6, []),
    ...history(byId['both-sunday'], today, 3, []),
  }
  logs[logKey(sundayThisWeek, 'both-sunday')] = { date: sundayThisWeek, routineId: 'both-sunday', doneItemIds: ['sr-0', 'sr-1'] }
  if (logs[logKey(today, 'soniya-morning')]) logs[logKey(today, 'soniya-morning')].finishedAt = t - 20 * 60000

  const nextWeekday = (wd: number) => addDays(today, ((wd - weekday(today) + 7) % 7) || 7)
  const friday = nextWeekday(4)
  const saturday = nextWeekday(5)

  const tasks: Task[] = [
    { id: 'gym-membership', owner: 'leo', title: 'Renew gym membership', due: dt(yesterday, '23:59'), isDeadline: true, priority: 'high', shared: false, done: false },
    { id: 'lab', owner: 'leo', title: 'Submit lab report', due: dt(today, '23:59'), isDeadline: true, remindAt: dt(today, '09:00'), priority: 'high', shared: false, done: false },
    { id: 'assign', owner: 'leo', title: 'Work on assignment', notes: `due ${relativeWeekday(friday)}`, due: dt(today, '16:00'), remindAt: dt(today, '16:00'), durationMin: 60, isDeadline: false, priority: 'med', shared: false, done: false },
    { id: 'print', owner: 'leo', title: 'Print reading list', isDeadline: false, priority: 'low', shared: false, done: false },
    { id: 'restaurant', owner: 'both', title: 'Book the restaurant', due: saturday, isDeadline: false, priority: 'med', shared: true, assignee: 'soniya', done: false },
    { id: 's-landlord', owner: 'soniya', title: 'Call the landlord', due: dt(today, '12:30'), isDeadline: false, priority: 'med', shared: false, done: false },
    { id: 's-library', owner: 'soniya', title: 'Return library books', due: dt(addDays(today, 3), '23:59'), isDeadline: true, priority: 'low', shared: false, done: false },
  ]

  const events: CalEvent[] = [
    { id: 'standup', owner: 'leo', title: 'Standup', start: dt(today, '10:00'), end: dt(today, '10:15') },
    { id: 'ds', owner: 'leo', title: 'Data Structures', start: dt(today, '09:00'), end: dt(today, '12:00'), location: 'Room B4' },
    { id: 'lunch', owner: 'both', title: 'Lunch', start: dt(today, '13:00'), end: dt(today, '14:00'), shared: true },
    { id: 's-studio', owner: 'soniya', title: 'Studio session', start: dt(today, '15:00'), end: dt(today, '17:00') },
  ]

  const activity: Activity[] = [
    { id: 'a1', who: 'soniya', kind: 'routine-done', text: 'finished her morning', at: t - 20 * 60000, routineId: 'soniya-morning' },
    { id: 'a2', who: 'leo', kind: 'streak', text: 'reached', value: 23, routineId: 'leo-morning', at: t - 26 * 3600000, cheeredBy: 'soniya' },
  ]

  const at = (date: string, time: string) => new Date(`${date}T${time}:00`).getTime()
  const inbox: Record<User, Notice[]> = {
    leo: [
      { id: 'n1', kind: 'routine', title: 'Morning starts in 10 minutes', meta: 'Routine reminder', at: at(today, '06:20'), read: false, opened: true },
      { id: 'n2', kind: 'deadline', title: 'Lab report is due tonight', meta: 'Deadline warning', at: at(today, '09:00'), read: false, taskId: 'lab' },
      { id: 'n3', kind: 'partner', title: 'Soniya shared “Sunday reset”', meta: '', at: at(yesterday, '20:14'), read: true, opened: true },
      { id: 'n4', kind: 'catchup', title: '2 items left before bed', meta: 'Catch-up', at: at(yesterday, '20:00'), read: true, opened: true },
    ],
    soniya: [
      { id: 'n5', kind: 'routine', title: 'Morning starts in 10 minutes', meta: 'Routine reminder', at: at(today, '06:50'), read: false, opened: true },
      { id: 'n6', kind: 'partner', title: 'Leo cheered your morning', meta: '', at: at(yesterday, '08:10'), read: true, opened: true },
    ],
  }

  return {
    routines, tasks, events, logs, activity, inbox,
    settings: { leo: defaultSettings(), soniya: defaultSettings() },
    settledThrough: yesterday,
  }
}

function relativeWeekday(iso: string) {
  return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][weekday(iso)]
}

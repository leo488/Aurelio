import { addDays, logicalToday } from '../lib/date'
import { completionId, isScheduled, stepsOn } from '../lib/streak'
import type { Activity, AppNotification, Routine, RoutineCompletion, RoutineStep, Settings, Task, User } from './types'
import { PROFILES } from '../config'

// Demo data for local mode, generated relative to today so it always looks lived-in.
// Only used when no database is configured.

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6]
const WEEKDAYS = [0, 1, 2, 3, 4]

export const defaultSettings = (userId: string, now = new Date()): Settings => ({
  id: userId,
  userId,
  notif: { reminders: true, deadlines: true, partner: true, quiet: { on: true, from: '22:30', to: '06:15' } },
  oriConfirm: true,
  updatedAt: now.toISOString(),
})

export interface SeedData {
  profiles: User[]
  routines: Routine[]
  completions: RoutineCompletion[]
  tasks: Task[]
  notifications: AppNotification[]
  activity: Activity[]
  settings: Settings[]
}

export function seed(now = new Date(), ids: { leo: string; sonia: string } = { leo: 'leo', sonia: 'sonia' }): SeedData {
  const today = logicalToday(now)
  const iso = now.toISOString()
  const created = addDays(today, -120)
  const at = (date: string, time: string) => new Date(`${date}T${time}:00`).toISOString()

  const step = (id: string, title: string, duration?: number, days = EVERY_DAY): RoutineStep => ({ id, title, duration, days, countsTowardStreak: true })
  const routine = (r: Pick<Routine, 'id' | 'name' | 'icon' | 'timeCategory' | 'scheduledTime' | 'steps'> & Partial<Routine>): Routine => ({
    userId: ids.leo, repeatPattern: { type: 'weekly', days: EVERY_DAY }, reminder: { enabled: true, minutesBefore: 10 },
    active: true, createdAt: created, updatedAt: iso, ...r,
  })

  const routines: Routine[] = [
    routine({
      id: 'leo-morning', name: 'Morning Routine', icon: 'sun', timeCategory: 'morning', scheduledTime: '06:30',
      steps: [step('m-water', 'Drink water'), step('m-pray', 'Pray', 5), step('m-exercise', 'Exercise', 20), step('m-shower', 'Shower', 10), step('m-read', 'Read', 20), step('m-work', 'Start work')],
      reminder: { enabled: true, minutesBefore: 15 },
    }),
    routine({
      id: 'leo-deep', name: 'Deep Work', icon: 'book', timeCategory: 'custom', categoryLabel: 'Before lunch', scheduledTime: '09:30',
      repeatPattern: { type: 'weekly', days: WEEKDAYS },
      steps: [step('d-phone', 'Phone in the drawer', undefined, WEEKDAYS), step('d-plan', 'Pick one thing', 5, WEEKDAYS), step('d-focus', 'Focus block', 90, WEEKDAYS)],
    }),
    routine({
      id: 'leo-workout', name: 'Workout', icon: 'dumbbell', timeCategory: 'afternoon', scheduledTime: '17:30',
      repeatPattern: { type: 'weekly', days: [0, 2, 4] },
      steps: [step('w-warm', 'Warm up', 5, [0, 2, 4]), step('w-main', 'Strength', 40, [0, 2, 4]), step('w-cool', 'Cool down', 10, [0, 2, 4])],
    }),
    routine({
      id: 'leo-evening', name: 'Evening Routine', icon: 'moon', timeCategory: 'evening', scheduledTime: '20:30',
      steps: [step('e-tidy', 'Tidy the kitchen', 10), step('e-plan', 'Plan tomorrow', 5), step('e-stretch', 'Stretch', 10)],
    }),
    routine({
      id: 'leo-night', name: 'Night Routine', icon: 'moon', timeCategory: 'night', scheduledTime: '22:30',
      steps: [step('n-phone', 'Phone on charge'), step('n-pray', 'Pray', 5), step('n-lights', 'Lights out')],
    }),
    routine({
      id: 'leo-study', name: 'Study', icon: 'book', timeCategory: 'evening', scheduledTime: '19:00', repeatPattern: { type: 'weekly', days: WEEKDAYS },
      steps: [step('s-notes', 'Review notes', 25, WEEKDAYS), step('s-problems', 'Practice problems', 45, WEEKDAYS)],
      active: false, inactiveRanges: [{ from: addDays(today, -9) }],
    }),
  ]

  // History: the last 12 days are clean (a partial here and there), the day before that came apart,
  // and older days are a believable mix.
  const completions: RoutineCompletion[] = []
  const record = (r: Routine, date: string, done: string[], extra: Partial<RoutineCompletion> = {}) => {
    const required = stepsOn(r, date).filter((s) => s.countsTowardStreak).map((s) => s.id)
    completions.push({
      id: completionId(r.id, date), routineId: r.id, userId: r.userId, date, completedStepIds: done, requiredStepIds: required,
      completedAt: required.every((id) => done.includes(id)) ? at(date, r.scheduledTime ?? '12:00') : undefined, updatedAt: iso, ...extra,
    })
  }
  for (let i = 1; i <= 120; i++) {
    const date = addDays(today, -i)
    routines.forEach((r, k) => {
      if (!isScheduled(r, date)) return
      const ids_ = stepsOn(r, date).map((s) => s.id)
      if (i <= 12) {
        const partial = (i + k) % 9 === 4
        record(r, date, partial ? ids_.slice(0, Math.ceil(ids_.length * 0.7)) : ids_)
      } else if (i === 13) {
        record(r, date, ids_.slice(0, 1))
      } else {
        const roll = (i * 7919 + k * 31) % 10
        if (roll === 0) return
        record(r, date, roll < 3 ? ids_.slice(0, Math.ceil(ids_.length * 0.7)) : ids_)
      }
    })
  }
  // Today: the morning is under way.
  record(routines[0], today, ['m-water', 'm-pray', 'm-exercise'], { startedAt: at(today, '06:32') })

  // Soniya's planner: past days mostly done, today laid out, a few things coming up.
  const task = (t: Pick<Task, 'id' | 'title'> & Partial<Task>): Task => ({
    userId: ids.sonia, priority: 'medium', completed: false, createdAt: iso, updatedAt: iso, ...t,
  })
  const PAST = ['Reply to Hannah', 'Grocery order', 'Gym class', 'Pay the electricity bill', 'Draft the newsletter', 'Call the bank', 'Pick up dry cleaning', 'Prep slides', 'Water the plants', 'Book train tickets']
  const tasks: Task[] = []
  for (let i = 1; i <= 21; i++) {
    const date = addDays(today, -i)
    const n = 2 + ((i * 5) % 3)
    for (let k = 0; k < n; k++) {
      // Two things slipped and are still open (they show as overdue); everything else got done.
      const done = !((i === 9 && k === 1) || (i === 2 && k === 1))
      const start = `${String(9 + k * 3).padStart(2, '0')}:00`
      tasks.push(task({
        id: `s-past-${i}-${k}`, title: PAST[(i * 3 + k) % PAST.length], date, startTime: start,
        completed: done, completedAt: done ? at(date, `${String(10 + k * 3).padStart(2, '0')}:15`) : undefined,
      }))
    }
  }
  const tomorrow = addDays(today, 1)
  tasks.push(
    task({ id: 's-meeting', title: 'Team meeting', date: today, startTime: '09:00', endTime: '10:00', completed: true, completedAt: at(today, '10:00') }),
    task({ id: 's-proposal', title: 'Send proposal', date: today, startTime: '11:30', priority: 'high', reminderAt: `${today}T11:15`, notes: 'Final version is in the shared drive' }),
    task({ id: 's-doctor', title: 'Doctor appointment', date: today, startTime: '14:00', endTime: '14:45', reminderAt: `${today}T13:30` }),
    task({ id: 's-mum', title: 'Call Mum', date: today, startTime: '18:00', reminderAt: `${today}T17:45` }),
    task({ id: 's-yoga', title: 'Yoga', date: tomorrow, startTime: '07:30', endTime: '08:15' }),
    task({ id: 's-review', title: 'Quarterly review prep', date: tomorrow, startTime: '13:00', priority: 'high' }),
    task({ id: 's-library', title: 'Return library books', date: addDays(today, 3), deadline: true, priority: 'low', reminderAt: `${addDays(today, 1)}T09:00` }),
    task({ id: 's-dinner', title: 'Dinner with Leo', date: addDays(today, 4), startTime: '19:30' }),
    task({ id: 's-dentist', title: 'Book a dentist check-up', priority: 'low' }),
  )

  const activity: Activity[] = [
    { id: 'a-1', userId: ids.sonia, kind: 'day-done', text: 'finished everything on today’s plan', createdAt: at(addDays(today, -1), '18:40') },
    { id: 'a-2', userId: ids.leo, kind: 'streak', text: 'reached a 7-day streak', value: 7, createdAt: at(addDays(today, -5), '07:10'), cheeredBy: ids.sonia },
  ]

  const notifications: AppNotification[] = [
    { id: 'n-1', userId: ids.leo, kind: 'routine', title: 'Morning Routine starts in 15 minutes', body: 'Drink water, pray, exercise', refType: 'routine', refId: 'leo-morning', scheduledFor: at(today, '06:15'), status: 'read', createdAt: at(today, '06:15') },
    { id: 'n-2', userId: ids.leo, kind: 'partner', title: 'Soniya sent you some encouragement', scheduledFor: at(addDays(today, -1), '20:14'), status: 'read', fromUserId: ids.sonia, createdAt: at(addDays(today, -1), '20:14') },
    { id: 'n-3', userId: ids.sonia, kind: 'task', title: 'Team meeting in 15 minutes', refType: 'task', refId: 's-meeting', scheduledFor: at(today, '08:45'), status: 'read', createdAt: at(today, '08:45') },
  ]

  const profiles: User[] = (['leo', 'sonia'] as const).map((role) => ({ id: ids[role], role, name: PROFILES[role].name, email: PROFILES[role].email }))
  const settings = [ids.leo, ids.sonia].map((u) => defaultSettings(u, now))

  return { profiles, routines, completions, tasks, notifications, activity, settings }
}

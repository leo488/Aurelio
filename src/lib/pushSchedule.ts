import { completionFor, dayProgress, routinesOn, routineTime } from '../data/select'
import type { DataState } from '../data/store'
import type { User } from '../data/types'
import { addDays, dt, logicalToday, minutesOf, toDate } from './date'
import { progress, stepsOn } from './streak'

// The same reminders checkReminders shows while the app is open, worked out a week ahead so the
// server can push them when it's closed. Keys match checkReminders' keys, so a reminder the open app
// already showed and its push share one notification tag and never appear twice.

export interface PlannedPush {
  key: string
  fireAt: Date
  title: string
  body?: string
  /** Screen to open, relative to the app's base. */
  url: string
}

const DAYS_AHEAD = 7

const inQuiet = (mins: number, from: string, to: string) => {
  const a = minutesOf(from)
  const b = minutesOf(to)
  return a <= b ? mins >= a && mins < b : mins >= a || mins < b
}

type State = Pick<DataState, 'routines' | 'completions' | 'tasks' | 'settings'>

export function plannedPushes(s: State, user: User, now = new Date()): PlannedPush[] {
  const settings = s.settings
  if (!settings) return []
  const today = logicalToday(now)
  const out: PlannedPush[] = []
  const add = (p: PlannedPush) => {
    if (p.fireAt <= now) return
    const mins = p.fireAt.getHours() * 60 + p.fireAt.getMinutes()
    if (settings.notif.quiet.on && inQuiet(mins, settings.notif.quiet.from, settings.notif.quiet.to)) return
    out.push(p)
  }
  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i))

  if (user.role === 'leo') {
    for (const d of days) {
      if (settings.notif.reminders) {
        for (const r of routinesOn(s, d)) {
          if (!r.reminder.enabled || !r.scheduledTime) continue
          const p = progress(r, d, completionFor(s, r, d))
          if (p.total > 0 && p.done === p.total) continue
          const start = toDate(dt(d, routineTime(r)))
          const n = r.reminder.minutesBefore
          add({
            key: `routine|${r.id}|${d}`, fireAt: new Date(start.getTime() - n * 60000),
            title: n ? `${r.name} starts in ${n} minute${n === 1 ? '' : 's'}` : `${r.name} starts now`,
            body: stepsOn(r, d).map((x) => x.title).join(', '), url: `routines/${r.id}`,
          })
        }
      }
      const day = dayProgress(s, d)
      const left = day.total - day.done
      if (settings.notif.deadlines && left > 0) {
        add({
          key: `catchup|${d}`, fireAt: toDate(dt(d, '20:00')),
          title: d === today ? `${left} routine${left === 1 ? '' : 's'} left today` : 'Routines still open today',
          body: `${user.name}, there’s still time.`, url: 'today',
        })
      }
    }
  }

  if (user.role === 'sonia' && settings.notif.summary !== false) {
    for (const d of days) {
      const planned = s.tasks.filter((t) => t.date === d && !t.completed).length
      const overdue = d === today ? s.tasks.filter((t) => !t.completed && t.date && t.date < today).length : 0
      if (!planned && !overdue) continue
      add({
        key: `summary|${d}`, fireAt: toDate(dt(d, '08:00')),
        title: planned ? `${planned} task${planned === 1 ? '' : 's'} planned today` : 'Nothing planned today yet',
        body: overdue ? `${overdue} overdue · Morning summary` : 'Morning summary', url: 'today',
      })
    }
  }

  const last = addDays(today, DAYS_AHEAD)
  for (const t of s.tasks) {
    if (t.completed) continue
    if (settings.notif.reminders && t.reminderAt && t.reminderAt.slice(0, 10) <= last) {
      add({
        key: `task|${t.id}|${t.reminderAt}`, fireAt: toDate(t.reminderAt),
        title: t.startTime && t.date === t.reminderAt.slice(0, 10) ? `${t.title} at ${t.startTime}` : t.title,
        body: t.notes ?? 'Tap to open your day', url: 'today',
      })
    }
    if (settings.notif.deadlines && t.deadline && t.date) {
      for (const [d, label] of [[addDays(t.date, -2), 'is due in two days'], [t.date, 'is due today']] as const) {
        if (d >= today && d <= last) add({ key: `deadline|${t.id}|${d}`, fireAt: toDate(dt(d, '09:00')), title: `${t.title} ${label}`, url: 'today' })
      }
    }
  }
  return out
}

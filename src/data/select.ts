import { addDays, diffDays, logicalToday, minutesOf, nowMinutes, relativeDay } from '../lib/date'
import { completionOf, isComplete, progress, stepsOn, isScheduled } from '../lib/streak'
import type { DataState } from './store'
import type { Routine, Task, TimeCategory } from './types'

// Read-only views over the state. Everything a screen shows is derived here or in lib/stats.

const CATEGORY_TIME: Record<TimeCategory, string> = { morning: '06:00', afternoon: '13:00', evening: '19:00', night: '22:00', custom: '12:00' }
export const CATEGORY_LABEL: Record<TimeCategory, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night', custom: 'Custom' }

/** When a routine sits in the day: its time, or its category's usual slot. */
export const routineTime = (r: Routine) => r.scheduledTime ?? CATEGORY_TIME[r.timeCategory]
export const categoryText = (r: Routine) => (r.timeCategory === 'custom' ? r.categoryLabel || 'Custom' : CATEGORY_LABEL[r.timeCategory])

/** Active routines due on a date, in the order they happen. */
export const routinesOn = (s: Pick<DataState, 'routines'>, date: string) =>
  s.routines
    .filter((r) => r.active && isScheduled(r, date) && stepsOn(r, date).length > 0)
    .sort((a, b) => minutesOf(routineTime(a)) - minutesOf(routineTime(b)))

export const completionFor = (s: Pick<DataState, 'completions'>, r: Routine, date = logicalToday()) => completionOf(s.completions, r.id, date)

/** "How am I doing today?" for Leo: routines finished out of routines due, plus the step count. */
export function dayProgress(s: Pick<DataState, 'routines' | 'completions'>, date = logicalToday()) {
  const list = routinesOn(s, date)
  let stepsDone = 0
  let stepsTotal = 0
  let done = 0
  for (const r of list) {
    const c = completionFor(s, r, date)
    const p = progress(r, date, c)
    stepsDone += p.done
    stepsTotal += p.total
    if (isComplete(r, date, c) || c?.skipped) done++
  }
  return { done, total: list.length, stepsDone, stepsTotal, pct: stepsTotal ? Math.round((stepsDone / stepsTotal) * 100) : 0, list }
}

/** The routine to focus on now: the latest started one that isn't finished, else the next one. */
export function nowRoutine(s: Pick<DataState, 'routines' | 'completions'>, now = new Date()) {
  const today = logicalToday(now)
  const list = routinesOn(s, today)
  const mins = nowMinutes(now) + (now.getHours() < 4 ? 1440 : 0)
  const unfinished = list.filter((r) => {
    const c = completionFor(s, r, today)
    const p = progress(r, today, c)
    return p.done < p.total && !c?.skipped
  })
  const started = unfinished.filter((r) => minutesOf(routineTime(r)) <= mins)
  const routine = started[started.length - 1] ?? unfinished[0]
  return routine ? { routine, started: minutesOf(routineTime(routine)) <= mins } : null
}

// ─── Tasks ──────────────────────────────────────────────────────────────

const timeKey = (t: Task) => t.startTime ?? '99:99'
export const byTime = (a: Task, b: Task) => timeKey(a).localeCompare(timeKey(b)) || a.createdAt.localeCompare(b.createdAt)

export const tasksOn = (s: Pick<DataState, 'tasks'>, date: string) => s.tasks.filter((t) => t.date === date).sort(byTime)

export const isOverdue = (t: Task, today = logicalToday()) => !t.completed && !!t.date && t.date < today

export const overdueTasks = (s: Pick<DataState, 'tasks'>, today = logicalToday()) =>
  s.tasks.filter((t) => isOverdue(t, today)).sort((a, b) => a.date!.localeCompare(b.date!) || byTime(a, b))

/** Dated tasks after today, up to `days` ahead. */
export const upcomingTasks = (s: Pick<DataState, 'tasks'>, today = logicalToday(), days = 14) =>
  s.tasks
    .filter((t) => t.date && t.date > today && t.date <= addDays(today, days))
    .sort((a, b) => a.date!.localeCompare(b.date!) || byTime(a, b))

export const somedayTasks = (s: Pick<DataState, 'tasks'>) => s.tasks.filter((t) => !t.date).sort((a, b) => a.createdAt.localeCompare(b.createdAt))

export const timeRange = (t: Task) => (t.startTime ? (t.endTime ? `${t.startTime} – ${t.endTime}` : t.startTime) : '')

export function taskMeta(t: Task, today = logicalToday()) {
  if (!t.date) return [t.deadline ? 'Deadline' : 'No date', t.reminderAt ? 'reminder on' : ''].filter(Boolean).join(' · ')
  if (isOverdue(t, today)) {
    const n = diffDays(today, t.date)
    return `${t.deadline ? 'Was due' : 'Overdue since'} ${n === 1 ? 'yesterday' : relativeDay(t.date, today)}`
  }
  const day = t.date === today ? 'Today' : relativeDay(t.date, today)
  return [day, timeRange(t), t.deadline ? 'deadline' : t.reminderAt ? 'reminder on' : ''].filter(Boolean).join(' · ')
}

import { addDays, dateOf, diffDays, logicalToday, minutesOf, nowMinutes, relativeDay, timeOf, weekday } from '../lib/date'
import { isScheduled, itemsOn, logKey, progress } from '../lib/streak'
import type { DataState } from './store'
import type { CalEvent, Routine, Task, User } from './types'

export const visible = (owner: string, me: User) => owner === me || owner === 'both'

export const myRoutines = (s: DataState, me: User) => s.routines.filter((r) => visible(r.owner, me))
export const myTasks = (s: DataState, me: User) => s.tasks.filter((t) => visible(t.owner, me))
export const myEvents = (s: DataState, me: User) => s.events.filter((e) => visible(e.owner, me))

export const isShared = (r: Routine) => r.owner === 'both'

/** Routines that are live on a date, ordered by start time. */
export const routinesOn = (s: DataState, me: User, date: string) =>
  myRoutines(s, me)
    .filter((r) => !r.paused && isScheduled(r, date) && itemsOn(r, date).length > 0)
    .sort((a, b) => minutesOf(a.time) - minutesOf(b.time))

export const logOf = (s: DataState, r: Routine, date = logicalToday()) => s.logs[logKey(date, r.id)]

/** Progress for a shared weekly routine counts toward this week's session. */
export const sessionDate = (r: Routine, today = logicalToday()) => {
  if (isScheduled(r, today)) return today
  for (let i = 1; i < 7; i++) if (isScheduled(r, addDays(today, i))) return addDays(today, i)
  return today
}

export function dayProgress(s: DataState, me: User, date = logicalToday()) {
  let done = 0
  let total = 0
  const blocks = routinesOn(s, me, date).filter((r) => !isShared(r))
  let blocksLeft = 0
  for (const r of blocks) {
    const p = progress(r, date, logOf(s, r, date))
    done += p.done
    total += p.total
    if (p.done < p.total) blocksLeft++
  }
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0, blocksLeft, blocks }
}

/** The routine to focus on now: the latest one that has started and isn't finished, else the next one. */
export function nowRoutine(s: DataState, me: User, now = new Date()) {
  const today = logicalToday(now)
  const list = routinesOn(s, me, today).filter((r) => !isShared(r))
  const mins = nowMinutes(now) + (now.getHours() < 4 ? 1440 : 0)
  const unfinished = list.filter((r) => {
    const p = progress(r, today, logOf(s, r, today))
    return p.done < p.total
  })
  const started = unfinished.filter((r) => minutesOf(r.time) <= mins)
  const routine = started[started.length - 1] ?? unfinished[0] ?? list[list.length - 1]
  return routine ? { routine, started: minutesOf(routine.time) <= mins } : null
}

export const dueDate = (t: Task) => dateOf(t.due)
export const dueTime = (t: Task) => timeOf(t.due)

export const isOverdue = (t: Task, now = new Date()) => {
  if (t.done || !t.due) return false
  const today = logicalToday(now)
  const d = dateOf(t.due)!
  if (d < today) return true
  const tm = timeOf(t.due)
  return d === today && t.isDeadline && !!tm && minutesOf(tm) < nowMinutes(now) && now.getHours() >= 4
}

export function taskMeta(t: Task, me: User, partnerName: string, today = logicalToday()) {
  if (t.shared) return `Shared · ${!t.assignee ? 'both of you' : t.assignee === me ? 'you’re on it' : `${partnerName} is on it`}`
  if (!t.due) return 'No time set'
  const d = dateOf(t.due)!
  const tm = timeOf(t.due)
  if (!t.done && d < today) {
    const n = diffDays(today, d)
    return t.isDeadline ? `Was due ${n === 1 ? 'yesterday' : relativeDay(d, today).toLowerCase()}${tm ? ` ${tm}` : ''}` : `Overdue since ${n === 1 ? 'yesterday' : relativeDay(d, today)}`
  }
  const day = d === today ? '' : relativeDay(d, today)
  const parts = [day, tm].filter(Boolean).join(' ')
  const extra = t.isDeadline ? 'deadline' : t.remindAt ? 'reminder on' : ''
  return [parts || 'Today', extra].filter(Boolean).join(' · ')
}

export const eventsOn = (s: DataState, me: User, date: string): CalEvent[] =>
  myEvents(s, me).filter((e) => dateOf(e.start) === date).sort((a, b) => a.start.localeCompare(b.start))

export const tasksOn = (s: DataState, me: User, date: string): Task[] =>
  myTasks(s, me).filter((t) => dueDate(t) === date).sort((a, b) => (a.due ?? '').localeCompare(b.due ?? ''))

/** Consecutive past days where both people had a good day (≥60% of their items), plus today if already true. */
export function togetherRun(s: DataState) {
  const good = (user: User, date: string) => {
    const p = dayProgress(s, user, date)
    return p.total > 0 && p.done / p.total >= 0.6
  }
  const today = logicalToday()
  let n = good('leo', today) && good('soniya', today) ? 1 : 0
  for (let i = 1; i < 365; i++) {
    const d = addDays(today, -i)
    if (good('leo', d) && good('soniya', d)) n++
    else break
  }
  return n
}

export const routineMeta = (r: Routine, partnerName: string, daysText: string) => {
  const n = r.items.length
  if (r.owner === 'both') return `${daysText} · with ${partnerName} · ${n} items`
  if (r.paused) return `Paused · streak of ${r.streak.current} held`
  return `${daysText} · ${r.time.replace(/^0/, '')} · ${n} items`
}

export const weekdayOf = weekday

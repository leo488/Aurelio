import { dayProgress, tasksOn } from '../data/select'
import type { DataState } from '../data/store'
import { addDays } from './date'
import { consistency, dayOutcome, dayStreak, routineStreak, PARTIAL, type Outcome } from './streak'

// Personal performance, worked out from the records every time. Nothing here is stored.

export function leoStats(s: Pick<DataState, 'routines' | 'completions'>, today: string) {
  const overall = dayStreak(s.routines, s.completions, today)
  const day = dayProgress(s, today)
  const perRoutine = s.routines.map((r) => ({ routine: r, ...routineStreak(r, s.completions, today), month: consistency([r], s.completions, today, 30) }))
  const week: { date: string; outcome: Outcome }[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6)
    return { date, outcome: dayOutcome(s.routines, s.completions, date) }
  })
  return {
    current: overall.current,
    longest: overall.longest,
    completedDays: overall.completedDays,
    routinesCompleted: perRoutine.reduce((n, x) => n + x.completedDays, 0),
    today: { done: day.done, total: day.total, rate: day.total ? Math.round((day.done / day.total) * 100) : 0 },
    weekly: consistency(s.routines, s.completions, today, 7),
    monthly: consistency(s.routines, s.completions, today, 30),
    perRoutine,
    week,
  }
}

const goodDay = (done: number, total: number) => total > 0 && done / total >= PARTIAL

/**
 * Sonia's planning streak: days in a row where she got through at least 60% of what she planned.
 * Days with nothing planned don't count either way; today only adds once it qualifies.
 */
export function planningStreak(s: Pick<DataState, 'tasks'>, today: string) {
  const count = (d: string) => {
    const list = tasksOn(s, d)
    return { done: list.filter((t) => t.completed).length, total: list.length }
  }
  let n = 0
  for (let i = 1; i <= 365; i++) {
    const c = count(addDays(today, -i))
    if (c.total === 0) continue
    if (!goodDay(c.done, c.total)) break
    n++
  }
  const t = count(today)
  return n + (goodDay(t.done, t.total) ? 1 : 0)
}

export function soniaStats(s: Pick<DataState, 'tasks'>, today: string) {
  const todays = tasksOn(s, today)
  const todayDone = todays.filter((t) => t.completed).length
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6)
    const list = tasksOn(s, date)
    return { date, done: list.filter((t) => t.completed).length, total: list.length }
  })
  const weekDone = week.reduce((n, d) => n + d.done, 0)
  const weekTotal = week.reduce((n, d) => n + d.total, 0)
  const activeDays = new Set(s.tasks.filter((t) => t.date && t.date > addDays(today, -30) && t.date <= today).map((t) => t.date)).size
  return {
    completed: s.tasks.filter((t) => t.completed).length,
    remaining: s.tasks.filter((t) => !t.completed).length,
    today: { done: todayDone, total: todays.length, rate: todays.length ? Math.round((todayDone / todays.length) * 100) : 0 },
    week,
    weekly: { done: weekDone, total: weekTotal, rate: weekTotal ? Math.round((weekDone / weekTotal) * 100) : 0 },
    activeDays,
    plannedAhead: s.tasks.filter((t) => t.date && t.date > today && t.date <= addDays(today, 7)).length,
    streak: planningStreak(s, today),
  }
}

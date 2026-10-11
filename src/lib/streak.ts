import type { Routine, RoutineCompletion } from '../data/types'
import { addDays, weekday } from './date'

// Streaks are never stored. They are worked out from completion records, walking only the days
// each routine was actually scheduled on, so a Mon/Wed/Fri routine isn't broken by a Tuesday.
//
// Rules per scheduled day: every counted step done → +1. 60% or more → holds. Less → resets to 0
// (the longest run is kept). Skipped days, inactive periods and unscheduled days are neutral.
// Today only ever adds: it counts once it is full and can't break anything until it is over.

export type Outcome = 'full' | 'partial' | 'missed' | 'skipped' | 'none'
export type Completions = Record<string, RoutineCompletion>

export const PARTIAL = 0.6
export const MILESTONES = [7, 25, 50, 100]
export const MAX_SKIPS_PER_WEEK = 2

export const completionId = (routineId: string, date: string) => `${routineId}|${date}`
export const completionOf = (c: Completions, routineId: string, date: string): RoutineCompletion | undefined => c[completionId(routineId, date)]

/** The weekdays a routine repeated on for a given date, honouring earlier schedules. */
export const daysOn = (r: Routine, date: string) => {
  for (const past of r.scheduleHistory ?? []) if (date < past.until) return past.days
  return r.repeatPattern.days
}

export const isInactiveOn = (r: Routine, date: string) =>
  (r.inactiveRanges ?? []).some((x) => date >= x.from && (!x.to || date < x.to)) || (!r.active && !(r.inactiveRanges ?? []).some((x) => !x.to))

export const isScheduled = (r: Routine, date: string) =>
  date >= r.createdAt.slice(0, 10) && !isInactiveOn(r, date) && daysOn(r, date).includes(weekday(date))

export const stepsOn = (r: Routine, date: string) => {
  const wd = weekday(date)
  return r.steps.filter((s) => s.days.includes(wd))
}

/** The ids that decide a day: the snapshot on the record if there is one, else today's definition. */
export const requiredSteps = (r: Routine, date: string, c?: RoutineCompletion) => {
  const base = c?.requiredStepIds ?? stepsOn(r, date).filter((s) => s.countsTowardStreak).map((s) => s.id)
  return base.filter((id) => !c?.skippedStepIds?.includes(id))
}

/** Steps shown for the day with how many are ticked (all steps, counted or not). */
export const progress = (r: Routine, date: string, c?: RoutineCompletion) => {
  const steps = stepsOn(r, date)
  const done = steps.filter((s) => c?.completedStepIds.includes(s.id)).length
  return { done, total: steps.length }
}

export function outcome(r: Routine, date: string, c?: RoutineCompletion): Outcome {
  if (!isScheduled(r, date)) return 'none'
  if (c?.skipped) return 'skipped'
  const required = requiredSteps(r, date, c)
  if (required.length === 0) return 'none'
  const pct = required.filter((id) => c?.completedStepIds.includes(id)).length / required.length
  if (pct >= 1) return 'full'
  if (pct >= PARTIAL) return 'partial'
  return 'missed'
}

export const isComplete = (r: Routine, date: string, c?: RoutineCompletion) => outcome(r, date, c) === 'full'

export interface StreakBreak { value: number; date: string; done: number; total: number }
export interface RoutineStreak {
  current: number
  longest: number
  /** Scheduled days completed in full, all time. */
  completedDays: number
  lastBreak?: StreakBreak
}

// Results depend only on the routine, its records and the day, so they're cached per records object.
const cache = new WeakMap<Completions, Map<string, unknown>>()
function memo<T>(c: Completions, key: string, fn: () => T): T {
  let m = cache.get(c)
  if (!m) cache.set(c, (m = new Map()))
  if (!m.has(key)) m.set(key, fn())
  return m.get(key) as T
}

const routineKey = (r: Routine) => `${r.id}@${r.updatedAt}`

export function routineStreak(r: Routine, c: Completions, today: string): RoutineStreak {
  return memo(c, `r|${routineKey(r)}|${today}`, () => {
    let current = 0
    let longest = 0
    let completedDays = 0
    let lastBreak: StreakBreak | undefined
    for (let d = r.createdAt.slice(0, 10); d < today; d = addDays(d, 1)) {
      const rec = completionOf(c, r.id, d)
      const o = outcome(r, d, rec)
      if (o === 'full') {
        current++
        completedDays++
        longest = Math.max(longest, current)
      } else if (o === 'missed') {
        if (current > 0) {
          const required = requiredSteps(r, d, rec)
          lastBreak = { value: current, date: d, done: required.filter((id) => rec?.completedStepIds.includes(id)).length, total: required.length }
        }
        current = 0
      }
    }
    if (outcome(r, today, completionOf(c, r.id, today)) === 'full') {
      current++
      completedDays++
      longest = Math.max(longest, current)
    }
    return { current, longest, completedDays, lastBreak }
  })
}

/**
 * Leo's overall streak: a day counts when every routine scheduled that day is done (skips aside).
 * 60% of all the day's counted steps holds it; less resets it. Days with nothing scheduled are neutral.
 */
export function dayOutcome(routines: Routine[], c: Completions, date: string): Outcome {
  let required = 0
  let done = 0
  let allFull = true
  let any = false
  for (const r of routines) {
    const rec = completionOf(c, r.id, date)
    const o = outcome(r, date, rec)
    if (o === 'none' || o === 'skipped') continue
    any = true
    const ids = requiredSteps(r, date, rec)
    required += ids.length
    done += ids.filter((id) => rec?.completedStepIds.includes(id)).length
    if (o !== 'full') allFull = false
  }
  if (!any) return routines.some((r) => outcome(r, date, completionOf(c, r.id, date)) === 'skipped') ? 'skipped' : 'none'
  if (allFull) return 'full'
  return done / required >= PARTIAL ? 'partial' : 'missed'
}

export function dayStreak(routines: Routine[], c: Completions, today: string): { current: number; longest: number; completedDays: number } {
  const key = `d|${routines.map(routineKey).join(',')}|${today}`
  return memo(c, key, () => {
    const start = routines.reduce((m, r) => (r.createdAt.slice(0, 10) < m ? r.createdAt.slice(0, 10) : m), today)
    let current = 0
    let longest = 0
    let completedDays = 0
    for (let d = start; d < today; d = addDays(d, 1)) {
      const o = dayOutcome(routines, c, d)
      if (o === 'full') {
        current++
        completedDays++
        longest = Math.max(longest, current)
      } else if (o === 'missed') current = 0
    }
    if (dayOutcome(routines, c, today) === 'full') {
      current++
      completedDays++
      longest = Math.max(longest, current)
    }
    return { current, longest, completedDays }
  })
}

/** Share of scheduled routine-days in the last `days` days (before today) that were done in full. */
export function consistency(routines: Routine[], c: Completions, today: string, days: number) {
  let scheduled = 0
  let full = 0
  for (let i = 1; i <= days; i++) {
    const d = addDays(today, -i)
    for (const r of routines) {
      const o = outcome(r, d, completionOf(c, r.id, d))
      if (o === 'none' || o === 'skipped') continue
      scheduled++
      if (o === 'full') full++
    }
  }
  return scheduled ? Math.round((full / scheduled) * 100) : 0
}

export function skipsThisWeek(r: Routine, c: Completions, today: string) {
  const monday = addDays(today, -weekday(today))
  let n = 0
  for (let d = monday; d <= addDays(monday, 6); d = addDays(d, 1)) if (completionOf(c, r.id, d)?.skipped) n++
  return n
}

/** Back-fill is allowed once a week; the records say when it was last used. */
export const backfilledRecently = (c: Completions, userId: string, today: string) =>
  Object.values(c).some((x) => x.userId === userId && x.backfilled && x.updatedAt.slice(0, 10) > addDays(today, -7))

export const emberLevel = (n: number): 0 | 1 | 7 | 25 | 100 =>
  n >= 100 ? 100 : n >= 25 ? 25 : n >= 7 ? 7 : n >= 1 ? 1 : 0

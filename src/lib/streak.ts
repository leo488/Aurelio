import type { DayLog, Routine, StreakState } from '../data/types'
import { addDays, weekday } from './date'

export type Outcome = 'full' | 'partial' | 'missed' | 'skipped' | 'none'

export const FULL = 1
export const PARTIAL = 0.6
export const MILESTONES = [7, 25, 50, 100]
export const MAX_SKIPS_PER_WEEK = 2

export const logKey = (date: string, routineId: string) => `${date}|${routineId}`

export const isScheduled = (r: Routine, date: string) => r.days.includes(weekday(date))

export const itemsOn = (r: Routine, date: string) => {
  const wd = weekday(date)
  return r.items.filter((i) => i.days.includes(wd))
}

/** Items that decide the day: scheduled that day, counted, and not skipped. */
export const countedItems = (r: Routine, date: string, log?: DayLog) =>
  itemsOn(r, date).filter((i) => i.countsTowardStreak && !log?.skippedItemIds?.includes(i.id))

export const progress = (r: Routine, date: string, log?: DayLog) => {
  const items = itemsOn(r, date)
  const done = items.filter((i) => log?.doneItemIds.includes(i.id)).length
  return { done, total: items.length }
}

export function outcome(r: Routine, date: string, log?: DayLog): Outcome {
  if (!isScheduled(r, date)) return 'none'
  if (log?.skipped) return 'skipped'
  const counted = countedItems(r, date, log)
  if (counted.length === 0) return 'none'
  const pct = counted.filter((i) => log?.doneItemIds.includes(i.id)).length / counted.length
  if (pct >= FULL) return 'full'
  if (pct >= PARTIAL) return 'partial'
  return 'missed'
}

/**
 * Apply one finished day to a streak.
 * Full → +1. Partial (≥60%) → holds. Missed (<60%) → resets to 0, longest kept.
 * Skipped and unscheduled days are neutral. Paused routines are frozen by the caller.
 */
export function applyDay(streak: StreakState, o: Outcome, date: string, r: Routine, log?: DayLog): StreakState {
  if (o === 'full') {
    const current = streak.current + 1
    return { ...streak, current, longest: Math.max(streak.longest, current) }
  }
  if (o === 'missed') {
    const counted = countedItems(r, date, log)
    const done = counted.filter((i) => log?.doneItemIds.includes(i.id)).length
    if (streak.current === 0) return streak
    return { ...streak, current: 0, lastBreak: { value: streak.current, date, done, total: counted.length } }
  }
  return streak
}

/** Settle every finished day after `from` up to and including `through`. */
export function settle(r: Routine, logs: Record<string, DayLog>, from: string, through: string): StreakState {
  let s = r.streak
  if (r.paused) return s
  for (let d = addDays(from, 1); d <= through; d = addDays(d, 1)) {
    if (d < r.createdAt) continue
    const log = logs[logKey(d, r.id)]
    s = applyDay(s, outcome(r, d, log), d, r, log)
  }
  return s
}

/** The streak as the user sees it right now: today counts once it is full. */
export const liveStreak = (r: Routine, today: string, log?: DayLog) =>
  r.streak.current + (outcome(r, today, log) === 'full' ? 1 : 0)

export const emberLevel = (n: number): 0 | 1 | 7 | 25 | 100 =>
  n >= 100 ? 100 : n >= 25 ? 25 : n >= 7 ? 7 : n >= 1 ? 1 : 0

/** Share of scheduled days in the window that were full. */
export function consistency(r: Routine, logs: Record<string, DayLog>, today: string, days = 90) {
  let scheduled = 0
  let full = 0
  for (let i = 1; i <= days; i++) {
    const d = addDays(today, -i)
    if (d < r.createdAt) break
    const o = outcome(r, d, logs[logKey(d, r.id)])
    if (o === 'none' || o === 'skipped') continue
    scheduled++
    if (o === 'full') full++
  }
  return scheduled ? Math.round((full / scheduled) * 100) : 0
}

export function skipsThisWeek(r: Routine, logs: Record<string, DayLog>, today: string) {
  const monday = addDays(today, -weekday(today))
  let n = 0
  for (let d = monday; d <= addDays(monday, 6); d = addDays(d, 1)) if (logs[logKey(d, r.id)]?.skipped) n++
  return n
}

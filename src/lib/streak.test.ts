import { describe, expect, test } from 'vitest'
import type { Routine, RoutineCompletion } from '../data/types'
import { addDays } from './date'
import { completionId, consistency, dayStreak, outcome, routineStreak, type Completions } from './streak'

const ALL = [0, 1, 2, 3, 4, 5, 6]
const D = '2025-09-17' // a Wednesday

const routine = (patch: Partial<Routine> = {}): Routine => ({
  id: 'r', userId: 'leo', name: 'Morning', icon: 'sun', timeCategory: 'morning', scheduledTime: '06:30',
  repeatPattern: { type: 'weekly', days: ALL }, reminder: { enabled: true, minutesBefore: 10 }, active: true,
  createdAt: '2025-09-01', updatedAt: '1',
  steps: ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, title: id, days: ALL, countsTowardStreak: true })),
  ...patch,
})

const rec = (r: Routine, date: string, done: string[], extra: Partial<RoutineCompletion> = {}): RoutineCompletion => ({
  id: completionId(r.id, date), routineId: r.id, userId: 'leo', date, completedStepIds: done, updatedAt: '1', ...extra,
})
const records = (...cs: RoutineCompletion[]): Completions => Object.fromEntries(cs.map((c) => [c.id, c]))
const fullDays = (r: Routine, from: string, n: number) => Array.from({ length: n }, (_, i) => rec(r, addDays(from, i), ['a', 'b', 'c', 'd', 'e']))

describe('streaks come from completion records', () => {
  test('four full days in a row is a streak of four', () => {
    const r = routine({ createdAt: D })
    const c = records(...fullDays(r, D, 4))
    expect(routineStreak(r, c, addDays(D, 3))).toMatchObject({ current: 4, longest: 4, completedDays: 4 })
  })

  test('today only adds once it is full and never breaks the run', () => {
    const r = routine({ createdAt: D })
    const past = fullDays(r, D, 3)
    const today = addDays(D, 3)
    expect(routineStreak(r, records(...past), today).current).toBe(3)
    expect(routineStreak(r, records(...past, rec(r, today, ['a'])), today).current).toBe(3)
    expect(routineStreak(r, records(...past, rec(r, today, ['a', 'b', 'c', 'd', 'e'])), today).current).toBe(4)
  })

  test('60% or more holds the streak; less resets it and keeps the longest', () => {
    const r = routine({ createdAt: D })
    const c = records(...fullDays(r, D, 3), rec(r, addDays(D, 3), ['a', 'b', 'c']), rec(r, addDays(D, 4), ['a', 'b', 'c', 'd', 'e']))
    expect(routineStreak(r, c, addDays(D, 5)).current).toBe(4)
    const broken = records(...fullDays(r, D, 3), rec(r, addDays(D, 3), ['a']))
    expect(routineStreak(r, broken, addDays(D, 4))).toMatchObject({ current: 0, longest: 3, lastBreak: { value: 3, date: addDays(D, 3), done: 1, total: 5 } })
  })

  test('a day with no record at all is a miss', () => {
    const r = routine({ createdAt: D })
    const c = records(...fullDays(r, D, 2), ...fullDays(r, addDays(D, 3), 2))
    expect(routineStreak(r, c, addDays(D, 5))).toMatchObject({ current: 2, longest: 2 })
  })

  test('only scheduled days count: a Mon/Wed/Fri routine is not broken by Tuesday', () => {
    const r = routine({ createdAt: '2025-09-15', repeatPattern: { type: 'weekly', days: [0, 2, 4] }, steps: [{ id: 'a', title: 'a', days: [0, 2, 4], countsTowardStreak: true }] })
    // Mon 15, Wed 17, Fri 19, Mon 22
    const c = records(...['2025-09-15', '2025-09-17', '2025-09-19', '2025-09-22'].map((d) => rec(r, d, ['a'])))
    expect(routineStreak(r, c, '2025-09-23').current).toBe(4)
  })

  test('a deliberate skip is neutral', () => {
    const r = routine({ createdAt: D })
    const c = records(...fullDays(r, D, 2), rec(r, addDays(D, 2), [], { skipped: true }), rec(r, addDays(D, 3), ['a', 'b', 'c', 'd', 'e']))
    expect(routineStreak(r, c, addDays(D, 4)).current).toBe(3)
  })

  test('days while a routine was inactive are neutral', () => {
    const r = routine({ createdAt: D, inactiveRanges: [{ from: addDays(D, 2), to: addDays(D, 5) }] })
    const c = records(...fullDays(r, D, 2), ...fullDays(r, addDays(D, 5), 1))
    expect(routineStreak(r, c, addDays(D, 6)).current).toBe(3)
  })

  test('steps that do not count are ignored', () => {
    const r = routine()
    r.steps = r.steps.map((s) => (s.id === 'e' ? { ...s, countsTowardStreak: false } : s))
    expect(outcome(r, D, rec(r, D, ['a', 'b', 'c', 'd']))).toBe('full')
  })

  test('adding a step later does not rewrite past days', () => {
    const r = routine({ createdAt: D })
    const past = fullDays(r, D, 3).map((c) => ({ ...c, requiredStepIds: ['a', 'b', 'c', 'd', 'e'] }))
    const edited = { ...r, updatedAt: '2', steps: [...r.steps, { id: 'f', title: 'f', days: ALL, countsTowardStreak: true }] }
    expect(routineStreak(edited, records(...past), addDays(D, 3)).current).toBe(3)
  })

  test('changing the schedule keeps the old one for earlier dates', () => {
    // Was every day until the 20th, then Mondays only. The 17th–19th still count.
    const r = routine({ createdAt: D, repeatPattern: { type: 'weekly', days: [0] }, scheduleHistory: [{ until: '2025-09-20', days: ALL }] })
    r.steps = r.steps.map((s) => ({ ...s, days: ALL }))
    const c = records(...fullDays(r, D, 3), rec(r, '2025-09-22', ['a', 'b', 'c', 'd', 'e']))
    expect(routineStreak(r, c, '2025-09-23').current).toBe(4)
  })
})

describe('Leo’s overall day streak', () => {
  test('a day counts when every routine due that day is done', () => {
    const a = routine({ id: 'a', createdAt: D })
    const b = routine({ id: 'b', createdAt: D, steps: [{ id: 'x', title: 'x', days: ALL, countsTowardStreak: true }] })
    const c = records(...fullDays(a, D, 3), rec(b, D, ['x']), rec(b, addDays(D, 1), ['x']), rec(b, addDays(D, 2), ['x']))
    expect(dayStreak([a, b], c, addDays(D, 3)).current).toBe(3)
    // Day 2: b missed but a full → 5/6 steps → partial, holds without adding.
    const partial = records(...fullDays(a, D, 3), rec(b, D, ['x']), rec(b, addDays(D, 2), ['x']))
    expect(dayStreak([a, b], partial, addDays(D, 3)).current).toBe(2)
  })

  test('consistency is the share of scheduled routine-days done in full', () => {
    const r = routine({ createdAt: '2025-09-01' })
    const c = records(...fullDays(r, addDays(D, -7), 7).filter((_, i) => i % 2 === 0))
    expect(consistency([r], c, D, 7)).toBe(57)
  })
})

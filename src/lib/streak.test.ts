import { describe, expect, test } from 'vitest'
import type { DayLog, Routine } from '../data/types'
import { addDays } from './date'
import { liveStreak, logKey, outcome, settle } from './streak'

const ALL = [0, 1, 2, 3, 4, 5, 6]
const routine = (patch: Partial<Routine> = {}): Routine => ({
  id: 'r', owner: 'leo', name: 'Morning', icon: 'sun', time: '06:30', days: ALL, remind: true, paused: false, createdAt: '2025-01-01',
  items: ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, name: id, days: ALL, countsTowardStreak: true })),
  streak: { current: 10, longest: 12 }, ...patch,
})
const log = (date: string, done: string[], extra: Partial<DayLog> = {}): Record<string, DayLog> => ({ [logKey(date, 'r')]: { date, routineId: 'r', doneItemIds: done, ...extra } })
const D = '2025-09-17'

describe('streak rules', () => {
  test('a full day adds one and can set a new record', () => {
    const r = routine({ streak: { current: 12, longest: 12 } })
    expect(settle(r, log(D, ['a', 'b', 'c', 'd', 'e']), addDays(D, -1), D)).toMatchObject({ current: 13, longest: 13 })
  })
  test('60% or more holds the streak', () => {
    expect(settle(routine(), log(D, ['a', 'b', 'c']), addDays(D, -1), D).current).toBe(10)
  })
  test('under 60% resets to zero but keeps the longest and records the break', () => {
    const s = settle(routine(), log(D, ['a']), addDays(D, -1), D)
    expect(s).toMatchObject({ current: 0, longest: 12, lastBreak: { value: 10, date: D, done: 1, total: 5 } })
  })
  test('a deliberate skip is neutral', () => {
    expect(settle(routine(), log(D, [], { skipped: true }), addDays(D, -1), D).current).toBe(10)
  })
  test('a paused routine is frozen', () => {
    expect(settle(routine({ paused: true }), {}, addDays(D, -5), D).current).toBe(10)
  })
  test('items that do not count are ignored in the maths', () => {
    const r = routine()
    r.items = r.items.map((i) => (i.id === 'e' ? { ...i, countsTowardStreak: false } : i))
    expect(outcome(r, D, log(D, ['a', 'b', 'c', 'd'])[logKey(D, 'r')])).toBe('full')
  })
  test('unscheduled days do not touch the streak', () => {
    const r = routine({ days: [0] }) // Mondays only; 17 Sep 2025 is a Wednesday
    expect(settle(r, {}, addDays(D, -1), D).current).toBe(10)
  })
  test('today counts toward the live number once it is full', () => {
    const r = routine()
    expect(liveStreak(r, D, log(D, ['a', 'b', 'c', 'd', 'e'])[logKey(D, 'r')])).toBe(11)
    expect(liveStreak(r, D, log(D, ['a'])[logKey(D, 'r')])).toBe(10)
  })
})

import { describe, expect, it } from 'vitest'
import type { TrackItem } from '../data/types'
import { mondayOf } from './date'
import { checkId, dayScore, itemsForWeek, level, trackStreak, trackWeekNumber, weekSummary } from './track'

const item = (id: string, startWeek = '2026-W44', endWeek?: string): TrackItem => ({ id, userId: 'leo', title: id, slot: 'day', position: 0, startWeek, endWeek, createdAt: '2026-10-26T00:00:00Z', updatedAt: '' })
const items = [item('a'), item('b'), item('c'), item('d', '2026-W44', '2026-W44')]

describe('weekly tracker', () => {
  it('finds a week’s Monday from its key', () => {
    expect(mondayOf('2026-W44')).toBe('2026-10-26')
    expect(mondayOf('2027-W01')).toBe('2027-01-04')
  })
  it('keeps removed items in the weeks they were on', () => {
    expect(itemsForWeek(items, '2026-W44').length).toBe(4)
    expect(itemsForWeek(items, '2026-W45').map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })
  it('counts part of a day', () => {
    const checked = new Set([checkId('a', '2026-10-27')])
    expect(dayScore(items, checked, '2026-10-27')).toMatchObject({ done: 1, total: 4 })
    expect(level(1, 4)).toBe(1)
    expect(level(2, 4)).toBe(2)
    expect(level(3, 4)).toBe(3)
    expect(level(4, 4)).toBe(4)
    expect(level(0, 4)).toBe(0)
  })
  it('keeps the streak on any tick, and today never breaks it', () => {
    const checked = new Set([checkId('a', '2026-10-26'), checkId('b', '2026-10-27'), checkId('c', '2026-10-28')])
    expect(trackStreak(items, checked, '2026-10-28').current).toBe(3)
    expect(trackStreak(items, checked, '2026-10-29').current).toBe(3)
    expect(trackStreak(items, checked, '2026-10-30').current).toBe(0)
    expect(trackStreak(items, checked, '2026-10-30').longest).toBe(3)
  })
  it('numbers weeks from the first one', () => {
    expect(trackWeekNumber('2026-W44', '2026-W44')).toBe(1)
    expect(trackWeekNumber('2026-W44', '2026-W46')).toBe(3)
    expect(trackWeekNumber('2026-W53', '2027-W01')).toBe(2)
  })
  it('sums a week without future days', () => {
    const checked = new Set([checkId('a', '2026-10-26'), checkId('b', '2026-10-26')])
    const w = weekSummary(items, checked, '2026-W44', '2026-10-27')
    expect(w.total).toBe(8)
    expect(w.done).toBe(2)
  })
})

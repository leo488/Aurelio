import { describe, expect, it } from 'vitest'
import { defaultSettings, seed } from '../data/seed'
import type { TrackItem } from '../data/types'
import { plannedPushes } from './pushSchedule'

const now = new Date('2026-10-12T07:00:00')
const data = seed(now)
const leo = data.profiles.find((p) => p.role === 'leo')!
const items: TrackItem[] = ['a', 'b'].map((id, i) => ({ id, userId: leo.id, title: id, slot: 'day', position: i, startWeek: '2026-W42', createdAt: '', updatedAt: '' }))
const state = (userId: string) => ({ trackItems: items, trackChecks: {}, journal: [], tasks: data.tasks, settings: defaultSettings(userId, now) })

describe('plannedPushes', () => {
  it('plans only future pushes outside quiet hours', () => {
    const plan = plannedPushes(state(leo.id), leo, now)
    expect(plan.length).toBeGreaterThan(0)
    for (const p of plan) {
      expect(p.fireAt.getTime()).toBeGreaterThan(now.getTime())
      const mins = p.fireAt.getHours() * 60 + p.fireAt.getMinutes()
      expect(mins >= 22 * 60 + 30 || mins < 6 * 60 + 15).toBe(false)
    }
  })

  it('uses unique keys and plans the evening check-in and journal question', () => {
    const plan = plannedPushes(state(leo.id), leo, now)
    expect(new Set(plan.map((p) => p.key)).size).toBe(plan.length)
    expect(plan.find((p) => p.key === 'catchup|2026-10-12')?.title).toBe('2 left on today’s list')
    expect(plan.find((p) => p.key === 'journal|2026-10-12')?.fireAt.getHours()).toBe(21)
  })

  it('plans nothing without settings', () => {
    expect(plannedPushes({ ...state(leo.id), settings: null }, leo, now)).toEqual([])
  })
})

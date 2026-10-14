import { describe, expect, it } from 'vitest'
import { defaultSettings, seed } from '../data/seed'
import { plannedPushes } from './pushSchedule'

const now = new Date('2026-10-12T07:00:00')
const data = seed(now)
const leo = data.profiles.find((p) => p.role === 'leo')!
const state = (userId: string) => ({ routines: data.routines, completions: Object.fromEntries(data.completions.map((c) => [c.id, c])), tasks: data.tasks, settings: defaultSettings(userId, now) })

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

  it('uses unique keys and includes the 09:30 deep work reminder', () => {
    const plan = plannedPushes(state(leo.id), leo, now)
    expect(new Set(plan.map((p) => p.key)).size).toBe(plan.length)
    const deep = plan.find((p) => p.key === 'routine|leo-deep|2026-10-12')
    expect(deep?.fireAt.getHours()).toBe(9)
    expect(deep?.fireAt.getMinutes()).toBe(20)
  })

  it('plans nothing without settings', () => {
    expect(plannedPushes({ ...state(leo.id), settings: null }, leo, now)).toEqual([])
  })
})

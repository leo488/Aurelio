import { describe, expect, test } from 'vitest'
import type { Task } from '../data/types'
import { addDays } from './date'
import { planningStreak, soniaStats } from './stats'

const T = '2025-09-17'
let n = 0
const task = (date: string | undefined, completed: boolean, extra: Partial<Task> = {}): Task => ({
  id: `t${n++}`, userId: 'sonia', title: 'x', date, priority: 'medium', completed, createdAt: '1', updatedAt: '1', ...extra,
})

describe('Soniya’s performance', () => {
  test('planning streak counts days with 60%+ done and skips empty days', () => {
    const tasks = [
      task(addDays(T, -1), true), task(addDays(T, -1), true),
      // -2 is empty
      task(addDays(T, -3), true), task(addDays(T, -3), true), task(addDays(T, -3), false),
      task(addDays(T, -4), false), task(addDays(T, -4), false),
    ]
    expect(planningStreak({ tasks }, T)).toBe(2)
    expect(planningStreak({ tasks: [...tasks, task(T, true)] }, T)).toBe(3)
  })

  test('today, remaining and the week come from the task records', () => {
    const tasks = [task(T, true), task(T, false), task(addDays(T, 2), false), task(undefined, false), task(addDays(T, -3), true)]
    const s = soniaStats({ tasks }, T)
    expect(s.today).toEqual({ done: 1, total: 2, rate: 50 })
    expect(s.completed).toBe(2)
    expect(s.remaining).toBe(3)
    expect(s.weekly).toEqual({ done: 2, total: 3, rate: 67 })
    expect(s.plannedAhead).toBe(1)
  })
})

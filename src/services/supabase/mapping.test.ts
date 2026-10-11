import { expect, test } from 'vitest'
import { fromRow, toRow } from './supabaseBackend'

test('records map to snake_case rows and back, with nested values left alone', () => {
  const routine = { id: 'r1', userId: 'u', timeCategory: 'morning', repeatPattern: { type: 'weekly', days: [0, 1] }, description: undefined, updatedAt: '2026-10-11T10:00:00.000Z' }
  const row = toRow(routine)
  expect(row).toEqual({ id: 'r1', user_id: 'u', time_category: 'morning', repeat_pattern: { type: 'weekly', days: [0, 1] }, description: null, updated_at: '2026-10-11T10:00:00.000Z' })
  const back = fromRow('routines', { ...row, updated_at: '2026-10-11T10:00:00+00:00' })
  expect(back).toEqual({ id: 'r1', userId: 'u', timeCategory: 'morning', repeatPattern: { type: 'weekly', days: [0, 1] }, updatedAt: '2026-10-11T10:00:00.000Z' })
})

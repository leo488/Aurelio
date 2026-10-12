import { expect, test } from 'vitest'
import { isoWeek } from './date'
test('iso weeks', () => {
  expect(isoWeek('2026-10-12')).toEqual({ week: 42, of: 53, year: 2026 })
  expect(isoWeek('2026-01-01')).toMatchObject({ week: 1, year: 2026 })
  expect(isoWeek('2027-01-01')).toMatchObject({ week: 53, year: 2026 })
  expect(isoWeek('2025-12-29')).toMatchObject({ week: 1, year: 2026 })
  expect(isoWeek('2024-12-30')).toMatchObject({ week: 1, year: 2025, of: 52 })
  expect(isoWeek('2021-01-03')).toMatchObject({ week: 53, year: 2020 })
})

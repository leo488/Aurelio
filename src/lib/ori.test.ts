import { describe, expect, test } from 'vitest'
import { parseLocal } from './ori'

// Wednesday 17 September 2025, 07:00.
const ctx = { today: '2025-09-17', now: new Date(2025, 8, 17, 7, 0), routines: [{ id: 'leo-morning', name: 'Morning' }], names: ['Leo', 'Soniya'] }

describe('Ori local parser', () => {
  test('the prototype request becomes a class, a reminder and a deadline', () => {
    const items = parseLocal('Tomorrow I have class from nine to twelve, remind me at four to work on my assignment, and it’s due Friday', ctx)
    expect(items.map((i) => i.type)).toEqual(['event', 'task', 'deadline'])
    expect(items[0]).toMatchObject({ title: 'Class', start: '2025-09-18T09:00', end: '2025-09-18T12:00' })
    expect(items[1]).toMatchObject({ title: 'Work on assignment', due: '2025-09-18T16:00', remindAt: '2025-09-18T16:00' })
    expect(items[2]).toMatchObject({ title: 'Assignment due', due: '2025-09-19T23:59' })
  })

  test('a lunch with a name and a time', () => {
    const [lunch] = parseLocal('lunch with soniya on saturday at 1pm', ctx)
    expect(lunch).toMatchObject({ type: 'event', title: 'Lunch with Soniya', start: '2025-09-20T13:00' })
  })

  test('a routine edit applies to the named routine', () => {
    expect(parseLocal('move morning to 7am', ctx)).toEqual([{ type: 'routineEdit', routineId: 'leo-morning', time: '07:00', title: 'Morning starts at 7:00' }])
  })

  test('nothing to do yields no items', () => {
    expect(parseLocal('um', ctx)).toEqual([])
  })
})

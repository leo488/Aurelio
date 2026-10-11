import { describe, expect, test } from 'vitest'
import { localDraft, validateDraft } from './routineDraft'

describe('AI routine drafts', () => {
  test('the documented shape maps straight onto the routine schema', () => {
    const d = validateDraft({ name: 'Morning Routine', timeCategory: 'morning', duration: 30, steps: [{ title: 'Drink water', duration: 2 }, { title: 'Stretch', duration: 5 }] })
    expect(d).toMatchObject({ name: 'Morning Routine', timeCategory: 'morning', duration: 30, steps: [{ title: 'Drink water', duration: 2 }, { title: 'Stretch', duration: 5 }] })
  })

  test('bad input is cleaned or rejected, never passed through', () => {
    expect(() => validateDraft({ name: '', steps: [] })).toThrow()
    expect(() => validateDraft({ name: 'X', steps: [] })).toThrow()
    const d = validateDraft({ name: 'x', timeCategory: 'brunch', scheduledTime: 'soon', days: [1, 9, 1], steps: ['walk', { title: 'run', duration: -4 }, { nope: 1 }] })
    expect(d).toMatchObject({ name: 'X', timeCategory: 'custom', scheduledTime: undefined, days: [1], steps: [{ title: 'Walk' }, { title: 'Run', duration: undefined }] })
  })

  test('the offline generator fits the time asked for', () => {
    const d = localDraft('Create a 30-minute morning routine for me')
    expect(d.timeCategory).toBe('morning')
    expect(d.steps.reduce((n, s) => n + (s.duration ?? 0), 0)).toBe(30)
    expect(localDraft('a 45 minute workout').name).toBe('Workout')
  })
})

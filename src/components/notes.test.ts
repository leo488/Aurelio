import { describe, expect, it } from 'vitest'
import { checklist, toggleLine } from './notes'

describe('note checklists', () => {
  const body = 'Career\n- [ ] Finish the site\n- [x] Call the client\n- a plain bullet'
  it('counts every list line as a goal', () => expect(checklist(body)).toEqual({ done: 1, total: 3 }))
  it('ticks and unticks one line', () => {
    expect(toggleLine(body, 1).split('\n')[1]).toBe('- [x] Finish the site')
    expect(toggleLine(body, 2).split('\n')[2]).toBe('- [ ] Call the client')
  })
  it('ticks a plain bullet', () => expect(toggleLine(body, 3).split('\n')[3]).toBe('- [x] a plain bullet'))
  it('has no goals without a list', () => expect(checklist('just text\nmore text')).toBeNull())
})

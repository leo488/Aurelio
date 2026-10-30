import { describe, expect, it } from 'vitest'
import { checklist, toggleLine } from './notes'

describe('note checklists', () => {
  const body = 'Career\n- [ ] Finish the site\n- [x] Call the client\n- a plain bullet'
  it('counts the boxes', () => expect(checklist(body)).toEqual({ done: 1, total: 2 }))
  it('ticks and unticks one line', () => {
    expect(toggleLine(body, 1).split('\n')[1]).toBe('- [x] Finish the site')
    expect(toggleLine(body, 2).split('\n')[2]).toBe('- [ ] Call the client')
  })
  it('has no checklist without boxes', () => expect(checklist('just text\n- a bullet')).toBeNull())
})

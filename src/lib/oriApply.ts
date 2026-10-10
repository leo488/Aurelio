import { useData } from '../data/store'
import type { User } from '../data/types'
import { dateOf, logicalToday } from './date'
import type { OriItem } from './ori'

/** Save Ori's items; returns an undo that removes exactly what was created. */
export function applyOriItems(items: OriItem[], me: User): () => void {
  const s = useData.getState()
  const undo: (() => void)[] = []
  for (const i of items) {
    if (i.type === 'event' && i.start) {
      const e = s.addEvent({ owner: me, title: i.title, start: i.start, end: i.end ?? i.start })
      undo.push(() => useData.getState().removeEvent(e.id))
    } else if (i.type === 'routineEdit' && i.routineId && i.time) {
      const before = s.routines.find((r) => r.id === i.routineId)?.time
      s.updateRoutine(i.routineId, { time: i.time })
      undo.push(() => before && useData.getState().updateRoutine(i.routineId!, { time: before }))
    } else {
      const t = s.addTask({
        owner: me, title: i.title, due: i.due, remindAt: i.remindAt, isDeadline: i.type === 'deadline',
        priority: i.type === 'deadline' ? 'high' : 'med', shared: false,
      })
      undo.push(() => useData.getState().removeTask(t.id))
    }
  }
  return () => undo.forEach((u) => u())
}

export const firstDate = (items: OriItem[]) => dateOf(items.find((i) => i.start || i.due)?.start ?? items.find((i) => i.due)?.due) ?? logicalToday()

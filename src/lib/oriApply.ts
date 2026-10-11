import { useData } from '../data/store'
import { dateOf, logicalToday, timeOf } from './date'
import type { OriItem } from './ori'

/** Save Ori's items through the store; returns an undo that removes exactly what was created. */
export function applyOriItems(items: OriItem[]): () => void {
  const s = useData.getState()
  const undo: (() => void)[] = []
  for (const i of items) {
    if (i.type === 'routineEdit' && i.routineId && i.time) {
      const before = s.routines.find((r) => r.id === i.routineId)?.scheduledTime
      s.updateRoutine(i.routineId, { scheduledTime: i.time })
      undo.push(() => useData.getState().updateRoutine(i.routineId!, { scheduledTime: before }))
      continue
    }
    // Events become timed tasks on the planner; deadlines and reminders keep their own fields.
    const when = i.type === 'event' ? i.start : i.due
    const t = s.addTask({
      title: i.title, date: dateOf(when), startTime: timeOf(when), endTime: i.type === 'event' ? timeOf(i.end) : undefined,
      deadline: i.type === 'deadline', reminderAt: i.remindAt, priority: i.type === 'deadline' ? 'high' : 'medium',
    })
    undo.push(() => useData.getState().removeTask(t.id))
  }
  return () => undo.forEach((u) => u())
}

export const firstDate = (items: OriItem[]) => dateOf(items.find((i) => i.start || i.due)?.start ?? items.find((i) => i.due)?.due) ?? logicalToday()

/** "Create a 30-minute morning routine" is a routine request, not a task. */
export const isRoutineRequest = (text: string) => /\b(create|make|build|design|plan|give me|set up)\b.*\broutine\b/i.test(text)

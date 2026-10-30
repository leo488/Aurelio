import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusButton, ScreenHeader, TaskSheet, TaskWhenRow } from '../components/ui'
import { byTime } from '../data/select'
import { useData } from '../data/store'
import type { Task } from '../data/types'
import { addDays, logicalToday } from '../lib/date'

/** Everything ahead, grouped by when: overdue, today, tomorrow, this week, later and someday. */
export function Tasks() {
  const data = useData()
  const navigate = useNavigate()
  const [open, setOpen] = useState<string | null>(null)
  const today = logicalToday()
  const tomorrow = addDays(today, 1)
  const week = addDays(today, 6)

  const sections: [string, (t: Task) => boolean][] = [
    ['Overdue', (t) => !!t.date && t.date < today && !t.completed],
    ['Today', (t) => t.date === today],
    ['Tomorrow', (t) => t.date === tomorrow],
    ['This week', (t) => !!t.date && t.date > tomorrow && t.date <= week],
    ['Later', (t) => !!t.date && t.date > week],
    ['Someday', (t) => !t.date && !t.completed],
  ]
  const groups = sections
    .map(([label, f]) => ({ label, rows: data.tasks.filter(f).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || byTime(a, b)) }))
    .filter((g) => g.rows.length)

  return (
    <main className="screen">
      <ScreenHeader title="Upcoming" right={<PlusButton label="New task" onClick={() => navigate(`/tasks/new?date=${today}`)} />} />
      <div className="pad" style={{ paddingTop: 14 }}>
        {groups.length === 0 && <div style={{ fontSize: 14, color: 'var(--muted-2)', paddingTop: 16 }}>Nothing ahead. Tap + or ask Ori.</div>}
        {groups.map((g) => (
          <div key={g.label} style={{ marginTop: 16 }}>
            <div className="label" style={g.label === 'Overdue' ? { color: 'var(--clay)' } : undefined}>{g.label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 2 }}>
              {g.rows.map((t) => <TaskWhenRow key={t.id} task={t} onOpen={setOpen} />)}
            </div>
          </div>
        ))}
      </div>
      <TaskSheet taskId={open} onClose={() => setOpen(null)} />
    </main>
  )
}

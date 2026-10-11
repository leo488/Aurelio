import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Chip } from '../components/controls'
import { Icon } from '../components/Icon'
import { TaskRow } from '../components/tasks'
import { byTime, overdueTasks, somedayTasks, tasksOn, upcomingTasks } from '../data/select'
import { useData } from '../data/store'
import { logicalToday } from '../lib/date'

type View = 'Open' | 'Done'

/** Every task in one list: overdue, today, upcoming and someday. */
export function Tasks() {
  const data = useData()
  const [view, setView] = useState<View>('Open')
  const today = logicalToday()

  const sections: [string, ReturnType<typeof tasksOn>][] = view === 'Open'
    ? [
        ['Overdue', overdueTasks(data, today)],
        ['Today', tasksOn(data, today).filter((t) => !t.completed)],
        ['Upcoming', upcomingTasks(data, today, 365).filter((t) => !t.completed)],
        ['Someday', somedayTasks(data).filter((t) => !t.completed)],
      ]
    : [['Completed', data.tasks.filter((t) => t.completed).sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '') || byTime(a, b)).slice(0, 50)]]

  const empty = sections.every(([, l]) => l.length === 0)

  return (
    <main className="screen">
      <div className="pad top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 className="title">Tasks</h1>
        <Link to="/tasks/new" aria-label="New task" style={{ padding: 4, lineHeight: 0 }}>
          <Icon name="plus" size={24} stroke={1.9} />
        </Link>
      </div>
      <div className="pad" style={{ paddingTop: 18, display: 'flex', gap: 8 }}>
        {(['Open', 'Done'] as View[]).map((v) => <Chip key={v} active={view === v} onClick={() => setView(v)}>{v}</Chip>)}
      </div>
      {empty && <div className="pad" style={{ fontSize: 14, color: 'var(--muted-2)', paddingTop: 20 }}>{view === 'Open' ? 'Nothing open. Tap + or ask Ori.' : 'Nothing completed yet.'}</div>}
      {sections.filter(([, l]) => l.length).map(([label, list]) => (
        <div key={label} className="pad" style={{ paddingTop: 20 }}>
          <div className="label" style={label === 'Overdue' ? { color: 'var(--clay)' } : undefined}>{label}</div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 2 }}>
            {list.map((t) => <TaskRow key={t.id} task={t} showDate={label !== 'Today'} />)}
          </div>
        </div>
      ))}
    </main>
  )
}

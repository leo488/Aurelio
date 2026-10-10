import { Link } from 'react-router-dom'
import { Check } from '../components/controls'
import { Icon } from '../components/Icon'
import { useMe } from '../data/session'
import { isOverdue, myTasks, taskMeta } from '../data/select'
import { useData } from '../data/store'
import type { Task } from '../data/types'

const rank = (t: Task) => (t.done ? 3 : isOverdue(t) ? 0 : t.due ? 1 : 2)

export function Tasks() {
  const data = useData()
  const { me, partnerName } = useMe()
  const tasks = [...myTasks(data, me)].sort((a, b) => rank(a) - rank(b) || (a.due ?? '').localeCompare(b.due ?? '') || Number(a.shared) - Number(b.shared))

  return (
    <main className="screen">
      <div className="pad top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 className="title">Tasks</h1>
        <Link to="/tasks/new" aria-label="New task" style={{ padding: 4, lineHeight: 0 }}>
          <Icon name="plus" size={24} stroke={1.9} />
        </Link>
      </div>
      <div className="pad" style={{ paddingTop: 20, display: 'flex', flexDirection: 'column' }}>
        {tasks.length === 0 && <div style={{ fontSize: 14, color: 'var(--muted-2)', padding: '20px 0' }}>No tasks. Tap + or ask Ori.</div>}
        {tasks.map((t) => {
          const overdue = isOverdue(t)
          return (
            <button key={t.id} type="button" onClick={() => data.toggleTask(t.id)} aria-pressed={t.done}
              style={{ display: 'flex', gap: 13, alignItems: 'flex-start', padding: '16px 0', borderBottom: '1px solid var(--divider)', width: '100%', textAlign: 'left' }}>
              <Check done={t.done} overdue={overdue} style={{ marginTop: 1 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15.5, ...(t.done ? { color: 'var(--muted-4)', textDecoration: 'line-through' } : { fontWeight: 700 }) }}>{t.title}</div>
                <div style={{ fontSize: 12.5, marginTop: 3, ...(overdue ? { color: 'var(--clay)', fontWeight: 700 } : { color: 'var(--muted-2)' }) }}>{taskMeta(t, me, partnerName)}</div>
              </div>
              {!t.done && t.priority === 'high' && (
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--clay)', background: 'var(--clay-badge)', padding: '4px 9px', borderRadius: 99 }}>High</div>
              )}
            </button>
          )
        })}
      </div>
    </main>
  )
}

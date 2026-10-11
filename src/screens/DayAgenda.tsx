import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { BackButton } from '../components/controls'
import { Icon } from '../components/Icon'
import { QuickAdd, Timeline } from '../components/tasks'
import { tasksOn } from '../data/select'
import { useData } from '../data/store'
import { monthDay, weekday, WEEKDAY_LONG } from '../lib/date'

/** One day as a timeline. */
export function DayAgenda() {
  const { day = '' } = useParams()
  const data = useData()
  const navigate = useNavigate()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return <Navigate to="/calendar" replace />
  const list = tasksOn(data, day)
  const done = list.filter((t) => t.completed).length

  return (
    <main className="screen">
      <div className="pad top-12" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackButton onClick={() => navigate(`/calendar?d=${day}&m=${day.slice(0, 7)}`)} />
        <div style={{ fontSize: 14, fontWeight: 800 }}>{WEEKDAY_LONG[weekday(day)]}, {monthDay(day)}</div>
        <button type="button" aria-label="Add a task" onClick={() => navigate(`/tasks/new?date=${day}`)} style={{ lineHeight: 0 }}>
          <Icon name="plus" size={21} color="#A97C34" stroke={2} />
        </button>
      </div>
      <div className="pad" style={{ paddingTop: 18 }}>
        <div className="meta" style={{ marginBottom: 14 }}>{list.length ? `${done} of ${list.length} done` : 'Nothing on this day yet.'}</div>
        <Timeline tasks={list} empty="" />
        <div style={{ marginTop: 16 }}><QuickAdd date={day} /></div>
      </div>
    </main>
  )
}

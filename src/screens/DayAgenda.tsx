import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { BackButton, Check } from '../components/controls'
import { Icon } from '../components/Icon'
import { useMe } from '../data/session'
import { eventsOn, routinesOn, tasksOn } from '../data/select'
import { useData } from '../data/store'
import { logicalToday, looseTime, minutesOf, monthDay, nowMinutes, timeOf } from '../lib/date'
import { logKey, progress } from '../lib/streak'

type Block = { key: string; time: string; sort: number; node: React.ReactNode }

export function DayAgenda() {
  const { day = '' } = useParams()
  const data = useData()
  const { me, partner, partnerName } = useMe()
  const navigate = useNavigate()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return <Navigate to="/calendar" replace />
  const today = logicalToday()
  const started = (time: string) => day < today || (day === today && minutesOf(time) <= nowMinutes())

  const blocks: Block[] = []
  for (const r of routinesOn(data, me, day)) {
    const p = progress(r, day, data.logs[logKey(day, r.id)])
    const live = started(r.time)
    blocks.push({
      key: r.id, time: r.time, sort: minutesOf(r.time),
      node: (
        <button type="button" onClick={() => navigate(`/routines/${r.id}`)} style={{ width: '100%', textAlign: 'left', background: live ? '#F1E7D5' : 'var(--chip-alt-2)', borderRadius: 16, padding: '13px 15px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: live ? undefined : 'var(--chip-text)' }}>{r.name} routine</div>
            <div style={{ fontSize: 12, fontWeight: live ? 800 : 700, color: live ? 'var(--olive)' : 'var(--muted-3)' }}>{p.done}/{p.total}</div>
          </div>
          {live && <div style={{ fontSize: 12, color: 'var(--shared-text-2)', marginTop: 2 }}>Started {looseTime(r.time)}</div>}
        </button>
      ),
    })
  }
  for (const e of eventsOn(data, me, day)) {
    const t = timeOf(e.start)!
    blocks.push({
      key: e.id, time: t, sort: minutesOf(t),
      node: (
        <div style={{ background: '#fff', borderLeft: `3px solid ${e.shared ? 'var(--gold)' : 'var(--iris)'}`, borderRadius: 16, padding: '13px 15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            {e.shared && <Avatar user={partner} size={18} />}
            <div style={{ fontSize: 14.5, fontWeight: 800 }}>{e.shared ? `${e.title} with ${partnerName}` : e.title}</div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted-2)', marginTop: 2 }}>
            {e.shared ? `${t} · shared` : [`${t} – ${timeOf(e.end)}`, e.location].filter(Boolean).join(' · ')}
          </div>
        </div>
      ),
    })
  }
  for (const task of tasksOn(data, me, day)) {
    const t = timeOf(task.due) ?? '23:59'
    const meta = [
      task.durationMin ? (task.durationMin % 60 === 0 ? `${task.durationMin / 60} hour${task.durationMin === 60 ? '' : 's'}` : `${task.durationMin} min`) : '',
      task.isDeadline ? `Deadline · ${t}` : '',
      task.notes ?? '',
    ].filter(Boolean).join(' · ')
    blocks.push({
      key: task.id, time: timeOf(task.due) ?? '—', sort: minutesOf(t),
      node: (
        <button type="button" onClick={() => data.toggleTask(task.id)} aria-pressed={task.done}
          style={{ width: '100%', textAlign: 'left', background: '#fff', borderRadius: 16, padding: '13px 15px', display: 'flex', gap: 12, alignItems: 'center', borderLeft: task.isDeadline ? '3px solid var(--clay)' : undefined }}>
          <Check done={task.done} />
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 800, ...(task.done ? { color: 'var(--muted-4)', textDecoration: 'line-through' } : {}) }}>{task.title}</div>
            {meta && <div style={{ fontSize: 12, color: 'var(--muted-2)', marginTop: 2 }}>{meta}</div>}
          </div>
        </button>
      ),
    })
  }
  blocks.sort((a, b) => a.sort - b.sort)

  return (
    <main className="screen">
      <div className="pad top-12" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackButton onClick={() => navigate(`/calendar?d=${day}&m=${day.slice(0, 7)}`)} />
        <div style={{ fontSize: 14, fontWeight: 800 }}>{monthDay(day)}</div>
        <button type="button" aria-label="Add a task" onClick={() => navigate(`/tasks/new?date=${day}`)} style={{ lineHeight: 0 }}>
          <Icon name="plus" size={21} color="#A97C34" stroke={2} />
        </button>
      </div>
      <div className="pad" style={{ paddingTop: 22, display: 'flex', flexDirection: 'column' }}>
        {blocks.length === 0 && <div style={{ fontSize: 14, color: 'var(--muted-2)', padding: '20px 0' }}>Nothing on this day yet.</div>}
        {blocks.map((b, i) => (
          <div key={b.key} style={{ display: 'flex', gap: 14 }}>
            <div style={{ width: 44, fontSize: 12, color: 'var(--muted-3)', fontWeight: 800, paddingTop: 2, flex: '0 0 auto' }}>{b.time === '—' ? '' : looseTime(b.time)}</div>
            <div style={{ flex: 1, padding: i === blocks.length - 1 ? '0 0 0 14px' : '0 0 16px 14px', borderLeft: '1px solid var(--divider)' }}>{b.node}</div>
          </div>
        ))}
      </div>
    </main>
  )
}

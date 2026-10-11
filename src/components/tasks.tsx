import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isOverdue, taskMeta, timeRange } from '../data/select'
import { useData } from '../data/store'
import type { Task } from '../data/types'
import { hhmm, logicalToday, looseTime, minutesOf } from '../lib/date'
import { capitalize } from '../lib/words'
import { Check } from './controls'
import { flash } from './Toast'

const durationText = (t: Task) => {
  if (!t.startTime || !t.endTime) return ''
  const m = minutesOf(t.endTime) - minutesOf(t.startTime)
  return m <= 0 ? '' : m % 60 === 0 ? `${m / 60} hour${m === 60 ? '' : 's'}` : m > 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`
}

/** One task in a divided list: tick on the left, tap the text to edit. */
export function TaskRow({ task: t, showDate = true }: { task: Task; showDate?: boolean }) {
  const toggle = useData((s) => s.toggleTask)
  const today = logicalToday()
  const overdue = isOverdue(t, today)
  const meta = showDate ? taskMeta(t, today) : [timeRange(t) || 'Any time', t.deadline ? 'deadline' : t.reminderAt ? 'reminder on' : ''].filter(Boolean).join(' · ')
  return (
    <div className="list-row" style={{ alignItems: 'flex-start', padding: '15px 0' }}>
      <button type="button" aria-label={`${t.completed ? 'Mark not done' : 'Complete'}: ${t.title}`} aria-pressed={t.completed} onClick={() => toggle(t.id)} style={{ lineHeight: 0, marginTop: 1 }}>
        <Check done={t.completed} overdue={overdue} />
      </button>
      <Link to={`/tasks/${t.id}`} style={{ flex: 1, color: 'inherit' }}>
        <div style={{ fontSize: 15.5, ...(t.completed ? { color: 'var(--muted-4)', textDecoration: 'line-through' } : { fontWeight: 700 }) }}>{t.title}</div>
        <div style={{ fontSize: 12.5, marginTop: 3, ...(overdue ? { color: 'var(--clay)', fontWeight: 700 } : { color: 'var(--muted-2)' }) }}>{meta}</div>
      </Link>
      {!t.completed && t.priority === 'high' && <PriorityBadge />}
    </div>
  )
}

export const PriorityBadge = () => (
  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--clay)', background: 'var(--clay-badge)', padding: '4px 9px', borderRadius: 99, alignSelf: 'center' }}>High</div>
)

/** A day as a timeline: times down the left, tasks as cards. Untimed tasks follow under "Any time". */
export function Timeline({ tasks, empty }: { tasks: Task[]; empty: string }) {
  const toggle = useData((s) => s.toggleTask)
  const navigate = useNavigate()
  if (tasks.length === 0) return <div style={{ fontSize: 14, color: 'var(--muted-2)', padding: '14px 0' }}>{empty}</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {tasks.map((t, i) => {
        const meta = [durationText(t), t.deadline ? 'Deadline' : '', t.notes ?? ''].filter(Boolean).join(' · ')
        const accent = t.deadline ? 'var(--clay)' : t.endTime ? 'var(--iris)' : 'var(--gold)'
        return (
          <div key={t.id} style={{ display: 'flex', gap: 14 }}>
            <div style={{ width: 44, fontSize: 12, color: 'var(--muted-3)', fontWeight: 800, paddingTop: 15, flex: '0 0 auto' }}>{t.startTime ? looseTime(t.startTime) : i === 0 || tasks[i - 1].startTime ? 'Any' : ''}</div>
            <div style={{ flex: 1, padding: i === tasks.length - 1 ? '0 0 0 14px' : '0 0 12px 14px', borderLeft: '1px solid var(--divider)' }}>
              <div style={{ background: '#fff', borderRadius: 16, padding: '13px 15px', display: 'flex', gap: 12, alignItems: 'center', borderLeft: `3px solid ${accent}`, opacity: t.completed ? 0.6 : 1 }}>
                <button type="button" aria-label={`${t.completed ? 'Mark not done' : 'Complete'}: ${t.title}`} aria-pressed={t.completed} onClick={() => toggle(t.id)} style={{ lineHeight: 0 }}>
                  <Check done={t.completed} />
                </button>
                <button type="button" onClick={() => navigate(`/tasks/${t.id}`)} style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800, ...(t.completed ? { color: 'var(--muted-4)', textDecoration: 'line-through' } : {}) }}>{t.title}</div>
                  {meta && <div style={{ fontSize: 12, color: 'var(--muted-2)', marginTop: 2 }}>{meta}</div>}
                </button>
                {!t.completed && t.priority === 'high' && <PriorityBadge />}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** "Call Mum 18:00", "Send proposal at 11:30", "Gym at 6pm" → title and time. */
export function parseQuickTask(text: string): { title: string; startTime?: string } {
  const s = text.trim()
  const m = s.match(/^(.*?)\s*(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (m && m[1] && (m[3] || m[4] || /\bat\s+\d/i.test(s))) {
    let h = Number(m[2])
    const min = Number(m[3] ?? 0)
    const ampm = m[4]?.toLowerCase()
    if (ampm === 'pm' && h < 12) h += 12
    if (ampm === 'am' && h === 12) h = 0
    if (h < 24 && min < 60) return { title: capitalize(m[1].trim()), startTime: hhmm(h * 60 + min) }
  }
  return { title: capitalize(s) }
}

/** Add a task without leaving the screen. Type a time at the end to place it on the timeline. */
export function QuickAdd({ date }: { date: string }) {
  const add = useData((s) => s.addTask)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  const submit = () => {
    if (!text.trim()) return setOpen(false)
    const p = parseQuickTask(text)
    add({ title: p.title, date, startTime: p.startTime, priority: 'medium' })
    flash(`Added ${p.title}${p.startTime ? ` at ${looseTime(p.startTime)}` : ''}`)
    setText('')
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 18, border: '1px dashed #D5CAB8', color: 'var(--muted-2)', width: '100%' }}>
        <span style={{ fontSize: 15 }}>+</span><span style={{ fontSize: 15, fontWeight: 700 }}>Add task</span>
      </button>
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px 12px 16px', borderRadius: 18, background: '#fff' }}>
      <input className="text-input" autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Task, then a time (Call Mum 18:00)" aria-label="New task"
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setOpen(false) }} style={{ flex: 1, fontSize: 15, fontWeight: 700 }} />
      <button type="button" onClick={() => navigate(`/tasks/new?date=${date}${text.trim() ? `&title=${encodeURIComponent(text.trim())}` : ''}`)} style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--muted-2)', whiteSpace: 'nowrap' }}>More</button>
      <button type="button" onClick={submit} className="pill-ink" disabled={!text.trim()} style={{ opacity: text.trim() ? 1 : 0.4 }}>Add</button>
    </div>
  )
}

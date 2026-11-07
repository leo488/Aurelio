import { useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Chip } from '../components/controls'
import { flash } from '../components/Toast'
import { FlatButton, FormHeader, Label, longDay, OriCard, PRIORITY_LABEL, shortDay } from '../components/ui'
import { useData } from '../data/store'
import type { Priority, Task } from '../data/types'
import { addDays, dt, hhmm, logicalToday, minutesOf } from '../lib/date'
import { capitalize } from '../lib/words'

type Remind = 'none' | 'at' | '15' | '60' | 'kept'

const REMIND: [Exclude<Remind, 'kept'>, string][] = [['none', 'None'], ['at', 'At start'], ['15', '15 min before'], ['60', '1 hour before']]

/** A reminder time: relative to the start, or the morning summary (09:00) when there's no time. */
const remindAtFor = (mode: Remind, date: string | null, time: string, kept?: string): string | undefined => {
  if (mode === 'kept') return kept
  if (!date || mode === 'none') return undefined
  if (!time) return dt(date, '09:00')
  const m = minutesOf(time) - (mode === '15' ? 15 : mode === '60' ? 60 : 0)
  return m < 0 ? dt(addDays(date, -1), hhmm(m + 1440)) : dt(date, hhmm(m))
}

/** Which chip an existing reminder matches, if any. */
const modeOf = (t: Task): Remind => {
  if (!t.reminderAt) return 'none'
  for (const m of ['at', '15', '60'] as const) if (remindAtFor(m, t.date ?? null, t.startTime ?? '') === t.reminderAt) return m
  return 'kept'
}

/** Add or edit a task: title, notes, date, time, priority and reminder. */
export function TaskForm() {
  const { id } = useParams()
  const data = useData()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const existing = id ? data.tasks.find((t) => t.id === id) : undefined
  if (id && !existing) return <Navigate to="/tasks" replace />
  return <Form key={id ?? 'new'} task={existing} presetDate={params.get('date')} presetTitle={params.get('title')} onDone={() => navigate(-1)} />
}

function Form({ task, presetDate, presetTitle, onDone }: { task?: Task; presetDate: string | null; presetTitle: string | null; onDone: () => void }) {
  const data = useData()
  const navigate = useNavigate()
  const today = logicalToday()
  const [title, setTitle] = useState(task?.title ?? presetTitle ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [date, setDate] = useState<string | null>(task ? task.date ?? null : presetDate ?? today)
  const [start, setStart] = useState(task?.startTime ?? '')
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium')
  const [remind, setRemind] = useState<Remind>(task ? modeOf(task) : '15')

  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i))
  const dates = date && !week.includes(date) ? [...week, date] : week
  const reminderAt = remindAtFor(remind, date, start, task?.reminderAt)

  const save = () => {
    if (!title.trim()) return flash('Give the task a title first')
    const fields = {
      title: capitalize(title.trim()), notes: notes.trim() || undefined, date: date ?? undefined,
      startTime: date && start ? start : undefined,
      // There's no end-time field here; an existing one is kept while the start stays the same.
      endTime: task?.endTime && start === task.startTime ? task.endTime : undefined,
      deadline: task?.deadline, priority, reminderAt,
    }
    const where = fields.date ? `${shortDay(fields.date, today)}${fields.startTime ? ` at ${fields.startTime}` : ''}` : 'someday'
    if (task) {
      data.updateTask(task.id, fields)
      onDone()
      flash(task.date !== fields.date ? `Moved to ${where}` : 'Saved')
    } else {
      data.addTask(fields)
      onDone()
      flash(`Added to ${where}`)
    }
  }
  const remove = () => {
    if (!task || !window.confirm(`Delete “${task.title}”?`)) return
    data.removeTask(task.id)
    onDone()
    flash(`Deleted · ${task.title}`)
  }

  return (
    <main className="screen modal no-bar">
      <FormHeader title={task ? 'Edit task' : 'New task'} onCancel={onDone} onSave={save} saveLabel={task ? 'Save' : 'Add'} canSave={!!title.trim()} />
      <div className="pad" style={{ paddingTop: 26 }}>
        <input className="text-input display" autoFocus={!task} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" aria-label="Task"
          onKeyDown={(e) => e.key === 'Enter' && save()} style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.03em' }} />
        <input className="text-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" aria-label="Notes" style={{ fontSize: 15, marginTop: 12 }} />
        <div style={{ height: 1, background: 'var(--divider-confirm)', marginTop: 14 }} />
      </div>

      <div className="pad" style={{ paddingTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Label>Date</Label>
          <div style={{ fontSize: 12.5, color: 'var(--muted-2)', fontWeight: 600 }}>{date ? longDay(date) : 'Someday · no date'}</div>
        </div>
        <div style={{ display: 'flex', gap: 7, overflowX: 'auto', marginTop: 11, paddingBottom: 2 }}>
          {dates.map((d) => <Chip key={d} active={date === d} onClick={() => setDate(d)}>{shortDay(d, today)}</Chip>)}
          <label className={`chip${date && !week.includes(date) ? ' active' : ''}`} style={{ position: 'relative', cursor: 'pointer', flex: '0 0 auto' }}>
            Pick a date
            <input type="date" aria-label="Pick a date" value={date ?? ''} onChange={(e) => e.target.value && setDate(e.target.value)}
              style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%' }} />
          </label>
          <Chip active={!date} onClick={() => setDate(null)}>Someday</Chip>
        </div>
      </div>

      <div className="pad" style={{ paddingTop: 14, display: 'flex', flexDirection: 'column' }}>
        {date && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: '1px solid var(--divider)' }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Time</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="time" aria-label="Time" value={start} onChange={(e) => setStart(e.target.value)}
                style={{ border: 'none', background: 'var(--chip-alt-2)', borderRadius: 12, padding: '8px 10px', fontSize: 14, fontWeight: 700, color: 'var(--ink)', outline: 'none' }} />
              {start && <button type="button" aria-label="Clear time" onClick={() => setStart('')} style={{ fontSize: 16, color: 'var(--muted-3)', padding: '2px 4px' }}>×</button>}
            </div>
          </div>
        )}
        <div style={{ padding: '15px 0', borderBottom: '1px solid var(--divider)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 11 }}>Priority</div>
          <div style={{ display: 'flex', gap: 7 }} role="radiogroup" aria-label="Priority">
            {(['low', 'medium', 'high'] as Priority[]).map((p) => <Chip key={p} active={priority === p} onClick={() => setPriority(p)}>{PRIORITY_LABEL[p]}</Chip>)}
          </div>
        </div>
        <div style={{ padding: '15px 0' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 11 }}>Reminder</div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }} role="radiogroup" aria-label="Reminder">
            {REMIND.map(([k, l]) => <Chip key={k} active={remind === k} onClick={() => setRemind(k)}>{l}</Chip>)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted-3)', marginTop: 10, lineHeight: 1.5 }}>
            {!date ? 'Reminders need a date.'
              : remind === 'kept' && reminderAt ? `Reminder set for ${shortDay(reminderAt.slice(0, 10), today)} at ${reminderAt.slice(11, 16)}.`
              : !start ? 'Reminders need a time. Without one, it shows in the morning summary.' : ''}
          </div>
        </div>
      </div>

      <div className="pad" style={{ paddingTop: 6, paddingBottom: 'calc(40px + var(--safe-bottom))' }}>
        {task ? (
          <div style={{ display: 'flex', gap: 9 }}>
            {date !== addDays(today, 1) && (
              <FlatButton onClick={() => { data.updateTask(task.id, { date: addDays(today, 1), reminderAt: task.reminderAt ? remindAtFor(remind === 'kept' ? '15' : remind, addDays(today, 1), start) : undefined }); onDone(); flash('Moved to Tomorrow') }}>Move to tomorrow</FlatButton>
            )}
            <FlatButton tone="clay" onClick={remove}>Delete</FlatButton>
          </div>
        ) : (
          <OriCard text="Or just say it, and Ori fills this in." onClick={() => navigate('/ori')} />
        )}
      </div>
    </main>
  )
}

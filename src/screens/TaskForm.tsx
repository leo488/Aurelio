import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Row, Toggle } from '../components/controls'
import { Ori } from '../components/Ori'
import { flash } from '../components/Toast'
import { useData } from '../data/store'
import type { Priority, Task } from '../data/types'
import { addDays, diffDays, dt, hhmm, logicalToday, minutesOf, relativeDay, WEEKDAY_LONG, WEEKDAY_SHORT, weekday } from '../lib/date'
import { capitalize } from '../lib/words'

type Remind = 'off' | 'start' | 'before15' | 'before60' | 'morning' | 'twoDays' | 'kept'

const REMIND_LABEL: Record<Exclude<Remind, 'kept'>, string> = {
  off: 'Off', start: 'At the start', before15: '15 min before', before60: '1 hour before', morning: 'Morning of, 9:00', twoDays: 'Two days before',
}

const remindAtFor = (mode: Remind, date: string | null, time: string, kept?: string): string | undefined => {
  if (mode === 'kept') return kept
  if (!date || mode === 'off') return undefined
  if (mode === 'morning') return dt(date, '09:00')
  if (mode === 'twoDays') return dt(addDays(date, -2), '09:00')
  if (!time) return undefined
  const m = minutesOf(time) - (mode === 'before15' ? 15 : mode === 'before60' ? 60 : 0)
  return m < 0 ? dt(addDays(date, -1), hhmm(m + 1440)) : dt(date, hhmm(m))
}

/** Add or edit a task: date, times, reminder, priority, notes. Editing the date moves it to another day. */
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
  const friday = useMemo(() => {
    const t = addDays(today, 2)
    return addDays(t, (4 - weekday(t) + 7) % 7)
  }, [today])
  const nextMonday = addDays(today, 7 - weekday(today))
  const chips = [
    { label: 'Today', value: today },
    { label: 'Tomorrow', value: addDays(today, 1) },
    { label: WEEKDAY_LONG[weekday(friday)], value: friday },
    { label: 'Next week', value: nextMonday },
  ]
  const initialDate = task ? task.date ?? null : presetDate ?? today

  const [title, setTitle] = useState(task?.title ?? presetTitle ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [date, setDate] = useState<string | null>(initialDate)
  const [picked, setPicked] = useState(!!initialDate && !chips.some((c) => c.value === initialDate))
  const [start, setStart] = useState(task?.startTime ?? '')
  const [end, setEnd] = useState(task?.endTime ?? '')
  const [deadline, setDeadline] = useState(!!task?.deadline)
  const [remind, setRemind] = useState<Remind>(task ? (task.reminderAt ? 'kept' : 'off') : 'start')
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium')

  const options: Remind[] = [
    'off',
    ...(date && start ? (['start', 'before15', 'before60'] as Remind[]) : []),
    ...(date ? (['morning'] as Remind[]) : []),
    ...(date && diffDays(date, today) >= 2 ? (['twoDays'] as Remind[]) : []),
  ]
  const mode: Remind = remind === 'kept' ? 'kept' : options.includes(remind) ? remind : 'off'
  const reminderAt = remindAtFor(mode, date, start, task?.reminderAt)
  const remindLabel = mode === 'kept' && reminderAt ? `${WEEKDAY_SHORT[weekday(reminderAt.slice(0, 10))]} ${reminderAt.slice(11, 16)}` : REMIND_LABEL[mode === 'kept' ? 'off' : mode]
  const cycleRemind = () => setRemind(options[(options.indexOf(mode === 'kept' ? 'off' : mode) + 1) % options.length])

  const save = () => {
    if (!title.trim()) return
    const fields = {
      title: capitalize(title.trim()), notes: notes.trim() || undefined, date: date ?? undefined,
      startTime: date && start ? start : undefined, endTime: date && start && end && end > start ? end : undefined,
      deadline, priority, reminderAt,
    }
    if (task) {
      const moved = task.date !== fields.date
      data.updateTask(task.id, fields)
      onDone()
      flash(moved ? `Moved to ${fields.date ? relativeDay(fields.date, today) : 'someday'}` : 'Saved')
    } else {
      data.addTask(fields)
      onDone()
      flash(`Added to ${!date ? 'someday' : ['Today', 'Tomorrow'].includes(relativeDay(date, today)) ? relativeDay(date, today).toLowerCase() : relativeDay(date, today)}`)
    }
  }

  const remove = () => {
    if (!task || !window.confirm(`Delete “${task.title}”?`)) return
    data.removeTask(task.id)
    onDone()
    flash('Deleted')
  }

  const timeInput = (label: string, value: string, onChange: (v: string) => void) => (
    <label className="row-value" style={{ position: 'relative' }}>
      {value || (label === 'Ends' ? 'None' : 'Any time')} ›
      <input type="time" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0 }} />
    </label>
  )

  return (
    <main className="screen modal no-bar">
      <div className="pad top-12" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" onClick={onDone} style={{ fontSize: 15, fontWeight: 600, color: 'var(--muted-2)' }}>Cancel</button>
        <div style={{ fontSize: 14, fontWeight: 800 }}>{task ? 'Edit task' : 'New task'}</div>
        <button type="button" onClick={save} disabled={!title.trim()} style={{ fontSize: 15, fontWeight: 800, color: title.trim() ? 'var(--gold-text)' : 'var(--muted-4)' }}>{task ? 'Save' : 'Add'}</button>
      </div>
      <div className="pad" style={{ paddingTop: 28 }}>
        <input className="text-input display" autoFocus={!task} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name it" aria-label="Task"
          onKeyDown={(e) => e.key === 'Enter' && save()} style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.03em' }} />
        <input className="text-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" aria-label="Notes" style={{ fontSize: 16, marginTop: 12 }} />
        <div style={{ height: 1, background: 'var(--divider-confirm)', marginTop: 14 }} />
      </div>
      <div className="pad" style={{ paddingTop: 18, display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {chips.map((c) => (
          <button key={c.label} type="button" className={`chip${!picked && date === c.value ? ' active' : ''}`} style={{ padding: '9px 14px' }} aria-pressed={!picked && date === c.value}
            onClick={() => { setPicked(false); setDate(date === c.value && !picked ? null : c.value) }}>
            {c.label}
          </button>
        ))}
        <label className={`chip${picked ? ' active' : ''}`} style={{ padding: '9px 14px', position: 'relative', cursor: 'pointer' }}>
          {picked && date ? relativeDay(date, today) : 'Pick a date'}
          <input type="date" aria-label="Pick a date" value={date ?? ''}
            onChange={(e) => { if (e.target.value) { setDate(e.target.value); setPicked(true) } }}
            style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%' }} />
        </label>
        {!date && <div style={{ fontSize: 12.5, color: 'var(--muted-2)', alignSelf: 'center', fontWeight: 700 }}>No date · someday</div>}
      </div>
      <div className="pad" style={{ paddingTop: 22, paddingBottom: 'calc(40px + var(--safe-bottom))', display: 'flex', flexDirection: 'column' }}>
        {date && (
          <>
            <Row title="Starts" right={timeInput('Starts', start, setStart)} />
            {start && <Row title="Ends" right={timeInput('Ends', end, setEnd)} />}
          </>
        )}
        <Row title="This is a deadline" sub="Shows in red, warns two days out"
          right={<Toggle label="This is a deadline" on={deadline} onChange={(v) => { setDeadline(v); if (v && date && diffDays(date, today) >= 2) setRemind('twoDays') }} />} />
        <Row title="Remind me" sub={options.length > 1 || mode === 'kept' ? 'Tap to change' : 'Pick a date to set a reminder'} value={`${remindLabel} ›`} onClick={cycleRemind} />
        <Row last title="Priority" right={
          <div style={{ display: 'flex', gap: 6 }} role="radiogroup" aria-label="Priority">
            {(['low', 'medium', 'high'] as Priority[]).map((p) => (
              <button key={p} type="button" role="radio" aria-checked={priority === p} onClick={() => setPriority(p)}
                style={{ padding: '5px 11px', borderRadius: 99, background: priority === p ? 'var(--ink)' : 'var(--chip)', fontSize: 12, fontWeight: 700, color: priority === p ? 'var(--paper)' : 'var(--chip-text)' }}>
                {p === 'low' ? 'Low' : p === 'medium' ? 'Med' : 'High'}
              </button>
            ))}
          </div>
        } />
        {task ? (
          <div style={{ display: 'flex', gap: 9, marginTop: 22 }}>
            {date !== addDays(today, 1) && (
              <button type="button" className="btn btn-chip" style={{ flex: 1 }} onClick={() => { data.updateTask(task.id, { date: addDays(today, 1) }); onDone(); flash('Moved to tomorrow') }}>Move to tomorrow</button>
            )}
            <button type="button" className="btn btn-chip" style={{ flex: 1, color: 'var(--clay)' }} onClick={remove}>Delete</button>
          </div>
        ) : (
          <button type="button" className="ori-card" style={{ marginTop: 22 }} onClick={() => navigate('/ori')}>
            <Ori size={26} />
            <div style={{ fontSize: 13.5, color: 'var(--chip-suggest-text)', lineHeight: 1.45 }}>Or just say it out loud and I’ll fill this in.</div>
          </button>
        )}
      </div>
    </main>
  )
}

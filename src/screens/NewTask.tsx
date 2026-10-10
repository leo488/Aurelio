import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Row, Toggle } from '../components/controls'
import { Ori } from '../components/Ori'
import { flash } from '../components/Toast'
import { useMe } from '../data/session'
import { useData } from '../data/store'
import type { Priority } from '../data/types'
import { addDays, diffDays, dt, logicalToday, relativeDay, WEEKDAY_LONG, WEEKDAY_SHORT, weekday } from '../lib/date'

type Remind = 'off' | 'at' | 'morning' | 'twoDays'

export function NewTask() {
  const data = useData()
  const { me, partner, partnerName } = useMe()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const today = logicalToday()

  const friday = useMemo(() => {
    const t = addDays(today, 2)
    return addDays(t, (4 - weekday(t) + 7) % 7)
  }, [today])
  const nextMonday = addDays(today, 7 - weekday(today))
  const preset = params.get('date')

  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState<string | null>(preset ?? addDays(today, 1))
  const [picked, setPicked] = useState(!!preset && ![today, addDays(today, 1), friday, nextMonday].includes(preset))
  const [time, setTime] = useState('')
  const [deadline, setDeadline] = useState(false)
  const [remind, setRemind] = useState<Remind>('at')
  const [priority, setPriority] = useState<Priority>('med')
  const [share, setShare] = useState(false)

  const effectiveTime = time || (deadline ? '23:59' : '')
  const remindOptions: Remind[] = ['off', ...(date ? (['at', 'morning'] as Remind[]) : []), ...(date && diffDays(date, today) >= 2 ? (['twoDays'] as Remind[]) : [])]
  const remindValue = remindOptions.includes(remind) ? remind : 'off'
  const remindAt = (): string | undefined => {
    if (!date || remindValue === 'off') return undefined
    if (remindValue === 'at') return dt(date, effectiveTime || '09:00')
    if (remindValue === 'morning') return dt(date, '09:00')
    return dt(addDays(date, -2), '09:00')
  }
  const remindLabel = () => {
    const at = remindAt()
    return at ? `${WEEKDAY_SHORT[weekday(at.slice(0, 10))]} ${at.slice(11, 16)}` : 'Off'
  }

  const chips: { label: string; value: string }[] = [
    { label: 'Today', value: today },
    { label: 'Tomorrow', value: addDays(today, 1) },
    { label: WEEKDAY_LONG[weekday(friday)], value: friday },
    { label: 'Next week', value: nextMonday },
  ]

  const add = () => {
    if (!title.trim()) return
    data.addTask({
      owner: share ? 'both' : me, title: title.trim(), notes: notes.trim() || undefined,
      due: date ? (effectiveTime ? dt(date, effectiveTime) : date) : undefined,
      isDeadline: deadline, remindAt: remindAt(), priority, shared: share, assignee: share ? me : undefined,
    })
    if (share) data.pushNotice(partner, { kind: 'partner', title: `${me === 'leo' ? 'Leo' : 'Soniya'} shared “${title.trim()}”`, meta: '' })
    navigate('/tasks')
    const rel = date ? relativeDay(date, today) : ''
    const where = !date ? 'your list' : rel === 'Today' || rel === 'Tomorrow' ? rel.toLowerCase() : rel
    const at = remindAt()
    flash(deadline && at && at.slice(0, 10) !== date ? `Added to ${where} with a ${WEEKDAY_LONG[weekday(at.slice(0, 10))]} warning` : `Added to ${where}`)
  }

  return (
    <main className="screen modal no-bar">
      <div className="pad top-12" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" onClick={() => navigate(-1)} style={{ fontSize: 15, fontWeight: 600, color: 'var(--muted-2)' }}>Cancel</button>
        <div style={{ fontSize: 14, fontWeight: 800 }}>New task</div>
        <button type="button" onClick={add} disabled={!title.trim()} style={{ fontSize: 15, fontWeight: 800, color: title.trim() ? 'var(--gold-text)' : 'var(--muted-4)' }}>Add</button>
      </div>
      <div className="pad" style={{ paddingTop: 28 }}>
        <input className="text-input display" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name it" aria-label="Task"
          onKeyDown={(e) => e.key === 'Enter' && add()} style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.03em' }} />
        <input className="text-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" aria-label="Notes"
          style={{ fontSize: 15, marginTop: 12 }} />
        <div style={{ height: 1, background: 'var(--divider-confirm)', marginTop: 14 }} />
      </div>
      <div className="pad" style={{ paddingTop: 18, display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {chips.map((c) => (
          <button key={c.label} type="button" className={`chip${!picked && date === c.value ? ' active' : ''}`} style={{ padding: '9px 14px' }}
            onClick={() => { setPicked(false); setDate(date === c.value && !picked ? null : c.value) }}>
            {c.label}
          </button>
        ))}
        <label className={`chip${picked ? ' active' : ''}`} style={{ padding: '9px 14px', position: 'relative', cursor: 'pointer' }}>
          {picked && date ? relativeDay(date, today) : 'Pick a date'}
          <input type="date" aria-label="Pick a date" value={date ?? ''} min={today}
            onChange={(e) => { if (e.target.value) { setDate(e.target.value); setPicked(true) } }}
            style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%' }} />
        </label>
      </div>
      <div className="pad" style={{ paddingTop: 22, paddingBottom: 'calc(40px + var(--safe-bottom))', display: 'flex', flexDirection: 'column' }}>
        <Row title="Time" right={
          <label className="row-value" style={{ position: 'relative' }}>
            {effectiveTime || 'Any time'} ›
            <input type="time" aria-label="Time" value={time} onChange={(e) => setTime(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0 }} />
          </label>
        } />
        <Row title="This is a deadline" sub="Shows in red, warns two days out"
          right={<Toggle label="This is a deadline" on={deadline} onChange={(v) => { setDeadline(v); if (v && date && diffDays(date, today) >= 2) setRemind('twoDays') }} />} />
        <Row title="Remind me" value={`${remindLabel()} ›`} onClick={() => setRemind(remindOptions[(remindOptions.indexOf(remindValue) + 1) % remindOptions.length])} />
        <Row title="Priority" right={
          <div style={{ display: 'flex', gap: 6 }} role="radiogroup" aria-label="Priority">
            {(['low', 'med', 'high'] as Priority[]).map((p) => (
              <button key={p} type="button" role="radio" aria-checked={priority === p} onClick={() => setPriority(p)}
                style={{ padding: '5px 11px', borderRadius: 99, background: priority === p ? 'var(--ink)' : 'var(--chip)', fontSize: 12, fontWeight: 700, color: priority === p ? 'var(--paper)' : 'var(--chip-text)' }}>
                {p === 'low' ? 'Low' : p === 'med' ? 'Med' : 'High'}
              </button>
            ))}
          </div>
        } />
        <Row last title={`Share with ${partnerName}`} right={<Toggle label={`Share with ${partnerName}`} on={share} onChange={setShare} />} />
        <button type="button" className="ori-card" style={{ marginTop: 22 }} onClick={() => navigate('/ori')}>
          <Ori size={26} />
          <div style={{ fontSize: 13.5, color: 'var(--chip-suggest-text)', lineHeight: 1.45 }}>Or just say it out loud and I’ll fill this in.</div>
        </button>
      </div>
    </main>
  )
}

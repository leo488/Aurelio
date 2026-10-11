import { useNavigate } from 'react-router-dom'
import { Row, Toggle } from '../components/controls'
import { Sheet } from '../components/Sheet'
import { flash } from '../components/Toast'
import { CATEGORY_LABEL } from '../data/select'
import { useData } from '../data/store'
import type { Routine, TimeCategory } from '../data/types'
import { daysLabel, logicalToday, looseTime, WEEKDAY_LETTER } from '../lib/date'
import { isScheduled, routineStreak } from '../lib/streak'

const CATEGORIES: TimeCategory[] = ['morning', 'afternoon', 'evening', 'night', 'custom']
const REMIND_BEFORE = [5, 10, 15, 30]

/** The ⋯ sheet on a routine: name, time of day, schedule, reminders, active and skip. */
export function RoutineSheet({ routine: r, onClose }: { routine: Routine; onClose: () => void }) {
  const data = useData()
  const navigate = useNavigate()
  const up = (patch: Parameters<typeof data.updateRoutine>[1]) => data.updateRoutine(r.id, patch)
  const today = logicalToday()
  const days = r.repeatPattern.days

  const remove = () => {
    if (!window.confirm(`Delete ${r.name}? Its history and streak go with it.`)) return
    data.deleteRoutine(r.id)
    onClose()
    navigate('/routines')
    flash(`${r.name} deleted`)
  }

  return (
    <Sheet open onClose={onClose} label="Edit routine">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" onClick={remove} style={{ fontSize: 15, fontWeight: 600, color: 'var(--clay)' }}>Delete</button>
        <div style={{ fontSize: 14, fontWeight: 800 }}>Edit routine</div>
        <button type="button" onClick={onClose} style={{ fontSize: 15, fontWeight: 800, color: 'var(--gold-text)' }}>Done</button>
      </div>
      <input className="text-input display" value={r.name} aria-label="Routine name" onChange={(e) => up({ name: e.target.value })}
        style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.03em', marginTop: 22 }} />
      <input className="text-input" value={r.description ?? ''} aria-label="Description" placeholder="Description (optional)" onChange={(e) => up({ description: e.target.value || undefined })}
        style={{ fontSize: 16, marginTop: 10 }} />
      <div style={{ height: 1, background: 'var(--divider-confirm)', marginTop: 12 }} />
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', paddingTop: 16 }} role="radiogroup" aria-label="Time of day">
        {CATEGORIES.map((c) => (
          <button key={c} type="button" role="radio" aria-checked={r.timeCategory === c} className={`chip${r.timeCategory === c ? ' active' : ''}`} onClick={() => up({ timeCategory: c })}>
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>
      {r.timeCategory === 'custom' && (
        <input className="text-input" value={r.categoryLabel ?? ''} onChange={(e) => up({ categoryLabel: e.target.value || undefined })} placeholder="Label it, e.g. Before class" aria-label="Custom label"
          style={{ fontSize: 16, fontWeight: 700, marginTop: 12, padding: '12px 14px', background: 'var(--white)', borderRadius: 14 }} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
        <Row title="Repeats" value={daysLabel(days)} />
        <div style={{ display: 'flex', gap: 7, padding: '14px 0', borderBottom: '1px solid var(--divider)' }}>
          {WEEKDAY_LETTER.map((l, d) => {
            const on = days.includes(d)
            return (
              <button key={d} type="button" aria-pressed={on}
                onClick={() => {
                  const next = on ? days.filter((x) => x !== d) : [...days, d].sort()
                  if (next.length) up({ repeatPattern: { type: 'weekly', days: next }, steps: r.steps.map((s) => ({ ...s, days: on ? s.days.filter((x) => x !== d) : [...s.days, d].sort() })) })
                }}
                style={{ flex: 1, padding: '11px 0', borderRadius: 14, background: on ? 'var(--ink)' : 'var(--chip)', color: on ? 'var(--paper)' : 'var(--muted-2)', fontSize: 12.5, fontWeight: 700, textAlign: 'center' }}>
                {l}
              </button>
            )
          })}
        </div>
        <Row title="Start time" right={<input type="time" className="inline-picker" aria-label="Start time" value={r.scheduledTime ?? ''} onChange={(e) => up({ scheduledTime: e.target.value || undefined })} />} />
        <Row title="Remind me" sub={r.scheduledTime ? `${r.reminder.minutesBefore} minutes before · tap to change` : 'Set a start time to get reminders'}
          onClick={() => up({ reminder: { ...r.reminder, minutesBefore: REMIND_BEFORE[(REMIND_BEFORE.indexOf(r.reminder.minutesBefore) + 1) % REMIND_BEFORE.length] } })}
          right={<Toggle label="Remind me" on={r.reminder.enabled && !!r.scheduledTime} onChange={(v) => up({ reminder: { ...r.reminder, enabled: v } })} />} />
        <Row last title="Active" sub={r.active ? 'Switch off to pause it; the streak is held' : `Streak of ${routineStreak(r, data.completions, today).current} is held`}
          right={<Toggle label="Active" on={r.active} onChange={(v) => { up({ active: v }); flash(v ? `${r.name} is back${r.scheduledTime ? ` · ${looseTime(r.scheduledTime)}` : ''}` : `${r.name} paused · streak held`) }} />} />
      </div>
      <div style={{ display: 'flex', gap: 9, marginTop: 18 }}>
        <button type="button" className="btn btn-chip" style={{ flex: 1 }} disabled={!isScheduled(r, today)}
          onClick={() => {
            const ok = data.skipDay(r.id)
            flash(ok ? `${r.name} skipped today · streak untouched` : 'Two skips a week is the limit')
            onClose()
          }}>
          Skip today
        </button>
      </div>
    </Sheet>
  )
}

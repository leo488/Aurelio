import { useNavigate } from 'react-router-dom'
import { Row, Toggle } from '../components/controls'
import { Sheet } from '../components/Sheet'
import { flash } from '../components/Toast'
import { useData } from '../data/store'
import type { Routine } from '../data/types'
import { daysLabel, logicalToday, looseTime, WEEKDAY_LETTER } from '../lib/date'
import { isScheduled } from '../lib/streak'

/** The ⋯ sheet on a routine: when it runs, reminders, pause and skip. */
export function RoutineSheet({ routine: r, onClose }: { routine: Routine; onClose: () => void }) {
  const data = useData()
  const navigate = useNavigate()
  const up = (patch: Partial<Routine>) => data.updateRoutine(r.id, patch)
  const today = logicalToday()

  const remove = () => {
    if (!window.confirm(`Delete ${r.name}? Its streak goes with it.`)) return
    useData.setState((s) => ({ routines: s.routines.filter((x) => x.id !== r.id) }))
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
      <div style={{ height: 1, background: 'var(--divider-confirm)', marginTop: 12 }} />
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
        <Row title="Repeats" value={`${daysLabel(r.days)}`} />
        <div style={{ display: 'flex', gap: 7, padding: '14px 0', borderBottom: '1px solid var(--divider)' }}>
          {WEEKDAY_LETTER.map((l, d) => {
            const on = r.days.includes(d)
            return (
              <button key={d} type="button" aria-pressed={on}
                onClick={() => {
                  const days = on ? r.days.filter((x) => x !== d) : [...r.days, d].sort()
                  if (days.length) up({ days, items: r.items.map((i) => ({ ...i, days: on ? i.days.filter((x) => x !== d) : [...i.days, d].sort() })) })
                }}
                style={{ flex: 1, padding: '11px 0', borderRadius: 14, background: on ? 'var(--ink)' : 'var(--chip)', color: on ? 'var(--paper)' : 'var(--muted-2)', fontSize: 12.5, fontWeight: 700, textAlign: 'center' }}>
                {l}
              </button>
            )
          })}
        </div>
        <Row title="Start time" right={<input type="time" className="inline-picker" aria-label="Start time" value={r.time} onChange={(e) => e.target.value && up({ time: e.target.value })} />} />
        <Row title="Remind me" sub="10 minutes before" right={<Toggle label="Remind me" on={r.remind} onChange={(v) => up({ remind: v })} />} />
        <Row last title="Paused" sub={r.paused ? `Streak of ${r.streak.current} is held` : 'Freezes the streak until you resume'}
          right={<Toggle label="Paused" on={r.paused} onChange={(v) => { up({ paused: v }); flash(v ? `${r.name} paused · streak held` : `${r.name} is back · ${looseTime(r.time)}`) }} />} />
      </div>
      <div style={{ display: 'flex', gap: 9, marginTop: 18 }}>
        <button type="button" className="btn btn-chip" style={{ flex: 1 }} disabled={!isScheduled(r, today) || r.paused}
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

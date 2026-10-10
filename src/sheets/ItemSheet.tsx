import { useState } from 'react'
import { Row, Toggle } from '../components/controls'
import { Sheet } from '../components/Sheet'
import { flash } from '../components/Toast'
import { useMe } from '../data/session'
import { myRoutines } from '../data/select'
import { useData } from '../data/store'
import type { Routine, RoutineItem } from '../data/types'
import { daysLabel, logicalToday, WEEKDAY_LETTER } from '../lib/date'
import { isScheduled } from '../lib/streak'

const DURATIONS = [0, 5, 10, 15, 20, 25, 30, 40, 45, 60, 90]

/** Edit (or add) one routine item: name, duration, days, counts-toward-streak, skip today, move. */
export function ItemSheet({ routine, item, onClose }: { routine: Routine; item: RoutineItem | null; onClose: () => void }) {
  const data = useData()
  const { me } = useMe()
  const isNew = !item?.name
  const [draft, setDraft] = useState<RoutineItem>(
    () => item ?? { id: Math.random().toString(36).slice(2, 10), name: '', days: routine.days, countsTowardStreak: true },
  )
  const [showDays, setShowDays] = useState(false)
  const [showMove, setShowMove] = useState(false)
  const set = (patch: Partial<RoutineItem>) => setDraft((d) => ({ ...d, ...patch }))
  const today = logicalToday()

  const save = () => {
    if (!draft.name.trim()) return onClose()
    data.upsertItem(routine.id, { ...draft, name: draft.name.trim() })
    onClose()
  }
  const others = myRoutines(data, me).filter((r) => r.id !== routine.id)

  return (
    <Sheet open onClose={onClose} label="Edit item">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {isNew ? (
          <button type="button" onClick={onClose} style={{ fontSize: 15, fontWeight: 600, color: 'var(--muted-2)' }}>Cancel</button>
        ) : (
          <button type="button" onClick={() => { data.deleteItem(routine.id, draft.id); flash(`Removed ${draft.name}`); onClose() }} style={{ fontSize: 15, fontWeight: 600, color: 'var(--clay)' }}>Delete</button>
        )}
        <div style={{ fontSize: 14, fontWeight: 800 }}>{isNew ? 'New item' : 'Edit item'}</div>
        <button type="button" onClick={save} style={{ fontSize: 15, fontWeight: 800, color: 'var(--gold-text)' }}>Done</button>
      </div>
      <input
        className="text-input display" autoFocus={isNew} value={draft.name} placeholder="Name it" aria-label="Item name"
        onChange={(e) => set({ name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && save()}
        style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.03em', marginTop: 22 }}
      />
      <div style={{ height: 1, background: 'var(--divider-confirm)', marginTop: 12 }} />
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
        <Row
          title="Duration"
          right={
            <label className="row-value" style={{ position: 'relative' }}>
              {draft.durationMin ? `${draft.durationMin} minutes` : 'No time'} ›
              <select aria-label="Duration" value={draft.durationMin ?? 0} onChange={(e) => set({ durationMin: Number(e.target.value) || undefined })}
                style={{ position: 'absolute', inset: 0, opacity: 0 }}>
                {DURATIONS.map((m) => <option key={m} value={m}>{m ? `${m} minutes` : 'No time'}</option>)}
              </select>
            </label>
          }
        />
        <Row title="Days" value={`${daysLabel(draft.days)} ›`} onClick={() => setShowDays((v) => !v)} />
        {showDays && (
          <div style={{ display: 'flex', gap: 7, padding: '14px 0', borderBottom: '1px solid var(--divider)' }}>
            {WEEKDAY_LETTER.map((l, d) => {
              const allowed = routine.days.includes(d)
              const on = draft.days.includes(d)
              return (
                <button key={d} type="button" disabled={!allowed} aria-pressed={on}
                  onClick={() => set({ days: on ? draft.days.filter((x) => x !== d) : [...draft.days, d].sort() })}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 14, background: on ? 'var(--ink)' : 'var(--chip)', color: on ? 'var(--paper)' : 'var(--muted-2)', fontSize: 12.5, fontWeight: 700, textAlign: 'center', opacity: allowed ? 1 : 0.4 }}>
                  {l}
                </button>
              )
            })}
          </div>
        )}
        <Row last title="Counts toward streak" sub="Turn off for items that shouldn’t decide the day"
          right={<Toggle label="Counts toward streak" on={draft.countsTowardStreak} onChange={(v) => set({ countsTowardStreak: v })} />} />
      </div>
      {!isNew && (
        <div style={{ display: 'flex', gap: 9, marginTop: 18 }}>
          <button type="button" className="btn btn-chip" style={{ flex: 1 }} disabled={!isScheduled(routine, today)}
            onClick={() => { data.skipItemToday(routine.id, draft.id); flash(`${draft.name} skipped today · it won’t count`); onClose() }}>
            Skip today
          </button>
          <button type="button" className="btn btn-chip" style={{ flex: 1 }} onClick={() => setShowMove((v) => !v)}>Move to…</button>
        </div>
      )}
      {showMove && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column' }}>
          {others.length === 0 && <div className="meta">No other routines yet.</div>}
          {others.map((r) => (
            <button key={r.id} type="button" className="setting-row" onClick={() => { data.moveItem(routine.id, r.id, draft.id); flash(`Moved to ${r.name}`); onClose() }}>
              <span className="row-title-sm">{r.name}</span>
              <span className="row-value">›</span>
            </button>
          ))}
        </div>
      )}
    </Sheet>
  )
}

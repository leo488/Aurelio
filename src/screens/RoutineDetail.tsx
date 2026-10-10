import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { BackButton } from '../components/controls'
import { Ember } from '../components/Ember'
import { Heatmap } from '../components/Heatmap'
import { useMe } from '../data/session'
import { logOf } from '../data/select'
import { useData } from '../data/store'
import type { RoutineItem } from '../data/types'
import { daysLabel, logicalToday, looseTime } from '../lib/date'
import { itemLabel, totalMinutes } from '../lib/labels'
import { consistency, liveStreak } from '../lib/streak'
import { ItemSheet } from '../sheets/ItemSheet'
import { RoutineSheet } from '../sheets/RoutineSheet'

export function RoutineDetail() {
  const { id } = useParams()
  const data = useData()
  const { partnerName } = useMe()
  const navigate = useNavigate()
  const [editing, setEditing] = useState<RoutineItem | null | 'new'>(null)
  const [routineSheet, setRoutineSheet] = useState(false)
  const [reorder, setReorder] = useState(false)
  const r = data.routines.find((x) => x.id === id)
  if (!r) return <Navigate to="/routines" replace />
  const today = logicalToday()
  const current = liveStreak(r, today, logOf(data, r))
  const days = daysLabel(r.days)
  const when = days === 'Every day' ? `Every day at ${looseTime(r.time)}` : `${days} at ${looseTime(r.time)}`

  const stat = (value: React.ReactNode, caption: string) => (
    <div>
      <div className="display" style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.035em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--stat-caption)', fontWeight: 700, marginTop: 3 }}>{caption}</div>
    </div>
  )

  return (
    <main className="screen">
      <div className="pad top" style={{ background: 'linear-gradient(170deg, #EFDFC4, #F6F1E9)', paddingBottom: 26 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <BackButton onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/routines'))} />
          <button type="button" aria-label="Routine options" onClick={() => setRoutineSheet(true)} style={{ fontSize: 19, lineHeight: 1 }}>⋯</button>
        </div>
        <h1 className="display" style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-.033em', margin: '16px 0 0' }}>{r.name}</h1>
        <div style={{ fontSize: 13.5, color: '#7A6F5E', marginTop: 4, fontWeight: 600 }}>
          {r.owner === 'both' ? `${when} · with ${partnerName}` : when} · {r.items.length} items · ~{totalMinutes(r.items)} min{r.paused ? ' · paused' : ''}
        </div>
        <div style={{ display: 'flex', gap: 26, marginTop: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Ember streak={current} size={22} />
            <div>
              <div className="display" style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.035em', lineHeight: 1 }}>{current}</div>
              <div style={{ fontSize: 11, color: 'var(--stat-caption)', fontWeight: 700 }}>Current</div>
            </div>
          </div>
          {stat(Math.max(r.streak.longest, current), 'Longest')}
          {stat(`${consistency(r, data.logs, today)}%`, '90 days')}
        </div>
      </div>

      <div className="pad" style={{ paddingTop: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div className="label">Items</div>
          <button type="button" onClick={() => setReorder((v) => !v)} style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--gold-text)' }}>{reorder ? 'Done' : 'Reorder'}</button>
        </div>
        {r.items.map((it, i) => (
          <div key={it.id} className="list-row" style={{ gap: 12, borderBottom: '1px solid var(--divider)' }}>
            <div style={{ color: 'var(--drag-handle)', fontSize: 14 }} aria-hidden="true">⠿</div>
            <button type="button" onClick={() => setEditing(it)} style={{ flex: 1, fontSize: 15.5, fontWeight: 700, textAlign: 'left', opacity: it.countsTowardStreak ? 1 : 0.6 }}>{itemLabel(it)}</button>
            {reorder ? (
              <div style={{ display: 'flex', gap: 4 }}>
                <button type="button" aria-label={`Move ${it.name} up`} disabled={i === 0} onClick={() => data.reorderItems(r.id, i, i - 1)} className="reorder-btn">↑</button>
                <button type="button" aria-label={`Move ${it.name} down`} disabled={i === r.items.length - 1} onClick={() => data.reorderItems(r.id, i, i + 1)} className="reorder-btn">↓</button>
              </div>
            ) : (
              <button type="button" onClick={() => setEditing(it)} aria-hidden="true" tabIndex={-1} style={{ fontSize: 13, color: 'var(--muted-3)' }}>›</button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => setEditing('new')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0', color: 'var(--gold-text)', fontSize: 14.5, fontWeight: 800 }}>+ Add item</button>
      </div>

      <div className="pad" style={{ paddingTop: 6 }}>
        <div className="label" style={{ marginBottom: 12 }}>Last 5 weeks</div>
        <Heatmap routine={r} logs={data.logs} today={today} />
      </div>

      {editing && <ItemSheet routine={r} item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {routineSheet && <RoutineSheet routine={r} onClose={() => setRoutineSheet(false)} />}
    </main>
  )
}

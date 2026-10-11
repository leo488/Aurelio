import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { BackButton, Check } from '../components/controls'
import { Ember } from '../components/Ember'
import { Heatmap } from '../components/Heatmap'
import { categoryText } from '../data/select'
import { useData } from '../data/store'
import type { RoutineStep } from '../data/types'
import { daysLabel, logicalToday, looseTime } from '../lib/date'
import { stepLabel, totalMinutes } from '../lib/labels'
import { completionOf, consistency, isScheduled, routineStreak, stepsOn } from '../lib/streak'
import { RoutineSheet } from '../sheets/RoutineSheet'
import { StepSheet } from '../sheets/StepSheet'

export function RoutineDetail() {
  const { id } = useParams()
  const data = useData()
  const navigate = useNavigate()
  const [editing, setEditing] = useState<RoutineStep | null | 'new'>(null)
  const [routineSheet, setRoutineSheet] = useState(false)
  const [reorder, setReorder] = useState(false)
  const r = data.routines.find((x) => x.id === id)
  if (!r) return <Navigate to="/routines" replace />
  const today = logicalToday()
  const st = routineStreak(r, data.completions, today)
  const days = daysLabel(r.repeatPattern.days)
  const when = r.scheduledTime ? `${days} at ${looseTime(r.scheduledTime)}` : days
  const due = r.active && isScheduled(r, today)
  const c = completionOf(data.completions, r.id, today)
  const todays = new Set(stepsOn(r, today).map((s) => s.id))

  const stat = (value: React.ReactNode, caption: string) => (
    <div>
      <div className="display" style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.035em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--stat-caption)', fontWeight: 700, marginTop: 3 }}>{caption}</div>
    </div>
  )

  return (
    <main className="screen">
      <div className="pad top" style={{ background: `linear-gradient(170deg, var(--hero-${r.timeCategory}), var(--paper))`, paddingBottom: 26 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <BackButton onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/routines'))} />
          <button type="button" aria-label="Routine options" onClick={() => setRoutineSheet(true)} style={{ fontSize: 19, lineHeight: 1 }}>⋯</button>
        </div>
        <h1 className="display" style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-.033em', margin: '16px 0 0' }}>{r.name}</h1>
        <div style={{ fontSize: 13.5, color: 'var(--hero-sub)', marginTop: 4, fontWeight: 600 }}>
          {categoryText(r)} · {when} · {r.steps.length} steps{totalMinutes(r.steps) ? ` · ~${totalMinutes(r.steps)} min` : ''}{r.active ? '' : ' · inactive'}
        </div>
        {r.description && <div style={{ fontSize: 13.5, color: 'var(--muted-1)', marginTop: 8, lineHeight: 1.5 }}>{r.description}</div>}
        <div style={{ display: 'flex', gap: 26, marginTop: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Ember streak={st.current} size={22} />
            <div>
              <div className="display" style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.035em', lineHeight: 1 }}>{st.current}</div>
              <div style={{ fontSize: 11, color: 'var(--stat-caption)', fontWeight: 700 }}>Current</div>
            </div>
          </div>
          {stat(st.longest, 'Longest')}
          {stat(st.completedDays, 'Completed')}
          {stat(`${consistency([r], data.completions, today, 30)}%`, '30 days')}
        </div>
      </div>

      <div className="pad" style={{ paddingTop: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div className="label">{due ? 'Steps · today' : 'Steps'}</div>
          <button type="button" onClick={() => setReorder((v) => !v)} style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--gold-text)' }}>{reorder ? 'Done' : 'Reorder'}</button>
        </div>
        {r.steps.map((s, i) => {
          const tickable = due && todays.has(s.id) && !reorder
          const done = !!c?.completedStepIds.includes(s.id)
          return (
            <div key={s.id} className="list-row" style={{ gap: 12, borderBottom: '1px solid var(--divider)' }}>
              {tickable ? (
                <button type="button" aria-label={`${done ? 'Untick' : 'Tick'} ${s.title}`} aria-pressed={done} onClick={() => data.toggleStep(r.id, s.id)} style={{ lineHeight: 0 }}>
                  <Check done={done} />
                </button>
              ) : (
                <div style={{ color: 'var(--drag-handle)', fontSize: 14, width: 22, textAlign: 'center' }} aria-hidden="true">⠿</div>
              )}
              <button type="button" onClick={() => setEditing(s)} style={{ flex: 1, fontSize: 15.5, fontWeight: 700, textAlign: 'left', opacity: s.countsTowardStreak ? 1 : 0.6, ...(tickable && done ? { color: 'var(--muted-4)', textDecoration: 'line-through' } : {}) }}>{stepLabel(s)}</button>
              {reorder ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button type="button" aria-label={`Move ${s.title} up`} disabled={i === 0} onClick={() => data.reorderSteps(r.id, i, i - 1)} className="reorder-btn">↑</button>
                  <button type="button" aria-label={`Move ${s.title} down`} disabled={i === r.steps.length - 1} onClick={() => data.reorderSteps(r.id, i, i + 1)} className="reorder-btn">↓</button>
                </div>
              ) : (
                <button type="button" onClick={() => setEditing(s)} aria-hidden="true" tabIndex={-1} style={{ fontSize: 13, color: 'var(--muted-3)' }}>›</button>
              )}
            </div>
          )
        })}
        <button type="button" onClick={() => setEditing('new')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0', color: 'var(--gold-text)', fontSize: 14.5, fontWeight: 800 }}>+ Add step</button>
      </div>

      <div className="pad" style={{ paddingTop: 6 }}>
        <div className="label" style={{ marginBottom: 12 }}>Last 5 weeks</div>
        <Heatmap routine={r} completions={data.completions} today={today} />
      </div>

      {editing && <StepSheet routine={r} step={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {routineSheet && <RoutineSheet routine={r} onClose={() => setRoutineSheet(false)} />}
    </main>
  )
}

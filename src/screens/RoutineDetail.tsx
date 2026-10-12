import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Ember } from '../components/Ember'
import { Heatmap } from '../components/Heatmap'
import { flash } from '../components/Toast'
import { FlatButton, Label, StepRow, WeekLetters } from '../components/ui'
import { categoryText, routineTime } from '../data/select'
import { useData } from '../data/store'
import { daysLabel, logicalToday } from '../lib/date'
import { completionOf, consistency, isScheduled, MILESTONES, routineStreak, stepsOn } from '../lib/streak'

const Stat = ({ value, caption }: { value: React.ReactNode; caption: string }) => (
  <div>
    <div className="display" style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.035em', lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 11, color: 'var(--stat-caption)', fontWeight: 700, marginTop: 5 }}>{caption}</div>
  </div>
)

export function RoutineDetail() {
  const { id } = useParams()
  const data = useData()
  const navigate = useNavigate()
  const r = data.routines.find((x) => x.id === id)
  if (!r) return <Navigate to="/routines" replace />
  const today = logicalToday()
  const st = routineStreak(r, data.completions, today)
  const due = r.active && isScheduled(r, today)
  const c = completionOf(data.completions, r.id, today)
  const steps = due ? stepsOn(r, today) : r.steps

  const toggle = (stepId: string) => {
    const res = data.toggleStep(r.id, stepId)
    if (res.completedRoutine) {
      flash(`${r.name} done · ${res.streak} in a row`, MILESTONES.includes(res.streak) ? { label: 'See it', run: () => navigate(`/milestone?r=${r.id}`) } : undefined)
    }
  }
  const pause = () => {
    data.updateRoutine(r.id, { active: !r.active })
    flash(r.active ? `${r.name} paused · streak held at ${st.current}` : `${r.name} is back on`)
  }
  const remove = () => {
    if (!window.confirm(`Delete ${r.name}? Its history and streak go with it.`)) return
    data.deleteRoutine(r.id)
    navigate('/routines', { replace: true })
    flash(`${r.name} deleted`)
  }
  const skip = () => flash(data.skipDay(r.id) ? `${r.name} skipped today · streak untouched` : 'Two skips a week is the limit')

  return (
    <main className="screen">
      <div style={{ padding: 'calc(var(--safe-top) + 16px) var(--pad-x) 26px', background: `linear-gradient(170deg, var(--hero-${r.timeCategory}), var(--paper))` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" aria-label="Back" onClick={() => navigate('/routines')} style={{ fontSize: 20, lineHeight: 1, color: 'var(--ink)' }}>‹</button>
          <button type="button" onClick={() => navigate(`/routines/${r.id}/edit`)} style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--gold-text)' }}>Edit</button>
        </div>
        <h1 className="display" style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-.033em', margin: '16px 0 0', lineHeight: 1.1 }}>{r.name}</h1>
        <div style={{ fontSize: 13.5, color: 'var(--hero-sub)', marginTop: 5, fontWeight: 600 }}>{categoryText(r)} · {routineTime(r)} · {daysLabel(r.repeatPattern.days)}</div>
        {r.description && <div style={{ fontSize: 13.5, color: 'var(--muted-1)', marginTop: 8, lineHeight: 1.5 }}>{r.description}</div>}
        <div style={{ display: 'flex', gap: 24, marginTop: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Ember streak={r.active ? st.current : 0} size={24} />
            <div>
              <div className="display" style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.035em', lineHeight: 1 }}>{st.current}</div>
              <div style={{ fontSize: 11, color: 'var(--stat-caption)', fontWeight: 700, marginTop: 2 }}>Current</div>
            </div>
          </div>
          <Stat value={st.longest} caption="Longest" />
          <Stat value={st.completedDays} caption="Completed" />
          <Stat value={`${consistency([r], data.completions, today, 90)}%`} caption="90 days" />
        </div>
      </div>

      <div className="pad" style={{ paddingTop: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Label>Today’s steps</Label>
          {due && <button type="button" className="pill-ink" onClick={() => navigate(`/run?r=${r.id}`)}>Focus mode</button>}
        </div>
        {!due && (
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--muted-2)', fontWeight: 600 }}>
            {r.active ? `Not scheduled today · ${daysLabel(r.repeatPattern.days)}` : 'Paused. The streak is held until you resume.'}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 6 }}>
          {steps.map((s) => (
            due
              ? <StepRow key={s.id} title={s.title} minutes={s.duration} done={!!c?.completedStepIds.includes(s.id)} onToggle={() => toggle(s.id)} divided pad={13} />
              : (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 0', borderBottom: '1px solid var(--divider)' }}>
                  <span className="check-off" aria-hidden="true" />
                  <div style={{ flex: 1, fontSize: 15.5, fontWeight: 600 }}>{s.title}</div>
                  {!!s.duration && <div style={{ fontSize: 12.5, color: 'var(--muted-3)', fontWeight: 600 }}>{s.duration} min</div>}
                </div>
              )
          ))}
        </div>
        {due && !c?.skipped && (
          <button type="button" onClick={skip} style={{ marginTop: 12, fontSize: 12.5, fontWeight: 800, color: 'var(--muted-2)' }}>Skip today</button>
        )}
      </div>

      <div className="pad" style={{ paddingTop: 24 }}>
        <Label style={{ marginBottom: 12 }}>Last 5 weeks</Label>
        <WeekLetters gap={6} />
        <Heatmap routine={r} completions={data.completions} today={today} gap={6} radius={7} />
      </div>

      <div className="pad" style={{ paddingTop: 26, display: 'flex', gap: 9 }}>
        <FlatButton onClick={pause}>{r.active ? 'Pause' : 'Resume'}</FlatButton>
        <FlatButton tone="clay" onClick={remove}>Delete</FlatButton>
      </div>
    </main>
  )
}

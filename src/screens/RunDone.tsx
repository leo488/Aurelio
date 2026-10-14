import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Ember } from '../components/Ember'
import { completionFor, routinesOn, routineTime } from '../data/select'
import { useData } from '../data/store'
import { logicalToday, minutesOf } from '../lib/date'
import { isComplete, MILESTONES, progress, routineStreak } from '../lib/streak'

export function RunDone() {
  const data = useData()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const today = logicalToday()
  const r = data.routines.find((x) => x.id === params.get('r'))
  if (!r) return <Navigate to="/today" replace />
  const log = completionFor(data, r, today)
  const p = progress(r, today, log)
  const all = isComplete(r, today, log)
  const streak = routineStreak(r, data.completions, today).current
  const next = routinesOn(data, today).find((x) => x.id !== r.id && minutesOf(routineTime(x)) > minutesOf(routineTime(r)) && !isComplete(x, today, completionFor(data, x, today)))
  const milestone = all && MILESTONES.includes(streak)

  return (
    <main className="screen dark no-bar" style={{ background: 'var(--dark-milestone)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 42px', textAlign: 'center' }}>
        <Ember streak={streak} size={140} flicker />
        <h1 className="display" style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.03em', margin: '34px 0 0', lineHeight: 1.2 }}>
          {all ? `${r.name} done` : `${r.name}: ${p.done} of ${p.total} for now`}
        </h1>
        <div style={{ fontSize: 14.5, color: 'var(--muted-back)', marginTop: 14, lineHeight: 1.6 }}>
          {all ? `${streak} in a row. ` : 'The rest stays on Today. It still counts until 4am. '}
          {next ? `${next.name} is next at ${routineTime(next)}.` : 'That was the last one today.'}
        </div>
      </div>
      <div className="pad dark-bottom" style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {milestone && <button type="button" className="btn-gold" onClick={() => navigate(`/milestone?r=${r.id}`)}>See the milestone</button>}
        <button type="button" className={milestone ? 'btn-dark-text' : 'btn-gold'} onClick={() => navigate('/today')}>Back to today</button>
        {!milestone && <button type="button" className="btn-dark-text" onClick={() => navigate('/streak')}>See streaks</button>}
      </div>
    </main>
  )
}

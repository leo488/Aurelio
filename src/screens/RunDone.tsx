import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Ember } from '../components/Ember'
import { useMe } from '../data/session'
import { logOf, routinesOn } from '../data/select'
import { useData } from '../data/store'
import { logicalToday, looseTime, minutesOf } from '../lib/date'
import { liveStreak, MILESTONES, progress } from '../lib/streak'
import { numberWordLower } from '../lib/words'

export function RunDone() {
  const data = useData()
  const { me } = useMe()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const today = logicalToday()
  const r = data.routines.find((x) => x.id === params.get('r'))
  if (!r) return <Navigate to="/today" replace />
  const log = logOf(data, r)
  const p = progress(r, today, log)
  const streak = liveStreak(r, today, log)
  const all = p.done === p.total
  const minutes = log?.startedAt && log.finishedAt ? Math.max(1, Math.round((log.finishedAt - log.startedAt) / 60000)) : null
  const nextRoutine = routinesOn(data, me, today).find((x) => x.id !== r.id && minutesOf(x.time) > minutesOf(r.time) && x.owner === me)

  const headline = all
    ? minutes ? <>{r.name} done<br />in {minutes} minute{minutes === 1 ? '' : 's'}</> : <>{r.name} done</>
    : <>{r.name}: {numberWordLower(p.done)} of {numberWordLower(p.total)}<br />done for now</>
  const sub = all
    ? `That’s ${streak} in a row.${nextRoutine ? ` ${nextRoutine.name} is at ${looseTime(nextRoutine.time)}.` : ''}`
    : 'The rest stays on Today. It still counts until 4am.'

  return (
    <main className="screen dark no-bar" style={{ background: 'var(--dark-milestone)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 42px', textAlign: 'center' }}>
        <Ember streak={all ? streak : r.streak.current} size={150} flicker hero />
        <h1 className="display" style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.03em', margin: '34px 0 0', lineHeight: 1.2 }}>{headline}</h1>
        <div style={{ fontSize: 14.5, color: 'var(--muted-back)', marginTop: 14, lineHeight: 1.6 }}>{sub}</div>
      </div>
      <div className="pad dark-bottom" style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {all && MILESTONES.includes(streak) && (
          <button type="button" className="btn-gold" onClick={() => navigate(`/milestone?r=${r.id}`)}>See the milestone</button>
        )}
        <button type="button" className={all && MILESTONES.includes(streak) ? 'btn-dark-text' : 'btn-gold'} onClick={() => navigate('/today')}>Back to today</button>
      </div>
    </main>
  )
}

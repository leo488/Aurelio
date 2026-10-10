import { useNavigate, useSearchParams } from 'react-router-dom'
import { Ember } from '../components/Ember'
import { flash } from '../components/Toast'
import { useMe } from '../data/session'
import { logOf, myRoutines } from '../data/select'
import { useData } from '../data/store'
import { addDays, dayMonth, logicalToday } from '../lib/date'
import { routinePlural } from '../lib/labels'
import { liveStreak } from '../lib/streak'
import { numberWord } from '../lib/words'

/** Shown at 7, 25, 50 and 100. No confetti. */
export function Milestone() {
  const data = useData()
  const { me, partner, partnerName } = useMe()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const today = logicalToday()
  const r = data.routines.find((x) => x.id === params.get('r')) ?? myRoutines(data, me).find((x) => x.owner === me)
  if (!r) return null
  const n = liveStreak(r, today, logOf(data, r))
  const since = dayMonth(addDays(today, -(n - 1)))
  const toRecord = r.streak.longest - n + 1
  const record = toRecord > 0 ? `${numberWord(toRecord)} more and you beat your own record.` : 'That’s your longest run yet.'

  const tell = () => {
    data.addActivity({ who: me, kind: 'streak', text: 'reached', value: n, routineId: r.id })
    data.pushNotice(partner, { kind: 'partner', title: `${me === 'leo' ? 'Leo' : 'Soniya'} reached ${n} ${routinePlural(r.name)} in a row`, meta: '' })
    navigate('/together')
    flash(`Sent to ${partnerName}`)
  }

  return (
    <main className="screen dark no-bar" style={{ background: 'var(--dark-milestone)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 42px', textAlign: 'center' }}>
        <Ember streak={n} size={176} flicker hero />
        <div className="display" style={{ fontSize: 64, fontWeight: 800, letterSpacing: '-.05em', lineHeight: 1, marginTop: 34 }}>{n}</div>
        <div className="display" style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-.025em', marginTop: 10 }}>{routinePlural(r.name)} in a row</div>
        <div style={{ fontSize: 14.5, color: 'var(--muted-back)', marginTop: 14, lineHeight: 1.6 }}>Since {since}. {record}</div>
      </div>
      <div className="pad dark-bottom" style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        <button type="button" className="btn-gold" onClick={tell}>Tell {partnerName}</button>
        <button type="button" className="btn-dark-text" onClick={() => navigate('/today')}>Close</button>
      </div>
    </main>
  )
}

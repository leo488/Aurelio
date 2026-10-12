import { Navigate, useNavigate } from 'react-router-dom'
import { Ember } from '../components/Ember'
import { Ori } from '../components/Ori'
import { useMe } from '../data/session'
import { useData } from '../data/store'
import { logicalToday } from '../lib/date'
import { headerDate } from '../components/ui'
import { greeting } from '../lib/greeting'

/** Leo's first day, before anything is lit. */
export function EmptyDay() {
  const { name } = useMe()
  const navigate = useNavigate()
  const hasRoutines = useData((s) => s.routines.length > 0)
  if (hasRoutines) return <Navigate to="/today" replace />

  return (
    <main className="screen" style={{ background: 'var(--wash-empty)' }}>
      <div className="pad top">
        <div className="eyebrow">{headerDate(logicalToday())}</div>
        <h1 className="display" style={{ fontSize: 29, fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.1, margin: '3px 0 0' }}>{greeting()}, {name}</h1>
      </div>
      <div style={{ padding: '60px 36px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <Ember streak={0} size={64} />
        <div className="display" style={{ fontSize: 23, fontWeight: 700, letterSpacing: '-.025em', marginTop: 18 }}>No routines yet</div>
        <div style={{ fontSize: 14, color: 'var(--muted-2)', lineHeight: 1.6, marginTop: 8 }}>Build one by hand, or tap Ori and say what you want.</div>
      </div>
      <div className="pad" style={{ paddingTop: 20, display: 'flex', flexDirection: 'column' }}>
        <button type="button" onClick={() => navigate('/routines/new')} style={{ alignSelf: 'center', background: 'var(--ink)', color: 'var(--paper)', fontSize: 14, fontWeight: 800, padding: '14px 22px', borderRadius: 12 }}>Create a routine</button>
        <button type="button" className="ori-card" style={{ marginTop: 16 }} onClick={() => navigate('/routines/new', { state: { ask: true } })}>
          <Ori size={26} />
          <div style={{ fontSize: 13.5, color: 'var(--chip-suggest-text)', lineHeight: 1.45 }}>“Create a 30-minute morning routine for me.”</div>
        </button>
      </div>
    </main>
  )
}

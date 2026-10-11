import { Navigate, useNavigate } from 'react-router-dom'
import { Ember } from '../components/Ember'
import { Icon } from '../components/Icon'
import { Ori } from '../components/Ori'
import { useMe } from '../data/session'
import { useData } from '../data/store'
import { eyebrowDate, logicalToday } from '../lib/date'
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
        <div className="eyebrow">{eyebrowDate(logicalToday())}</div>
        <h1 className="title-30" style={{ marginTop: 4 }}>{greeting()}, {name}</h1>
      </div>
      <div style={{ padding: '52px 32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <Ember streak={0} size={76} coldColor="#CFC3AF" />
        <div className="display" style={{ fontSize: 25, fontWeight: 700, letterSpacing: '-.028em', marginTop: 24 }}>Nothing lit yet</div>
        <div style={{ fontSize: 14.5, color: 'var(--muted-2)', lineHeight: 1.6, marginTop: 10 }}>Build your first routine by hand, or tell Ori what you want and review the draft.</div>
      </div>
      <div className="pad" style={{ paddingTop: 36, display: 'flex', flexDirection: 'column' }}>
        <button type="button" className="list-row" style={{ padding: '16px 0', borderBottom: '1px solid var(--divider)' }} onClick={() => navigate('/routines/new')}>
          <Icon name="plus" size={21} /><div style={{ fontSize: 15, fontWeight: 700 }}>Create a routine</div>
        </button>
        <button type="button" className="ori-card" style={{ marginTop: 16 }} onClick={() => navigate('/routines/new', { state: { ask: true } })}>
          <Ori size={26} />
          <div style={{ fontSize: 13.5, color: 'var(--chip-suggest-text)', lineHeight: 1.45 }}>“Create a 30-minute morning routine for me.”</div>
        </button>
      </div>
    </main>
  )
}

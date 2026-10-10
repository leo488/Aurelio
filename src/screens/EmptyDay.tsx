import { useNavigate } from 'react-router-dom'
import { Ember } from '../components/Ember'
import { Icon } from '../components/Icon'
import { flash } from '../components/Toast'
import { pronoun, useMe } from '../data/session'
import { useData } from '../data/store'
import { eyebrowDate, logicalToday } from '../lib/date'
import { greeting } from '../lib/greeting'
import { numberWordLower } from '../lib/words'

/** The first day, before anything is lit. */
export function EmptyDay() {
  const data = useData()
  const { me, partner, name, partnerName } = useMe()
  const navigate = useNavigate()
  const theirMorning = data.routines.find((r) => r.owner === partner && !r.paused)

  const copy = () => {
    if (!theirMorning) return
    const r = data.copyRoutine(theirMorning.id, me)
    if (r) navigate(`/routines/${r.id}`)
    flash('Copied — edit anything you like')
  }

  return (
    <main className="screen" style={{ background: 'var(--wash-empty)' }}>
      <div className="pad top">
        <div className="eyebrow">{eyebrowDate(logicalToday())}</div>
        <h1 className="title-30" style={{ marginTop: 4 }}>{greeting()}, {name}</h1>
      </div>
      <div style={{ padding: '52px 32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <Ember streak={0} size={76} coldColor="#CFC3AF" />
        <div className="display" style={{ fontSize: 25, fontWeight: 700, letterSpacing: '-.028em', marginTop: 24 }}>Nothing lit yet</div>
        <div style={{ fontSize: 14.5, color: 'var(--muted-2)', lineHeight: 1.6, marginTop: 10 }}>Build a routine by hand, or hold Ori and say what your day usually looks like.</div>
      </div>
      <div className="pad" style={{ paddingTop: 36, display: 'flex', flexDirection: 'column' }}>
        <button type="button" className="list-row" style={{ padding: '16px 0' }} onClick={() => navigate('/routines/new')}>
          <Icon name="plus" size={21} /><div style={{ fontSize: 15, fontWeight: 700 }}>Create a routine</div>
        </button>
        <button type="button" className="list-row" style={{ padding: '16px 0', borderBottom: '1px solid var(--divider)' }} onClick={() => navigate('/tasks/new')}>
          <Icon name="plus" size={21} /><div style={{ fontSize: 15, fontWeight: 700 }}>Add a task or class</div>
        </button>
        {theirMorning && (
          <button type="button" onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 16, marginTop: 16, borderRadius: 20, background: 'var(--shared-bg)', width: '100%', textAlign: 'left' }}>
            <Icon name="together" size={21} color="#A97C34" />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--shared-text)' }}>Start from {partnerName}’s {theirMorning.name.toLowerCase()}</div>
              <div style={{ fontSize: 12, color: 'var(--shared-text-2)', marginTop: 2 }}>Copy {pronoun[partner].their} {numberWordLower(theirMorning.items.length)} items, edit after</div>
            </div>
          </button>
        )}
      </div>
    </main>
  )
}

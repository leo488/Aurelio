import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Chip } from '../components/controls'
import { Ember } from '../components/Ember'
import { Heatmap } from '../components/Heatmap'
import { useMe } from '../data/session'
import { logOf, myRoutines } from '../data/select'
import { useData } from '../data/store'
import { logicalToday, WEEKDAY_LETTER } from '../lib/date'
import { liveStreak } from '../lib/streak'

export function Streak() {
  const data = useData()
  const { me } = useMe()
  const today = logicalToday()
  const routines = myRoutines(data, me).filter((r) => !r.paused)
  const [id, setId] = useState(routines[0]?.id)
  const r = routines.find((x) => x.id === id) ?? routines[0]

  return (
    <main className="screen" style={{ background: 'linear-gradient(180deg, #F1E4CF 0%, #F6F1E9 32%)' }}>
      <div className="pad top"><h1 className="title">Consistency</h1></div>
      {r ? (
        <>
          <div className="pad" style={{ paddingTop: 26, display: 'flex', alignItems: 'center', gap: 20 }}>
            <Ember streak={Math.max(liveStreak(r, today, logOf(data, r)), 0)} size={86} flicker />
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <div className="display" style={{ fontSize: 58, fontWeight: 800, letterSpacing: '-.05em', lineHeight: 0.9 }}>{liveStreak(r, today, logOf(data, r))}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted-2)' }}>days lit</div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted-1)', marginTop: 8 }}>{r.name} · longest {Math.max(r.streak.longest, liveStreak(r, today, logOf(data, r)))}</div>
            </div>
          </div>
          <div className="pad" style={{ paddingTop: 22, display: 'flex', gap: 8, overflowX: 'auto' }}>
            {routines.map((x) => <Chip key={x.id} active={x.id === r.id} onClick={() => setId(x.id)}>{x.name}</Chip>)}
          </div>
          <div className="pad" style={{ paddingTop: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 7, fontSize: 10, color: 'var(--muted-3)', fontWeight: 800, textAlign: 'center', marginBottom: 10 }}>
              {WEEKDAY_LETTER.map((l, i) => <div key={i}>{l}</div>)}
            </div>
            <Heatmap routine={r} logs={data.logs} today={today} gap={7} />
            <div style={{ display: 'flex', gap: 16, marginTop: 18, flexWrap: 'wrap' }}>
              {[['#6E7F63', 'Full'], ['#B6C0AE', 'Partial'], ['#E4DBCC', 'Missed']].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--muted-2)', fontWeight: 700 }}>
                  <div style={{ width: 11, height: 11, borderRadius: 3, background: c }} />{l}
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--muted-2)', fontWeight: 700 }}>
                <div style={{ width: 11, height: 11, borderRadius: 3, border: '1.4px dashed #CBC0AE' }} />Skipped
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted-2)', lineHeight: 1.6, marginTop: 16 }}>
              A full day adds one. Doing 60% or more holds the streak; less than that resets it, but your longest run is kept. Two skips a week don’t count against you.
            </div>
            <Link to="/missed" style={{ display: 'block', marginTop: 22, width: '100%', background: 'var(--chip-alt-2)', color: 'var(--chip-suggest-text)', fontSize: 13, fontWeight: 700, padding: 14, borderRadius: 16, textAlign: 'center' }}>
              See what a broken streak looks like
            </Link>
          </div>
        </>
      ) : (
        <div className="pad" style={{ paddingTop: 24, fontSize: 14, color: 'var(--muted-2)' }}>No routines yet, so nothing to count.</div>
      )}
    </main>
  )
}

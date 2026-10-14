import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chip } from '../components/controls'
import { Ember } from '../components/Ember'
import { Heatmap } from '../components/Heatmap'
import { FlatButton, heatStyle, ScreenHeader, WeekLetters } from '../components/ui'
import { useData } from '../data/store'
import { daysLabel, logicalToday } from '../lib/date'
import { consistency, routineStreak } from '../lib/streak'

const Stat = ({ value, caption }: { value: React.ReactNode; caption: string }) => (
  <div style={{ padding: '12px 0', borderTop: '1px solid var(--divider)' }}>
    <div className="display" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.03em' }}>{value}</div>
    <div style={{ fontSize: 11.5, color: 'var(--muted-2)', fontWeight: 700, marginTop: 2 }}>{caption}</div>
  </div>
)

const LEGEND: [React.CSSProperties, string][] = [
  [heatStyle('full', 3), 'Done'], [heatStyle('partial', 3), 'Partial'], [heatStyle('missed', 3), 'Missed'], [heatStyle('off', 3), 'Not scheduled'],
]

/** Each routine's run, its records and the last five weeks. */
export function Streak() {
  const data = useData()
  const navigate = useNavigate()
  const today = logicalToday()
  const routines = data.routines.filter((r) => r.active)
  const [id, setId] = useState(routines[0]?.id)
  const r = routines.find((x) => x.id === id) ?? routines[0]
  const st = r ? routineStreak(r, data.completions, today) : null

  return (
    <main className="screen" style={{ background: 'var(--wash-streak)' }}>
      <ScreenHeader title="Streaks" />
      {r && st ? (
        <>
          <div className="pad" style={{ paddingTop: 16, display: 'flex', gap: 8, overflowX: 'auto' }}>
            {routines.map((x) => <Chip key={x.id} active={x.id === r.id} onClick={() => setId(x.id)}>{x.name}</Chip>)}
          </div>
          <div className="pad" style={{ paddingTop: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
            <Ember streak={st.current} size={84} flicker style={{ filter: 'var(--glow-ember)' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <div className="display" style={{ fontSize: 58, fontWeight: 800, letterSpacing: '-.05em', lineHeight: 0.9 }}>{st.current}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted-2)' }}>in a row</div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted-1)', marginTop: 8 }}>{r.name} · {daysLabel(r.repeatPattern.days)}</div>
            </div>
          </div>
          <div className="pad" style={{ paddingTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <Stat value={st.longest} caption="Longest" />
            <Stat value={st.completedDays} caption="Completed" />
            <Stat value={`${consistency([r], data.completions, today, 90)}%`} caption="90 days" />
          </div>
          <div className="pad" style={{ paddingTop: 18 }}>
            <WeekLetters gap={7} marginBottom={10} />
            <Heatmap routine={r} completions={data.completions} today={today} gap={7} radius={9} />
            <div style={{ display: 'flex', gap: 14, marginTop: 16, flexWrap: 'wrap' }}>
              {LEGEND.map(([s, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--muted-2)', fontWeight: 700 }}>
                  <div style={{ ...s, width: 11, height: 11, aspectRatio: undefined }} />{l}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted-2)', lineHeight: 1.6, marginTop: 14 }}>
              Streaks count scheduled days only, so days off never break a run. 60% of a day’s steps holds the streak, and two skips a week don’t count against you.
            </div>
          </div>
          <div className="pad" style={{ paddingTop: 20, display: 'flex', gap: 9 }}>
            <FlatButton style={{ fontSize: 13.5 }} onClick={() => navigate(`/milestone?r=${r.id}`)}>Last milestone</FlatButton>
            <FlatButton style={{ fontSize: 13.5 }} onClick={() => navigate('/missed')}>After a miss</FlatButton>
          </div>
        </>
      ) : (
        <div className="pad" style={{ paddingTop: 24, fontSize: 14, color: 'var(--muted-2)' }}>No routines yet, so nothing to count.</div>
      )}
    </main>
  )
}

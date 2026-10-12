import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../data/store'
import { isoWeek, weekday, weekKey, WEEKDAY_LETTER } from '../lib/date'
import { WeekGoalsSheet } from '../sheets/WeekGoalsSheet'
import { Icon } from './Icon'
import { Ring } from './ui'

/** The streak as a flickering fire emoji over a soft glow; grey and still before the first day. */
export function Fire({ lit, size }: { lit: boolean; size: number }) {
  return (
    <span className={lit ? 'fire lit' : 'fire'} style={{ fontSize: size, width: size * 1.25, height: size * 1.25 }} aria-hidden="true">
      <span className="fire-glow" />
      <span className="fire-emoji">🔥</span>
    </span>
  )
}

function Shell({ eyebrow, to, onClick, accent, children, label }: { eyebrow: React.ReactNode; to?: string; onClick?: () => void; accent?: React.ReactNode; children: React.ReactNode; label?: string }) {
  const body = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, minHeight: 16 }}>
        <span className="stat-eyebrow">{eyebrow}</span>
        {accent}
      </div>
      {children}
    </>
  )
  if (to) return <Link to={to} className="card stat-card tappable" aria-label={label}>{body}</Link>
  if (onClick) return <button type="button" onClick={onClick} className="card stat-card tappable" aria-label={label}>{body}</button>
  return <div className="card stat-card">{body}</div>
}

const Value = ({ children, caption }: { children: React.ReactNode; caption: string }) => (
  <div style={{ marginTop: 'auto' }}>
    <div className="display" style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.035em', lineHeight: 1 }}>{children}</div>
    <div style={{ fontSize: 11.5, color: 'var(--muted-2)', fontWeight: 700, marginTop: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{caption}</div>
  </div>
)

/** The three cards at the top of each Today: today's progress, the streak, and this week's goals. */
export function StatCards({ done, total, unit, streak, streakCaption, streakTo, today }: { done: number; total: number; unit: string; streak: number; streakCaption: string; streakTo: string; today: string }) {
  const goals = useData((s) => s.goals)
  const [open, setOpen] = useState(false)
  const wk = isoWeek(today)
  const key = weekKey(today)
  const mine = goals.filter((g) => g.week === key)
  const hit = mine.filter((g) => g.done).length
  const pct = total ? Math.round((done / total) * 100) : 0
  const dayIdx = weekday(today)

  return (
    <>
      <div className="pad" style={{ paddingTop: 22, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 9 }}>
        <Shell eyebrow="Today">
          <div style={{ marginTop: 10 }}>
            <Ring pct={pct} size={46} r={18.5} width={5}>
              <span style={{ fontSize: 11, fontWeight: 800, color: done && done === total ? 'var(--gold-text)' : 'var(--muted-1)' }}>{pct}%</span>
            </Ring>
          </div>
          <Value caption={`${unit} done`}>{done}<span style={{ fontSize: 15, color: 'var(--muted-2)' }}>/{total}</span></Value>
        </Shell>

        <Shell eyebrow="Streak" to={streakTo} label={`${streak} ${streakCaption.toLowerCase()}`}
          accent={<span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1, color: 'var(--muted-3)', fontWeight: 700 }}>›</span>}>
          <div style={{ marginTop: 6, marginLeft: -4 }}><Fire lit={streak > 0} size={34} /></div>
          <Value caption={streakCaption}>{streak}<span style={{ fontSize: 14, color: 'var(--muted-2)', marginLeft: 3 }}>{streak === 1 ? 'day' : 'days'}</span></Value>
        </Shell>

        <Shell eyebrow={`Week ${wk.week}`} onClick={() => setOpen(true)} label={`Week ${wk.week} goals, ${hit} of ${mine.length} done`}
          accent={<span className="goal-plus" aria-hidden="true"><Icon name="plus" size={11} stroke={2.4} color="var(--paper)" /></span>}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginTop: 14 }} aria-hidden="true">
            {WEEKDAY_LETTER.map((l, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div className={i === dayIdx ? 'wk-dot today' : i < dayIdx ? 'wk-dot past' : 'wk-dot'} />
                <div style={{ fontSize: 8.5, fontWeight: 800, color: i === dayIdx ? 'var(--gold-text)' : 'var(--muted-4)', marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>
          {mine.length ? (
            <Value caption={hit === mine.length ? 'Goals all done' : 'Weekly goals'}>{hit}<span style={{ fontSize: 15, color: 'var(--muted-2)' }}>/{mine.length}</span></Value>
          ) : (
            <Value caption={`of ${wk.of} · ${wk.year}`}><span style={{ fontSize: 15, color: 'var(--gold-text)' }}>Set goals</span></Value>
          )}
        </Shell>
      </div>
      {open && <WeekGoalsSheet today={today} onClose={() => setOpen(false)} />}
    </>
  )
}

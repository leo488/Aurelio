import { Link } from 'react-router-dom'
import { isoWeek } from '../lib/date'
import { Ember } from './Ember'
import { Ring } from './ui'

/** The streak as a flickering fire emoji over a soft glow; grey and still before the first day. */
export function Fire({ lit, size }: { lit: boolean; size: number }) {
  return (
    <span className={lit ? 'fire lit' : 'fire'} style={{ fontSize: size, width: size * 1.2, height: size * 1.2 }} aria-hidden="true">
      <span className="fire-glow" />
      <span className="fire-emoji">🔥</span>
    </span>
  )
}

const StatCard = ({ to, visual, value, caption, label }: { to?: string; visual: React.ReactNode; value: React.ReactNode; caption: string; label?: string }) => {
  const body = (
    <>
      <div style={{ height: 40, display: 'flex', alignItems: 'center' }}>{visual}</div>
      <div className="display" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1, marginTop: 12 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: 'var(--muted-2)', fontWeight: 700, marginTop: 5 }}>{caption}</div>
    </>
  )
  const style: React.CSSProperties = { padding: '15px 13px 14px', minWidth: 0, color: 'inherit', display: 'block' }
  return to ? <Link to={to} className="card" style={style} aria-label={label}>{body}</Link> : <div className="card" style={style}>{body}</div>
}

/**
 * The three cards at the top of each Today: today's progress, the streak, and the week of the year.
 * `fire` swaps the streak mark for the animated fire; `weekTo` makes the week card open that page.
 */
export function StatCards({ done, total, unit, streak, streakCaption, streakTo, today, fire, weekTo }: { done: number; total: number; unit: string; streak: number; streakCaption: string; streakTo: string; today: string; fire?: boolean; weekTo?: string }) {
  const wk = isoWeek(today)
  return (
    <div className="pad" style={{ paddingTop: 22, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 9 }}>
      <StatCard visual={<Ring pct={total ? (done / total) * 100 : 0} size={40} r={16} width={4.5} />}
        value={<>{done}<span style={{ fontSize: 15, color: 'var(--muted-2)' }}>/{total}</span></>} caption={`${unit} done`} />
      <StatCard to={streakTo} visual={fire ? <Fire lit={streak > 0} size={32} /> : <Ember streak={streak} size={36} />} value={streak} caption={streakCaption} />
      <StatCard to={weekTo} label={weekTo ? `Week ${wk.week}: weekly goals` : undefined} visual={<Ring pct={(wk.week / wk.of) * 100} size={40} r={16} width={4.5} glow={false} />}
        value={<><span style={{ fontSize: 13, color: 'var(--muted-2)', marginRight: 3 }}>Wk</span>{wk.week}</>} caption={`of ${wk.of} · ${wk.year}`} />
    </div>
  )
}

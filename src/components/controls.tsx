import { Ember } from './Ember'

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`toggle${on ? ' on' : ''}`} onClick={() => onChange(!on)}>
      <span className="knob" />
    </button>
  )
}

export function Chip({ active, onClick, children, soft }: { active?: boolean; onClick?: () => void; children: React.ReactNode; soft?: boolean }) {
  return (
    <button type="button" className={`chip${active ? ' active' : ''}${soft ? ' soft' : ''}`} onClick={onClick} aria-pressed={active}>
      {children}
    </button>
  )
}

/** 22px round checkbox; pops in olive when done. Overdue items get a clay ring. */
export function Check({ done, overdue, style }: { done: boolean; overdue?: boolean; style?: React.CSSProperties }) {
  if (done) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" style={{ flex: '0 0 auto', animation: 'pop-in .22s ease', ...style }} aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="#6E7F63" />
        <path d="M7.5 12.4l3 3 6-6.4" stroke="#F6F1E9" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    )
  }
  return <span className="check-off" style={{ borderColor: overdue ? '#D9B5A6' : '#DCD2C4', ...style }} aria-hidden="true" />
}

/** 74px conic progress ring with the percentage in the middle. */
export function ProgressRing({ pct, size = 74, inset = 7, track = '#E6DCCB', hole = '#F6F1E9', children }: { pct: number; size?: number; inset?: number; track?: string; hole?: string; children?: React.ReactNode }) {
  const deg = pct * 3.6
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: '0 0 auto', borderRadius: '50%', transition: 'background .4s', background: `conic-gradient(#C79A4A 0deg ${deg}deg, ${track} ${deg}deg 360deg)` }}>
      <div style={{ position: 'absolute', inset, borderRadius: '50%', background: hole, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {children ?? <div className="display" style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.03em' }}>{pct}%</div>}
      </div>
    </div>
  )
}

export function StreakMark({ n, size = 17, numSize = 19 }: { n: number; size?: number; numSize?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <Ember streak={n} size={size} />
      <div className="display" style={{ fontSize: numSize, fontWeight: 800, letterSpacing: '-.03em' }}>{n}</div>
    </div>
  )
}

export function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="label" style={style}>{children}</div>
}

/** "Label ……… value ›" row used across settings and forms. */
export function Row({ title, sub, value, onClick, right, last }: { title: React.ReactNode; sub?: React.ReactNode; value?: React.ReactNode; onClick?: () => void; right?: React.ReactNode; last?: boolean }) {
  const inner = (
    <>
      <div style={{ textAlign: 'left' }}>
        <div className="row-title-sm">{title}</div>
        {sub && <div className="row-sub">{sub}</div>}
      </div>
      {right ?? (value !== undefined && <div className="row-value">{value}</div>)}
    </>
  )
  const cls = `setting-row${last ? ' last' : ''}`
  return onClick ? <button type="button" className={cls} onClick={onClick}>{inner}</button> : <div className={cls}>{inner}</div>
}

export function BackButton({ onClick, color = '#1A1714' }: { onClick: () => void; color?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label="Back" style={{ fontSize: 19, color, lineHeight: 1, padding: '2px 8px 2px 0' }}>‹</button>
  )
}

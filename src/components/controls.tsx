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
        <circle cx="12" cy="12" r="11" fill="var(--olive)" />
        <path d="M7.5 12.4l3 3 6-6.4" stroke="var(--paper)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    )
  }
  return <span className="check-off" style={{ borderColor: overdue ? 'var(--clay-pale)' : 'var(--checkbox-off)', ...style }} aria-hidden="true" />
}

/** 74px conic progress ring with the percentage in the middle. The hole is cut out, so the screen shows through. */
export function ProgressRing({ pct, size = 74, inset = 7, track = 'var(--ring-track)', children }: { pct: number; size?: number; inset?: number; track?: string; children?: React.ReactNode }) {
  const deg = pct * 3.6
  const cut = `radial-gradient(farthest-side, transparent calc(100% - ${inset}px), #000 calc(100% - ${inset - 0.5}px))`
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: '0 0 auto' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: track, WebkitMask: cut, mask: cut }} />
      {/* The glow sits on a wrapper: a mask would otherwise clip it. */}
      <div style={{ position: 'absolute', inset: 0, filter: 'var(--glow-ring)' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `conic-gradient(var(--gold) 0deg ${deg}deg, transparent ${deg}deg 360deg)`, WebkitMask: cut, mask: cut }} />
      </div>
      <div style={{ position: 'absolute', inset, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
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

export function BackButton({ onClick, color = 'var(--ink)' }: { onClick: () => void; color?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label="Back" style={{ fontSize: 19, color, lineHeight: 1, padding: '2px 8px 2px 0' }}>‹</button>
  )
}

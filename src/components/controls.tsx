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
        <path d="M7.5 12.4l3 3 6-6.4" stroke="var(--check-mark)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    )
  }
  return <span className="check-off" style={{ borderColor: overdue ? 'var(--clay-pale)' : 'var(--checkbox-off)', ...style }} aria-hidden="true" />
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

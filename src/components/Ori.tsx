export type OriState = 'calm' | 'listening' | 'thinking'

const EYE = '#241B0C'

/**
 * Ori, the gold assistant. Large calm faces (≥76) and the small toast/bubble faces use
 * slightly different eye sizes in the prototype; both are reproduced here.
 */
export function Ori({ state = 'calm', size, animate, style }: { state?: OriState; size: number; animate?: boolean; style?: React.CSSProperties }) {
  const svgStyle: React.CSSProperties = { flex: '0 0 auto', ...style }
  if (animate && state !== 'thinking') svgStyle.animation = `ori-breathe ${state === 'listening' ? 3 : 3.4}s ease-in-out infinite`

  if (state === 'listening') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" style={svgStyle} aria-label="Ori is listening">
        <circle cx="50" cy="50" r="46" fill="url(#oriG)" />
        <ellipse cx="38" cy="45" rx="4.6" ry="7" fill={EYE} />
        <ellipse cx="62" cy="45" rx="4.6" ry="7" fill={EYE} />
        <ellipse cx="50" cy="64" rx="7" ry="8.5" fill={EYE} />
        <ellipse cx="34" cy="33" rx="9" ry="6" fill="#FFFFFF" opacity=".26" transform="rotate(-25 34 33)" />
      </svg>
    )
  }
  if (state === 'thinking') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" style={svgStyle} aria-label="Ori is thinking">
        <circle cx="50" cy="50" r="46" fill="url(#oriG)" />
        <path d="M31 46c3-3 8-3 11 0" stroke={EYE} strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M58 46c3-3 8-3 11 0" stroke={EYE} strokeWidth="4" strokeLinecap="round" fill="none" />
        <ellipse cx="50" cy="65" rx="5" ry="3.4" fill={EYE} />
      </svg>
    )
  }
  const small = size <= 26
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={svgStyle} aria-label="Ori">
      <circle cx="50" cy="50" r="46" fill="url(#oriG)" />
      <ellipse cx="38" cy="47" rx={small ? 5 : 4.6} ry={small ? 6.5 : 6} fill={EYE} />
      <ellipse cx="62" cy="47" rx={small ? 5 : 4.6} ry={small ? 6.5 : 6} fill={EYE} />
      <path d="M43 63c4 4 10 4 14 0" stroke={EYE} strokeWidth={small ? 3.4 : 3} strokeLinecap="round" fill="none" />
    </svg>
  )
}

/** Listening Ori with the two expanding rings. */
export function OriListening({ size = 150 }: { size?: number }) {
  const ring: React.CSSProperties = {
    position: 'absolute', width: size, height: size, borderRadius: '50%', border: '1.5px solid #C79A4A',
    animation: 'ori-ring 2.6s ease-out infinite',
  }
  return (
    <div style={{ position: 'relative', width: size + 30, height: size + 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={ring} />
      <div style={{ ...ring, animationDelay: '1.3s' }} />
      <Ori state="listening" size={size} animate />
    </div>
  )
}

/** Thinking Ori with the two orbiting motes. */
export function OriThinking({ size = 132 }: { size?: number }) {
  const box = size + 58
  return (
    <div style={{ position: 'relative', width: box, height: box, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', width: box, height: box, animation: 'ori-orbit 5s linear infinite' }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', marginLeft: -4, width: 8, height: 8, borderRadius: '50%', background: '#C79A4A' }} />
        <div style={{ position: 'absolute', bottom: 14, left: 14, width: 5, height: 5, borderRadius: '50%', background: '#8A7A5C' }} />
      </div>
      <Ori state="thinking" size={size} />
    </div>
  )
}

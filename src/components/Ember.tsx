const FLAME_24 = 'M12 3.4c3.2 3.4 5.6 6 5.6 9.2A5.6 5.6 0 0 1 12 18.2a5.6 5.6 0 0 1-5.6-5.6c0-3.2 2.4-5.8 5.6-9.2Z'
const CORE_24 = 'M12 10c1.5 1.6 2.4 2.7 2.4 4.1a2.4 2.4 0 0 1-4.8 0c0-1.4.9-2.5 2.4-4.1Z'
const FLAME_28 = 'M14 5.4c3 3.2 5.2 5.6 5.2 8.6A5.2 5.2 0 0 1 14 19.2a5.2 5.2 0 0 1-5.2-5.2c0-3 2.2-5.4 5.2-8.6Z'
const CORE_28 = 'M14 11.6c1.4 1.5 2.2 2.5 2.2 3.8a2.2 2.2 0 0 1-4.4 0c0-1.3.8-2.3 2.2-3.8Z'

interface Props {
  /** The streak number; picks the state: cold at 0, warm under 7, lit under 25, ringed from 25. */
  streak: number
  size: number
  flicker?: boolean
  style?: React.CSSProperties
}

/** The streak mark, as in the design: em-cold, em-warm, em-lit and em-ring. */
export function Ember({ streak, size, flicker, style }: Props) {
  const s: React.CSSProperties = { flex: '0 0 auto', ...style }
  if (flicker) s.animation = 'ember-flicker 3.2s ease-in-out infinite'
  if (streak <= 0) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={s} aria-hidden="true">
        <path d={FLAME_24} stroke="var(--ember-cold)" strokeWidth="1.5" fill="none" />
      </svg>
    )
  }
  if (streak < 7) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={s} aria-hidden="true">
        <path d={FLAME_24} fill="var(--ember-warm)" />
      </svg>
    )
  }
  if (streak < 25) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={s} aria-hidden="true">
        <path d={FLAME_24} fill="var(--gold)" />
        <path d={CORE_24} fill="var(--ember-core)" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" style={s} aria-hidden="true">
      <circle cx="14" cy="14" r="12.4" stroke="var(--gold)" strokeWidth="1.2" fill="none" strokeDasharray="3 3.4" />
      <path d={FLAME_28} fill="var(--gold)" />
      <path d={CORE_28} fill="var(--ember-core)" />
    </svg>
  )
}

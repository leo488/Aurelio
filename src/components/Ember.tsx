import { emberLevel } from '../lib/streak'

const FLAME_24 = 'M12 3.4c3.2 3.4 5.6 6 5.6 9.2A5.6 5.6 0 0 1 12 18.2a5.6 5.6 0 0 1-5.6-5.6c0-3.2 2.4-5.8 5.6-9.2Z'
const CORE_24 = 'M12 10c1.5 1.6 2.4 2.7 2.4 4.1a2.4 2.4 0 0 1-4.8 0c0-1.4.9-2.5 2.4-4.1Z'
const FLAME_28 = 'M14 5.4c3 3.2 5.2 5.6 5.2 8.6A5.2 5.2 0 0 1 14 19.2a5.2 5.2 0 0 1-5.2-5.2c0-3 2.2-5.4 5.2-8.6Z'
const CORE_28 = 'M14 11.6c1.4 1.5 2.2 2.5 2.2 3.8a2.2 2.2 0 0 1-4.4 0c0-1.3.8-2.3 2.2-3.8Z'

interface Props {
  /** The streak number; picks one of the five states. */
  streak: number
  size: number
  flicker?: boolean
  /** Hero embers (milestone, complete) use a thinner ring and paler core. */
  hero?: boolean
  /** Inline mentions show only the flame silhouette, as in the activity feed. */
  plain?: boolean
  /** Override the cold outline colour (the empty state uses a lighter one). */
  coldColor?: string
  style?: React.CSSProperties
}

/** The streak mark: outline when cold, solid when lit, a core at 7, a ring at 25, inked at 100. */
export function Ember({ streak, size, flicker, hero, plain, coldColor, style }: Props) {
  const level = emberLevel(streak)
  const s: React.CSSProperties = { flex: '0 0 auto', ...style }
  if (flicker) s.animation = `ember-flicker ${hero ? 3 : 3.4}s ease-in-out infinite`

  if (plain) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={s} aria-hidden="true">
        <path d={FLAME_24} fill="#C79A4A" />
      </svg>
    )
  }
  if (level === 0) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={s} aria-hidden="true">
        <path d={FLAME_24} stroke={coldColor ?? 'var(--ember-cold)'} strokeWidth={coldColor ? 1.2 : 1.6} fill="none" />
      </svg>
    )
  }
  if (level === 1) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={s} aria-hidden="true">
        <path d={FLAME_24} fill="#DCC38A" />
      </svg>
    )
  }
  // Small marks stay a bare flame with a core, as on Today and the routine list.
  if (level === 7 || (level === 25 && size < 40 && !hero)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={s} aria-hidden="true">
        <path d={FLAME_24} fill="#C79A4A" />
        <path d={CORE_24} fill="#F7EBD3" />
      </svg>
    )
  }
  if (level === 25) {
    return (
      <svg width={size} height={size} viewBox="0 0 28 28" style={s} aria-hidden="true">
        <circle cx="14" cy="14" r={hero ? 12.6 : 12.4} stroke="#C79A4A" strokeWidth={hero ? 0.8 : 1.2} fill="none" strokeDasharray={hero ? '2.6 3' : '3 3.4'} />
        <path d={FLAME_28} fill="#C79A4A" />
        <path d={CORE_28} fill={hero ? '#FAF2E2' : '#F7EBD3'} />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" style={s} aria-hidden="true">
      <circle cx="14" cy="14" r="12.4" stroke={hero ? '#C79A4A' : 'var(--ink)'} strokeWidth="1.5" fill="none" />
      <path d={FLAME_28} fill={hero ? 'var(--on-dark)' : 'var(--ink)'} />
      <path d={CORE_28} fill="#C79A4A" />
    </svg>
  )
}

import type { Role } from '../data/types'

/**
 * Flat illustrated avatars, copied from the prototype. Small sizes (≤26px) drop the
 * neck, body or smile exactly as the design does.
 */
export function Avatar({ user, size, style }: { user: Role; size: number; style?: React.CSSProperties }) {
  const small = size <= 26
  const tiny = size <= 18
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ flex: '0 0 auto', ...style }} aria-label={user === 'leo' ? 'Leo' : 'Soniya'}>
      <g clipPath="url(#cc)">{user === 'leo' ? <Leo small={small} large={size >= 132} /> : <Soniya small={small} tiny={tiny} large={size >= 132} />}</g>
    </svg>
  )
}

function Leo({ small, large }: { small: boolean; large: boolean }) {
  return (
    <>
      <rect width="100" height="100" fill="#DCE3DB" />
      <path d="M50 72c-18 0-30 12-32 34h64c-2-22-14-34-32-34Z" fill="#2E3A33" />
      {!small && <rect x="43" y="58" width="14" height="16" rx="7" fill="#C2844F" />}
      <rect x="31" y="22" width="38" height="44" rx="19" fill="#D9995F" />
      {large && (
        <>
          <circle cx="30" cy="45" r="4" fill="#C2844F" />
          <circle cx="70" cy="45" r="4" fill="#C2844F" />
        </>
      )}
      <path d="M30 40c-1-18 12-24 20-24s21 6 20 24c-1-9-7-13-20-13s-19 4-20 13Z" fill="#241B15" />
      <ellipse cx="42" cy="44" rx="2.4" ry="2.8" fill="#241B15" />
      <ellipse cx="58" cy="44" rx="2.4" ry="2.8" fill="#241B15" />
      {!small && <path d="M44 54c3 3 9 3 12 0" stroke="#241B15" strokeWidth="2.4" strokeLinecap="round" fill="none" />}
    </>
  )
}

function Soniya({ small, tiny, large }: { small: boolean; tiny: boolean; large: boolean }) {
  return (
    <>
      <rect width="100" height="100" fill="#F0DFC6" />
      <path d="M24 44c0-20 12-30 26-30s26 10 26 30v30c0 8-4 14-8 16-3-14-4-26-4-38H36c0 12-1 24-4 38-4-2-8-8-8-16V44Z" fill="#2B1F1A" />
      {!tiny && !small && <path d="M50 72c-18 0-30 12-32 34h64c-2-22-14-34-32-34Z" fill="#8A4F52" />}
      {!small && <rect x="43" y="58" width="14" height="16" rx="7" fill="#B9764A" />}
      <rect x="31" y="22" width="38" height="44" rx="19" fill="#C9854F" />
      {large && (
        <>
          <circle cx="30" cy="45" r="4" fill="#B9764A" />
          <circle cx="70" cy="45" r="4" fill="#B9764A" />
        </>
      )}
      <path d="M31 38c0-14 9-19 19-19s19 5 19 19c-2-8-8-11-19-11s-17 3-19 11Z" fill="#2B1F1A" />
      <ellipse cx="42" cy="44" rx="2.4" ry="2.8" fill="#2B1F1A" />
      <ellipse cx="58" cy="44" rx="2.4" ry="2.8" fill="#2B1F1A" />
      {!small && <path d="M44 54c3 3 9 3 12 0" stroke="#2B1F1A" strokeWidth="2.4" strokeLinecap="round" fill="none" />}
      {large && <circle cx="76" cy="40" r="3.2" fill="#C79A4A" />}
    </>
  )
}

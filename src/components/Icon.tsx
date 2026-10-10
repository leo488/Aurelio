export type IconName = 'sun' | 'moon' | 'dumbbell' | 'book' | 'calendar' | 'list' | 'bell' | 'together' | 'plus' | 'gear'

const PATHS: Record<IconName, React.ReactNode> = {
  sun: (
    <>
      <circle cx="12" cy="13" r="5" />
      <path d="M12 3v2M4.8 5.8l1.4 1.4M19.2 5.8l-1.4 1.4" />
    </>
  ),
  moon: <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z" />,
  dumbbell: <path d="M5 9v6M19 9v6M8 7v10M16 7v10M8 12h8" />,
  book: (
    <>
      <path d="M5 5h10a3 3 0 0 1 3 3v11H8a3 3 0 0 1-3-3Z" />
      <path d="M9 9h5" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="15" rx="4" />
      <path d="M8 3.5v4M16 3.5v4M4 11h16" />
    </>
  ),
  list: (
    <>
      <path d="M9 6h10M9 12h10M9 18h6" />
      <circle cx="5" cy="6" r="1.4" />
      <circle cx="5" cy="12" r="1.4" />
      <circle cx="5" cy="18" r="1.4" />
    </>
  ),
  bell: (
    <>
      <path d="M18 15.5V11a6 6 0 1 0-12 0v4.5L4.5 18h15Z" />
      <path d="M10 21h4" />
    </>
  ),
  together: (
    <>
      <circle cx="9" cy="10" r="3.4" />
      <circle cx="16.5" cy="11" r="2.6" />
      <path d="M3.5 19c.7-3 3-4.6 5.5-4.6S14 16 14.7 19M17 16.4c1.8.5 3 1.7 3.4 2.6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 4v1.6M12 18.4V20M4 12h1.6M18.4 12H20M6.3 6.3l1.2 1.2M16.5 16.5l1.2 1.2M17.7 6.3l-1.2 1.2M7.5 16.5l-1.2 1.2" />
    </>
  ),
}

export function Icon({ name, size = 24, color = '#1A1714', stroke = 1.8, style }: { name: IconName; size?: number; color?: string; stroke?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto', ...style }} aria-hidden="true">
      {PATHS[name]}
    </svg>
  )
}

/** The colour each routine icon wears in lists (sun gold, moon iris, gym olive, study muted). */
export const ROUTINE_TINT: Record<string, string> = { sun: '#C79A4A', moon: '#8A7E9B', dumbbell: '#6E7F63', book: '#8E857B' }

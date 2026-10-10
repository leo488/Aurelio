/** Shared gradient and clip path referenced by Ori and the avatars (mounted once). */
export function SvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <radialGradient id="oriG" cx="35%" cy="28%">
          <stop offset="0%" stopColor="#F0D194" />
          <stop offset="55%" stopColor="#C79A4A" />
          <stop offset="100%" stopColor="#9C7128" />
        </radialGradient>
        <clipPath id="cc">
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
    </svg>
  )
}

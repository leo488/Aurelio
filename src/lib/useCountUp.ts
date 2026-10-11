import { useEffect, useRef, useState } from 'react'

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Animate a number from 0 to its value on first show (and smoothly between later values).
 * Short on purpose: it should feel like the screen arriving, not something to wait for.
 */
export function useCountUp(target: number, ms = 650) {
  const [value, setValue] = useState(() => (reduced() ? target : 0))
  const from = useRef(value)
  useEffect(() => {
    if (reduced()) {
      setValue(target)
      return
    }
    const start = performance.now()
    const a = from.current
    let raf = 0
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / ms)
      const eased = 1 - (1 - k) ** 3
      const v = a + (target - a) * eased
      from.current = v
      setValue(v)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return value
}

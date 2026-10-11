import { capitalize } from './words'
import type { RoutineStep } from '../data/types'

/** "Exercise · 20 min" */
export const stepLabel = (s: RoutineStep) => (s.duration ? `${s.title} · ${s.duration} min` : s.title)

export const totalMinutes = (steps: { duration?: number }[]) => steps.reduce((n, s) => n + (s.duration ?? 0), 0)

/** "Morning Routine" → "mornings", used in "25 mornings in a row". */
export const routinePlural = (name: string) => {
  const n = name.toLowerCase().replace(/\s+routine$/, '')
  return /^(morning|evening|night|afternoon)$/.test(n) ? `${n}s` : `${n} days`
}

/** "Push day 40" or "Push day · 40 min" → title + duration. */
export const parseStep = (text: string): { title: string; duration?: number } => {
  const m = text.trim().match(/^(.*?)[\s·,-]*(\d{1,3})\s*(m|min|mins|minutes)?$/i)
  if (m && m[1]) return { title: capitalize(m[1].trim()), duration: Number(m[2]) }
  return { title: capitalize(text.trim()) }
}

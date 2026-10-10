import { capitalize } from './words'
import type { RoutineItem } from '../data/types'

/** "Exercise · 20 min" */
export const itemLabel = (i: RoutineItem) => (i.durationMin ? `${i.name} · ${i.durationMin} min` : i.name)

export const totalMinutes = (items: RoutineItem[]) => items.reduce((n, i) => n + (i.durationMin ?? 0), 0)

/** "Morning" → "mornings", used in "25 mornings in a row". */
export const routinePlural = (name: string) => {
  const n = name.toLowerCase()
  return /^(morning|evening|night|afternoon)$/.test(n) ? `${n}s` : `${n} days`
}

/** "Push day 40" or "Push day · 40 min" → name + duration. */
export const parseItem = (text: string): { name: string; durationMin?: number } => {
  const m = text.trim().match(/^(.*?)[\s·,-]*(\d{1,3})\s*(m|min|mins|minutes)?$/i)
  if (m && m[1]) return { name: capitalize(m[1].trim()), durationMin: Number(m[2]) }
  return { name: capitalize(text.trim()) }
}

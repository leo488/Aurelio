import type { RoutineIcon, TimeCategory } from '../data/types'
import { capitalize } from './words'

// AI routine creation. A generator (an LLM behind VITE_ORI_ENDPOINT, or the local fallback below)
// returns this structured draft; it never touches app state. The draft is validated, shown in the
// normal New Routine form for review, and only saved when the user taps Save.

export interface RoutineDraft {
  name: string
  description?: string
  timeCategory: TimeCategory
  categoryLabel?: string
  scheduledTime?: string
  /** Total minutes the person asked for. */
  duration?: number
  days?: number[]
  steps: { title: string; duration?: number }[]
}

const CATEGORIES: TimeCategory[] = ['morning', 'afternoon', 'evening', 'night', 'custom']

/** Accepts anything (an LLM's JSON) and returns a clean draft, or throws with what was wrong. */
export function validateDraft(input: unknown): RoutineDraft {
  if (!input || typeof input !== 'object') throw new Error('Not a routine')
  const o = input as Record<string, unknown>
  const name = typeof o.name === 'string' ? o.name.trim().slice(0, 60) : ''
  if (!name) throw new Error('The routine needs a name')
  const timeCategory = CATEGORIES.includes(o.timeCategory as TimeCategory) ? (o.timeCategory as TimeCategory) : 'custom'
  const steps = Array.isArray(o.steps)
    ? o.steps
        .map((x): Record<string, unknown> => (x && typeof x === 'object' ? (x as Record<string, unknown>) : { title: x }))
        .filter((x) => typeof x.title === 'string' && x.title.trim())
        .slice(0, 30)
        .map((x) => ({ title: capitalize(String(x.title).trim().slice(0, 80)), duration: minutes(x.duration) }))
    : []
  if (steps.length === 0) throw new Error('The routine needs at least one step')
  const time = typeof o.scheduledTime === 'string' && /^\d{2}:\d{2}$/.test(o.scheduledTime) ? o.scheduledTime : undefined
  const days = Array.isArray(o.days) ? o.days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6) : undefined
  return {
    name: capitalize(name),
    description: typeof o.description === 'string' ? o.description.slice(0, 200) : undefined,
    timeCategory,
    categoryLabel: typeof o.categoryLabel === 'string' ? o.categoryLabel.slice(0, 30) : undefined,
    scheduledTime: time,
    duration: minutes(o.duration),
    days: days && days.length ? Array.from(new Set(days)).sort() : undefined,
    steps,
  }
}

const minutes = (v: unknown) => (typeof v === 'number' && v > 0 && v < 600 ? Math.round(v) : undefined)

export const draftIcon = (d: RoutineDraft): RoutineIcon =>
  /workout|gym|train|run|exercise/i.test(d.name) ? 'dumbbell' : /read|study|learn|work/i.test(d.name) ? 'book' : d.timeCategory === 'evening' || d.timeCategory === 'night' ? 'moon' : 'sun'

/** Ask the configured endpoint for a draft; fall back to the local generator offline or on error. */
export async function generateRoutine(prompt: string): Promise<RoutineDraft> {
  const endpoint = import.meta.env.VITE_ORI_ENDPOINT as string | undefined
  if (endpoint && navigator.onLine) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'routine', prompt, schema: 'RoutineDraft' }),
      })
      if (res.ok) {
        const json = (await res.json()) as { routine?: unknown }
        return validateDraft(json.routine ?? json)
      }
    } catch {
      /* fall through */
    }
  }
  return localDraft(prompt)
}

// ─── Local fallback ─────────────────────────────────────────────────────

type Pool = [string, number][]
const POOLS: Record<string, Pool> = {
  morning: [['Drink water', 2], ['Make the bed', 2], ['Stretch', 5], ['Pray', 5], ['Exercise', 15], ['Shower', 10], ['Plan the day', 5], ['Read', 15], ['Breakfast', 15]],
  afternoon: [['Walk outside', 10], ['Drink water', 2], ['Review the plan', 5], ['Deep work block', 45], ['Stretch', 5], ['Inbox zero', 15]],
  evening: [['Tidy up', 10], ['Prepare tomorrow', 10], ['Stretch', 10], ['Journal', 10], ['Read', 20], ['Call family', 15]],
  night: [['Phone on charge', 1], ['Brush teeth', 3], ['Pray', 5], ['Read', 15], ['Lights out', 1]],
  workout: [['Warm up', 5], ['Mobility', 5], ['Main set', 25], ['Accessory work', 10], ['Cool down', 5], ['Log the session', 2]],
  study: [['Clear the desk', 2], ['Review notes', 15], ['Practice problems', 25], ['Summarise what you learned', 5]],
  work: [['Phone away', 1], ['Pick one priority', 5], ['Focus block', 50], ['Short break', 5], ['Review and log', 5]],
  reading: [['Find a quiet spot', 2], ['Read', 25], ['Note one idea', 3]],
  prayer: [['Quiet the mind', 3], ['Prayer', 10], ['Reflection', 5], ['Gratitude', 2]],
}

const DEFAULT_TIME: Record<TimeCategory, string> = { morning: '06:30', afternoon: '13:00', evening: '20:00', night: '22:30', custom: '09:00' }

export function localDraft(prompt: string): RoutineDraft {
  const q = prompt.toLowerCase()
  const mins = q.match(/(\d{1,3})\s*-?\s*min/)
  const hours = q.match(/(\d(?:\.\d)?)\s*-?\s*hour/)
  const asked = mins ? Number(mins[1]) : hours ? Math.round(Number(hours[1]) * 60) : undefined
  const kind = /workout|gym|exercise|training/.test(q) ? 'workout' : /study|revision|revise/.test(q) ? 'study' : /pray|prayer/.test(q) ? 'prayer'
    : /reading/.test(q) ? 'reading' : /deep work|focus/.test(q) ? 'work' : /night|bed|sleep/.test(q) ? 'night' : /evening/.test(q) ? 'evening'
    : /afternoon|lunch/.test(q) ? 'afternoon' : 'morning'
  const timeCategory: TimeCategory = ['morning', 'afternoon', 'evening', 'night'].includes(kind) ? (kind as TimeCategory)
    : /morning/.test(q) ? 'morning' : /evening/.test(q) ? 'evening' : /night/.test(q) ? 'night' : kind === 'workout' ? 'afternoon' : 'custom'
  const pool = POOLS[kind]
  const target = asked ?? pool.reduce((n, [, m]) => n + m, 0)
  // Keep steps in order and fit them into the time asked for, scaling the longest step to make up the rest.
  const steps: { title: string; duration: number }[] = []
  let used = 0
  for (const [title, m] of pool) {
    if (used + m > target && steps.length >= 2) continue
    steps.push({ title, duration: m })
    used += m
  }
  if (used < target) {
    const longest = steps.reduce((a, b) => (b.duration > a.duration ? b : a))
    longest.duration += target - used
  }
  const names: Record<string, string> = { workout: 'Workout', study: 'Study', work: 'Deep Work', reading: 'Reading', prayer: 'Prayer' }
  const name = names[kind] ?? `${capitalize(timeCategory)} Routine`
  return {
    name,
    timeCategory,
    categoryLabel: timeCategory === 'custom' ? names[kind] : undefined,
    scheduledTime: DEFAULT_TIME[timeCategory],
    duration: target,
    steps,
  }
}

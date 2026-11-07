import type { Routine } from '../data/types'
import { addDays, weekday } from '../lib/date'
import { completionOf, isScheduled, outcome, type Completions } from '../lib/streak'
import { heatStyle, type HeatKind } from './ui'

/** What one square shows: the day's outcome against the routine's schedule. */
export function heatKind(routine: Routine, completions: Completions, date: string, today: string): HeatKind {
  if (date > today) return 'future'
  const o = outcome(routine, date, completionOf(completions, routine.id, date))
  if (date === today) return o === 'full' ? 'today' : o === 'skipped' ? 'skip' : routine.active && isScheduled(routine, date) ? 'pending' : 'off'
  if (o === 'full') return 'full'
  if (o === 'partial') return 'partial'
  if (o === 'missed') return 'missed'
  if (o === 'skipped') return 'skip'
  return 'off'
}

/** Five Monday-first weeks ending with the current week. */
export function Heatmap({ routine, completions, today, gap = 6, radius = 7 }: { routine: Routine; completions: Completions; today: string; gap?: number; radius?: number }) {
  const start = addDays(today, -weekday(today) - 28)
  const cells = Array.from({ length: 35 }, (_, i) => addDays(start, i))
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap }} role="img" aria-label={`${routine.name}, last five weeks`}>
      {cells.map((d) => <div key={d} title={d} style={heatStyle(heatKind(routine, completions, d, today), radius)} />)}
    </div>
  )
}

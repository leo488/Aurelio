import type { Routine } from '../data/types'
import { addDays, weekday } from '../lib/date'
import { completionOf, outcome, type Completions } from '../lib/streak'

/** Five Monday-first weeks ending with the current week; each square carries the day's outcome. */
export function Heatmap({ routine, completions, today, gap = 6, radius = 7 }: { routine: Routine; completions: Completions; today: string; gap?: number; radius?: number }) {
  const start = addDays(today, -weekday(today) - 28)
  const cells = Array.from({ length: 35 }, (_, i) => addDays(start, i))
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap }} role="img" aria-label={`${routine.name}, last five weeks`}>
      {cells.map((d) => {
        let bg = 'transparent'
        let border: string | undefined
        const o = d > today ? 'none' : outcome(routine, d, completionOf(completions, routine.id, d))
        if (d > today) bg = 'var(--heat-future)'
        else if (d === today) bg = o === 'full' ? 'var(--olive)' : 'var(--gold)'
        else if (o === 'full') bg = 'var(--olive)'
        else if (o === 'partial') bg = 'var(--olive-pale)'
        else if (o === 'missed') bg = 'var(--heat-missed)'
        else if (o === 'skipped') border = '1.4px dashed var(--heat-skipped)'
        else bg = 'var(--heat-future)'
        return <div key={d} title={d} style={{ aspectRatio: '1', borderRadius: radius, background: bg, border }} />
      })}
    </div>
  )
}

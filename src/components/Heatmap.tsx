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
        if (d > today) bg = '#F0EAE0'
        else if (d === today) bg = o === 'full' ? '#6E7F63' : '#C79A4A'
        else if (o === 'full') bg = '#6E7F63'
        else if (o === 'partial') bg = '#B6C0AE'
        else if (o === 'missed') bg = '#E4DBCC'
        else if (o === 'skipped') border = '1.4px dashed #CBC0AE'
        else bg = '#F0EAE0'
        return <div key={d} title={d} style={{ aspectRatio: '1', borderRadius: radius, background: bg, border }} />
      })}
    </div>
  )
}

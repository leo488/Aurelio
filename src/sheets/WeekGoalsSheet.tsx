import { useState } from 'react'
import { Check } from '../components/controls'
import { Sheet } from '../components/Sheet'
import { useData } from '../data/store'
import { addDays, diffDays, isoWeek, MONTHS_SHORT, weekKey, weekStart } from '../lib/date'

const range = (monday: string) => {
  const sunday = addDays(monday, 6)
  const [, m1, d1] = monday.split('-').map(Number)
  const [, m2, d2] = sunday.split('-').map(Number)
  return m1 === m2 ? `${d1} – ${d2} ${MONTHS_SHORT[m2 - 1]}` : `${d1} ${MONTHS_SHORT[m1 - 1]} – ${d2} ${MONTHS_SHORT[m2 - 1]}`
}

/** This week's goals: tick them off, add more, and bring over what last week left open. */
export function WeekGoalsSheet({ today, onClose }: { today: string; onClose: () => void }) {
  const data = useData()
  const [draft, setDraft] = useState('')
  const wk = isoWeek(today)
  const key = weekKey(today)
  const monday = weekStart(today)
  const lastKey = weekKey(addDays(monday, -7))
  const goals = data.goals.filter((g) => g.week === key).sort((a, b) => a.position - b.position)
  const leftover = data.goals.filter((g) => g.week === lastKey && !g.done && !goals.some((x) => x.title === g.title))
  const hit = goals.filter((g) => g.done).length
  const daysLeft = 6 - diffDays(today, monday)
  const allDone = goals.length > 0 && hit === goals.length

  const add = () => {
    if (!draft.trim()) return
    data.addGoal(key, draft)
    setDraft('')
  }

  return (
    <Sheet open onClose={onClose} label={`Week ${wk.week} goals`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div className="eyebrow">WEEK {wk.week} · {range(monday).toUpperCase()}</div>
        <button type="button" onClick={onClose} style={{ fontSize: 15, fontWeight: 800, color: 'var(--gold-text)' }}>Done</button>
      </div>
      <h2 className="display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.03em', margin: '8px 0 0' }}>
        {allDone ? 'Every goal hit' : 'This week’s goals'}
      </h2>
      <div style={{ fontSize: 13, color: 'var(--muted-1)', marginTop: 4 }}>
        {goals.length === 0 ? 'Pick a few things that would make this week a good one.'
          : allDone ? 'That’s the whole list. Add another or enjoy it.'
          : `${hit} of ${goals.length} done · ${daysLeft === 0 ? 'last day' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`}`}
      </div>

      {goals.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 16 }} aria-hidden="true">
          {goals.map((g) => <div key={g.id} className={g.done ? 'goal-seg done' : 'goal-seg'} />)}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 10 }}>
        {goals.map((g) => (
          <div key={g.id} className="goal-row">
            <button type="button" onClick={() => data.toggleGoal(g.id)} aria-label={g.done ? `Mark ${g.title} not done` : `Mark ${g.title} done`} style={{ lineHeight: 0, padding: 4, margin: -4 }}>
              <Check done={g.done} />
            </button>
            <input className="text-input" defaultValue={g.title} aria-label="Goal"
              onBlur={(e) => e.target.value.trim() !== g.title && data.renameGoal(g.id, e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              style={{ flex: 1, fontSize: 15.5, fontWeight: 700, color: g.done ? 'var(--muted-4)' : 'var(--ink)', textDecoration: g.done ? 'line-through' : 'none' }} />
            <button type="button" onClick={() => data.removeGoal(g.id)} aria-label={`Remove ${g.title}`} style={{ fontSize: 18, lineHeight: 1, color: 'var(--muted-4)', padding: '4px 2px' }}>×</button>
          </div>
        ))}
      </div>

      <div className="goal-add">
        <span style={{ fontSize: 20, lineHeight: 1, color: 'var(--gold-text)', fontWeight: 600 }} aria-hidden="true">+</span>
        <input className="text-input" value={draft} placeholder={goals.length ? 'Add another goal' : 'Add your first goal'} aria-label="New goal" autoFocus={goals.length === 0}
          enterKeyHint="done" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()}
          style={{ flex: 1, fontSize: 15.5, fontWeight: 600 }} />
        {draft.trim() && <button type="button" className="pill-ink" onClick={add}>Add</button>}
      </div>

      {leftover.length > 0 && (
        <button type="button" onClick={() => leftover.forEach((g) => data.addGoal(key, g.title))}
          style={{ marginTop: 14, fontSize: 13, fontWeight: 700, color: 'var(--gold-text)', padding: '6px 0' }}>
          Bring over {leftover.length} from last week
        </button>
      )}
      <div style={{ height: 'calc(10px + var(--safe-bottom))' }} />
    </Sheet>
  )
}

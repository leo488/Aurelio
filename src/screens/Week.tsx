import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from '../components/controls'
import { Label, Ring } from '../components/ui'
import { dayProgress } from '../data/select'
import { useData } from '../data/store'
import { addDays, diffDays, isoWeek, logicalToday, MONTHS_SHORT, weekKey, weekStart, WEEKDAY_LETTER } from '../lib/date'

const range = (monday: string) => {
  const sunday = addDays(monday, 6)
  const [, m1, d1] = monday.split('-').map(Number)
  const [, m2, d2] = sunday.split('-').map(Number)
  return m1 === m2 ? `${d1} – ${d2} ${MONTHS_SHORT[m2 - 1]}` : `${d1} ${MONTHS_SHORT[m1 - 1]} – ${d2} ${MONTHS_SHORT[m2 - 1]}`
}

/** Leo's week: how each day went, and this week's goals to add, tick off, edit or carry over. */
export function Week() {
  const data = useData()
  const navigate = useNavigate()
  const [draft, setDraft] = useState('')
  const today = logicalToday()
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
    <main className="screen" style={{ background: 'var(--wash-streak)' }}>
      <div className="pad top">
        <button type="button" aria-label="Back" onClick={() => navigate('/today')} style={{ fontSize: 20, lineHeight: 1, color: 'var(--ink)' }}>‹</button>
        <div className="eyebrow" style={{ marginTop: 16 }}>{range(monday).toUpperCase()} · {wk.year}</div>
        <h1 className="display" style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-.033em', margin: '4px 0 0' }}>Week {wk.week}</h1>
        <div style={{ fontSize: 13.5, color: 'var(--muted-1)', marginTop: 4, fontWeight: 600 }}>
          {daysLeft === 0 ? 'Last day of the week' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`} · {wk.of - wk.week} weeks left this year
        </div>
      </div>

      <div className="pad" style={{ paddingTop: 22 }}>
        <div className="card" style={{ padding: '14px 10px', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {WEEKDAY_LETTER.map((l, i) => {
            const d = addDays(monday, i)
            const p = dayProgress(data, d)
            const future = d > today
            return (
              <div key={d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: d === today ? 'var(--gold-text)' : 'var(--muted-3)' }}>{l}</div>
                <Ring pct={future || !p.total ? 0 : (p.done / p.total) * 100} size={34} r={13.5} width={3.5} glow={d === today}>
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: d === today ? 'var(--ink)' : future ? 'var(--muted-4)' : 'var(--muted-1)' }}>{Number(d.slice(8))}</span>
                </Ring>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--muted-3)', minHeight: 12 }}>{!future && p.total ? `${p.done}/${p.total}` : ''}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="pad" style={{ paddingTop: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Label>Weekly goals</Label>
          {goals.length > 0 && <div style={{ fontSize: 12.5, fontWeight: 800, color: allDone ? 'var(--gold-text)' : 'var(--muted-2)' }}>{allDone ? 'All done' : `${hit} of ${goals.length}`}</div>}
        </div>
        {goals.length > 0 ? (
          <div style={{ display: 'flex', gap: 4, marginTop: 12 }} aria-hidden="true">
            {goals.map((g) => <div key={g.id} className={g.done ? 'goal-seg done' : 'goal-seg'} />)}
          </div>
        ) : (
          <div style={{ fontSize: 13.5, color: 'var(--muted-1)', marginTop: 8, lineHeight: 1.5 }}>Pick a few things that would make this week a good one.</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 6 }}>
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
          <input className="text-input" value={draft} placeholder={goals.length ? 'Add another goal' : 'Add your first goal'} aria-label="New goal"
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
      </div>
    </main>
  )
}

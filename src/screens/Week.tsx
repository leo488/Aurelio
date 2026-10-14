import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check } from '../components/controls'
import { Icon } from '../components/Icon'
import { catLook, Label, Ring } from '../components/ui'
import { completionFor, dayProgress, routinesOn, routineTime } from '../data/select'
import { useData } from '../data/store'
import type { Routine, WeeklyGoal } from '../data/types'
import { addDays, diffDays, isoWeek, logicalToday, MONTHS_SHORT, weekKey, weekStart, WEEKDAY_LETTER, WEEKDAY_LONG } from '../lib/date'
import { isComplete, isScheduled, progress } from '../lib/streak'

const range = (monday: string) => {
  const sunday = addDays(monday, 6)
  const [, m1, d1] = monday.split('-').map(Number)
  const [, m2, d2] = sunday.split('-').map(Number)
  return m1 === m2 ? `${d1} – ${d2} ${MONTHS_SHORT[m2 - 1]}` : `${d1} ${MONTHS_SHORT[m1 - 1]} – ${d2} ${MONTHS_SHORT[m2 - 1]}`
}

type Data = ReturnType<typeof useData.getState>

/** How often a routine was done this week, out of the days it's on. */
function routineWeek(data: Data, r: Routine, monday: string) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter((d) => isScheduled(r, d))
  return { done: days.filter((d) => isComplete(r, d, completionFor(data, r, d))).length, total: days.length }
}

/** Leo's week: each day's routines, and this week's goals with their steps and routines. */
export function Week() {
  const data = useData()
  const navigate = useNavigate()
  const today = logicalToday()
  const [day, setDay] = useState(today)
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const wk = isoWeek(today)
  const key = weekKey(today)
  const monday = weekStart(today)
  const lastKey = weekKey(addDays(monday, -7))
  const goals = data.goals.filter((g) => g.week === key).sort((a, b) => a.position - b.position)
  const leftover = data.goals.filter((g) => g.week === lastKey && !g.done && !goals.some((x) => x.title === g.title))
  const hit = goals.filter((g) => g.done).length
  const daysLeft = 6 - diffDays(today, monday)
  const allDone = goals.length > 0 && hit === goals.length
  const dayRoutines = routinesOn(data, day)

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
            const picked = d === day
            return (
              <button key={d} type="button" onClick={() => setDay(d)} aria-pressed={picked} aria-label={WEEKDAY_LONG[i]}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '4px 0', borderRadius: 10, background: picked ? 'var(--chip-alt-2)' : 'transparent', transition: 'background .2s' }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: d === today ? 'var(--gold-text)' : 'var(--muted-3)' }}>{l}</div>
                <Ring pct={future || !p.total ? 0 : (p.done / p.total) * 100} size={34} r={13.5} width={3.5} glow={d === today}>
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: d === today || picked ? 'var(--ink)' : future ? 'var(--muted-4)' : 'var(--muted-1)' }}>{Number(d.slice(8))}</span>
                </Ring>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--muted-3)', minHeight: 12 }}>{!future && p.total ? `${p.done}/${p.total}` : ''}</div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="pad" style={{ paddingTop: 22 }}>
        <Label>{day === today ? 'Today' : WEEKDAY_LONG[diffDays(day, monday)]}</Label>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 4 }}>
          {dayRoutines.length === 0 && <div style={{ fontSize: 13.5, color: 'var(--muted-2)', padding: '12px 0' }}>No routines on this day.</div>}
          {dayRoutines.map((r) => {
            const c = completionFor(data, r, day)
            const p = progress(r, day, c)
            const done = p.total > 0 && p.done === p.total
            const look = catLook(r)
            return (
              <Link key={r.id} to={`/routines/${r.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--divider)', color: 'inherit' }}>
                <Icon name={look.icon} size={19} color={look.color} />
                <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: done ? 'var(--muted-4)' : 'var(--ink)' }}>{r.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted-2)', fontWeight: 700 }}>{routineTime(r)}</div>
                {done ? <Check done /> : <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--muted-3)', minWidth: 22, textAlign: 'right' }}>{day > today ? '' : `${p.done}/${p.total}`}</div>}
              </Link>
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
            <GoalRow key={g.id} goal={g} monday={monday} open={open === g.id} onOpen={() => setOpen(open === g.id ? null : g.id)} />
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

/** One goal. Tap it to open its steps, link a routine, rename or remove it. */
function GoalRow({ goal: g, monday, open, onOpen }: { goal: WeeklyGoal; monday: string; open: boolean; onOpen: () => void }) {
  const data = useData()
  const [step, setStep] = useState('')
  const steps = g.steps ?? []
  const stepsDone = steps.filter((s) => s.done).length
  const routine = g.routineId ? data.routines.find((r) => r.id === g.routineId) : undefined
  const rw = routine ? routineWeek(data, routine, monday) : null
  const meta = [steps.length ? `${stepsDone}/${steps.length} steps` : '', routine && rw ? `${routine.name} ${rw.done}/${rw.total}` : ''].filter(Boolean).join(' · ')
  const addStep = () => {
    if (!step.trim()) return
    data.addGoalStep(g.id, step)
    setStep('')
  }

  return (
    <div style={{ borderBottom: '1px solid var(--divider)', animation: 'pop-in .2s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 0' }}>
        <button type="button" onClick={() => data.toggleGoal(g.id)} aria-label={g.done ? `Mark ${g.title} not done` : `Mark ${g.title} done`} style={{ lineHeight: 0, padding: 4, margin: -4 }}>
          <Check done={g.done} />
        </button>
        <button type="button" onClick={onOpen} aria-expanded={open} style={{ flex: 1, minWidth: 0, textAlign: 'left', color: 'inherit' }}>
          <div style={{ fontSize: 15.5, fontWeight: 700, color: g.done ? 'var(--muted-4)' : 'var(--ink)', textDecoration: g.done ? 'line-through' : 'none' }}>{g.title}</div>
          {meta && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-2)', marginTop: 3 }}>{meta}</div>}
        </button>
        <span aria-hidden="true" style={{ fontSize: 15, color: 'var(--muted-4)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>›</span>
      </div>

      {open && (
        <div style={{ padding: '0 0 14px 35px', animation: 'pop-in .18s ease' }}>
          {steps.map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '7px 0' }}>
              <button type="button" onClick={() => data.toggleGoalStep(g.id, s.id)} aria-label={s.done ? `Mark ${s.title} not done` : `Mark ${s.title} done`} style={{ lineHeight: 0 }}>
                <Check done={s.done} style={{ width: 18, height: 18 }} />
              </button>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: s.done ? 'var(--muted-4)' : 'var(--ink)', textDecoration: s.done ? 'line-through' : 'none' }}>{s.title}</div>
              <button type="button" onClick={() => data.removeGoalStep(g.id, s.id)} aria-label={`Remove ${s.title}`} style={{ fontSize: 16, lineHeight: 1, color: 'var(--muted-4)', padding: '2px 4px' }}>×</button>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '7px 0' }}>
            <span style={{ width: 18, textAlign: 'center', fontSize: 16, color: 'var(--gold-text)' }} aria-hidden="true">+</span>
            <input className="text-input" value={step} placeholder="Add a step" aria-label={`New step for ${g.title}`} enterKeyHint="done"
              onChange={(e) => setStep(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addStep()} style={{ flex: 1, fontSize: 14, fontWeight: 600 }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 10 }}>
            <label className="row-value" style={{ position: 'relative', fontSize: 13, color: routine ? 'var(--gold-text)' : 'var(--muted-2)', fontWeight: 700 }}>
              {routine ? `Routine: ${routine.name}` : 'Link a routine'} ›
              <select aria-label="Linked routine" value={g.routineId ?? ''} onChange={(e) => data.updateGoal(g.id, { routineId: e.target.value || undefined })}
                style={{ position: 'absolute', inset: 0, opacity: 0 }}>
                <option value="">No routine</option>
                {data.routines.filter((r) => r.active).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => data.removeGoal(g.id)} style={{ fontSize: 13, fontWeight: 700, color: 'var(--clay)' }}>Remove goal</button>
          </div>
        </div>
      )}
    </div>
  )
}

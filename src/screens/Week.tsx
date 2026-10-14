import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check } from '../components/controls'
import { Icon } from '../components/Icon'
import { Sheet } from '../components/Sheet'
import { catLook, Label, Ring } from '../components/ui'
import { completionFor, dayProgress, routinesOn, routineTime } from '../data/select'
import { useData } from '../data/store'
import type { Routine, WeeklyGoal } from '../data/types'
import { addDays, diffDays, isoWeek, logicalToday, MONTHS_SHORT, weekKey, weekStart, WEEKDAY_LETTER, WEEKDAY_LONG } from '../lib/date'
import { isComplete, isScheduled, progress } from '../lib/streak'
import { type DragItem, type DragState, type DropTarget, useDrag } from '../lib/useDrag'

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

/** The dashed "type, then Add" field from the routine editor. */
function AddField({ value, onChange, onAdd, placeholder, label }: { value: string; onChange: (v: string) => void; onAdd: () => void; placeholder: string; label: string }) {
  return (
    <form className="add-field" onSubmit={(e) => { e.preventDefault(); onAdd() }}>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label} enterKeyHint="go" />
      <button type="submit" disabled={!value.trim()}>Add</button>
    </form>
  )
}

/** A thin gold line where a dragged item would land. */
const Slot = ({ on, sm }: { on: boolean; sm?: boolean }) => <div className={`drop-slot${sm ? ' sm' : ''}${on ? ' on' : ''}`} aria-hidden="true" />

/** Leo's week: this week's top priority, each day's routines, and the goals as cards to drag, nest and tick. */
export function Week() {
  const data = useData()
  const today = logicalToday()
  const [day, setDay] = useState(today)
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [asking, setAsking] = useState<{ id: string; targetId: string; index?: number } | null>(null)
  const wk = isoWeek(today)
  const key = weekKey(today)
  const monday = weekStart(today)
  const lastKey = weekKey(addDays(monday, -7))
  const goals = data.goals.filter((g) => g.week === key).sort((a, b) => a.position - b.position)
  const leftover = data.goals.filter((g) => g.week === lastKey && !g.done && !goals.some((x) => x.title === g.title))
  const top = goals.find((g) => g.priority)
  const hit = goals.filter((g) => g.done).length
  const daysLeft = 6 - diffDays(today, monday)
  const allDone = goals.length > 0 && hit === goals.length
  const dayRoutines = routinesOn(data, day)

  const { drag, bind } = useDrag((item: DragItem, t: DropTarget) => {
    if (item.kind === 'goal') {
      if (t.kind === 'nest') setAsking({ id: item.id, targetId: t.goalId, index: t.index })
      if (t.kind === 'goal-at') {
        const ids = goals.map((g) => g.id).filter((id) => id !== item.id)
        ids.splice(t.index > item.index ? t.index - 1 : t.index, 0, item.id)
        data.reorderGoals(key, ids)
      }
      return
    }
    if (t.kind === 'goal-at') data.stepToGoal(item.goalId, item.id, t.index)
    if (t.kind === 'step-at') data.moveGoalStep(item.goalId, item.id, t.goalId, t.goalId === item.goalId && t.index > item.index ? t.index - 1 : t.index)
  })

  const add = () => {
    if (!draft.trim()) return
    data.addGoal(key, draft)
    setDraft('')
  }
  const showGoal = (id: string) => {
    setOpen(id)
    requestAnimationFrame(() => document.getElementById(`goal-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }
  const nesting = asking && { goal: goals.find((g) => g.id === asking.id), target: goals.find((g) => g.id === asking.targetId) }

  return (
    <main className="screen" style={{ background: 'var(--wash-streak)' }}>
      <div className="pad top">
        <div className="eyebrow">{range(monday).toUpperCase()} · {wk.year}</div>
        <h1 className="display" style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-.033em', margin: '4px 0 0' }}>Week {wk.week}</h1>
        <div style={{ fontSize: 13.5, color: 'var(--muted-1)', marginTop: 4, fontWeight: 600 }}>
          {daysLeft === 0 ? 'Last day of the week' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`} · {wk.of - wk.week} weeks left this year
        </div>
      </div>

      {top && <PriorityBanner goal={top} onOpen={() => showGoal(top.id)} />}

      <div className="pad" style={{ paddingTop: top ? 14 : 22 }}>
        <div className="card" style={{ padding: '12px 8px', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {WEEKDAY_LETTER.map((l, i) => {
            const d = addDays(monday, i)
            const p = dayProgress(data, d)
            const future = d > today
            const picked = d === day
            return (
              <button key={d} type="button" onClick={() => setDay(d)} aria-pressed={picked} aria-label={WEEKDAY_LONG[i]} className={picked ? 'day-pick on' : 'day-pick'}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: picked ? 'var(--on-gold)' : d === today ? 'var(--gold-text)' : 'var(--muted-3)' }}>{l}</div>
                <Ring pct={future || !p.total ? 0 : (p.done / p.total) * 100} size={34} r={13.5} width={3.5} glow={d === today && !picked}
                  track={picked ? 'rgba(0,0,0,.14)' : undefined} color={picked ? 'var(--on-gold)' : undefined}>
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: picked ? 'var(--on-gold)' : d === today ? 'var(--ink)' : future ? 'var(--muted-4)' : 'var(--muted-1)' }}>{Number(d.slice(8))}</span>
                </Ring>
                <div style={{ fontSize: 9.5, fontWeight: 800, color: picked ? 'var(--on-gold)' : 'var(--muted-3)', minHeight: 12 }}>{!future && p.total ? `${p.done}/${p.total}` : ''}</div>
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

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 12 }}>
          {goals.map((g, i) => (
            <div key={g.id}>
              <Slot on={drag?.target?.kind === 'goal-at' && drag.target.index === i} />
              <GoalCard goal={g} index={i} monday={monday} open={open === g.id} onOpen={() => setOpen(open === g.id ? null : g.id)} drag={drag} bind={bind} />
            </div>
          ))}
          <Slot on={drag?.target?.kind === 'goal-at' && drag.target.index === goals.length} />
        </div>

        <div style={{ marginTop: 4 }}>
          <AddField value={draft} onChange={setDraft} onAdd={add} placeholder={goals.length ? 'Add another goal…' : 'Add your first goal…'} label="New goal" />
        </div>

        {leftover.length > 0 && (
          <button type="button" onClick={() => leftover.forEach((g) => data.addGoal(key, g.title))}
            style={{ marginTop: 14, fontSize: 13, fontWeight: 700, color: 'var(--gold-text)', padding: '6px 0' }}>
            Bring over {leftover.length} from last week
          </button>
        )}
      </div>

      <Sheet open={!!nesting?.goal && !!nesting.target} onClose={() => setAsking(null)} label="Nest goal">
        {nesting?.goal && nesting.target && (
          <div style={{ padding: '6px 4px 4px' }}>
            <div className="display" style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.25 }}>
              Nest “{nesting.goal.title}” inside “{nesting.target.title}”?
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--muted-1)', marginTop: 8, lineHeight: 1.5 }}>
              It becomes a step of {nesting.target.title}
              {nesting.goal.steps?.length ? `, and its ${nesting.goal.steps.length} ${nesting.goal.steps.length === 1 ? 'step comes' : 'steps come'} along` : ''}. You can drag it back out later.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button type="button" className="btn btn-gold" style={{ flex: 1, padding: 14 }} onClick={() => {
                data.nestGoal(asking!.id, asking!.targetId, asking!.index)
                setOpen(asking!.targetId)
                setAsking(null)
              }}>Nest it</button>
              <button type="button" className="btn btn-chip" style={{ padding: '14px 20px' }} onClick={() => setAsking(null)}>Cancel</button>
            </div>
          </div>
        )}
      </Sheet>
    </main>
  )
}

/** The week's one top priority, in gold at the top of the page. */
function PriorityBanner({ goal: g, onOpen }: { goal: WeeklyGoal; onOpen: () => void }) {
  const steps = g.steps ?? []
  const done = steps.filter((s) => s.done).length
  return (
    <div className="pad" style={{ paddingTop: 18 }}>
      <button type="button" className="prio-banner" onClick={onOpen} aria-label={`Top priority: ${g.title}`}>
        <span className={g.done ? 'prio-icon done' : 'prio-icon'} aria-hidden="true"><span>{g.done ? '🏆' : '🎯'}</span></span>
        <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <span style={{ display: 'block', fontSize: 10.5, fontWeight: 800, letterSpacing: '.09em', opacity: 0.72 }}>{g.done ? 'TOP PRIORITY · DONE' : 'TOP PRIORITY'}</span>
          <span style={{ display: 'block', fontSize: 16.5, fontWeight: 800, marginTop: 3, lineHeight: 1.25, textDecoration: g.done ? 'line-through' : 'none' }}>{g.title}</span>
        </span>
        {steps.length > 0 && <span style={{ fontSize: 13, fontWeight: 800 }}>{done}/{steps.length}</span>}
      </button>
    </div>
  )
}

type Bind = ReturnType<typeof useDrag>['bind']

/** One goal as a card: hold and drag to move it or nest it in another goal. Tap it to edit, add steps and more. */
function GoalCard({ goal: g, index, monday, open, onOpen, drag, bind }: { goal: WeeklyGoal; index: number; monday: string; open: boolean; onOpen: () => void; drag: DragState | null; bind: Bind }) {
  const data = useData()
  const [step, setStep] = useState('')
  const [title, setTitle] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null)
  const steps = g.steps ?? []
  const stepsDone = steps.filter((s) => s.done).length
  const routine = g.routineId ? data.routines.find((r) => r.id === g.routineId) : undefined
  const rw = routine ? routineWeek(data, routine, monday) : null
  const meta = [steps.length ? `${stepsDone}/${steps.length} steps` : '', routine && rw ? `${routine.name} ${rw.done}/${rw.total}` : ''].filter(Boolean).join(' · ')
  const lifted = drag?.item.kind === 'goal' && drag.item.id === g.id
  const nestHere = drag?.target?.kind === 'nest' && drag.target.goalId === g.id && drag.target.index === undefined
  const stepHere = drag?.target?.kind === 'step-at' && drag.target.goalId === g.id && drag.target.index === steps.length && drag.item.kind === 'step' && drag.item.goalId !== g.id
  const slotAt = (j: number) => !!drag?.target && drag.target.kind !== 'goal-at' && 'goalId' in drag.target && drag.target.goalId === g.id && drag.target.index === j
  const addStep = () => {
    if (!step.trim()) return
    data.addGoalStep(g.id, step)
    setStep('')
  }
  const saveTitle = () => {
    if (title !== null && title.trim() && title.trim() !== g.title) data.renameGoal(g.id, title)
    setTitle(null)
  }

  return (
    <div id={`goal-${g.id}`} data-dz="goal" data-goal={g.id} data-index={index} data-steps={steps.length} {...bind({ kind: 'goal', id: g.id, index })}
      className={`card goal-card${lifted ? ' lifted' : ''}${nestHere || stepHere ? ' nest' : ''}`}
      style={lifted ? { transform: `translate(${drag.dx}px, ${drag.dy}px) scale(1.02)` } : undefined}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 12px 13px 14px' }}>
        <button type="button" onClick={() => data.toggleGoal(g.id)} aria-label={g.done ? `Mark ${g.title} not done` : `Mark ${g.title} done`} style={{ lineHeight: 0, padding: 4, margin: -4 }}>
          <Check done={g.done} />
        </button>
        {open ? (
          <input className="text-input" value={title ?? g.title} aria-label="Goal name" onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} enterKeyHint="done"
            style={{ flex: 1, minWidth: 0, fontSize: 15.5, fontWeight: 700, padding: 0 }} />
        ) : (
          <button type="button" onClick={onOpen} aria-expanded={false} style={{ flex: 1, minWidth: 0, textAlign: 'left', color: 'inherit' }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: g.done ? 'var(--muted-4)' : 'var(--ink)', textDecoration: g.done ? 'line-through' : 'none' }}>
              {g.title}{g.priority && <span style={{ color: 'var(--gold-text)', marginLeft: 6 }} aria-label="Top priority">★</span>}
            </div>
            {meta && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-2)', marginTop: 3 }}>{meta}</div>}
          </button>
        )}
        <button type="button" onClick={onOpen} aria-label={open ? `Close ${g.title}` : `Open ${g.title}`} aria-expanded={open}
          style={{ fontSize: 16, lineHeight: 1, padding: '4px 6px', color: 'var(--muted-4)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>›</button>
      </div>

      {(steps.length > 0 || open) && (
        <div style={{ padding: '0 12px 12px 14px', marginTop: -6, display: 'flex', flexDirection: 'column' }}>
          {steps.map((s, j) => {
            const moving = drag?.item.kind === 'step' && drag.item.id === s.id
            return (
              <div key={s.id}>
                <Slot sm on={slotAt(j)} />
                <div data-dz="step" data-goal={g.id} data-index={j} {...bind({ kind: 'step', id: s.id, goalId: g.id, index: j })}
                  className={moving ? 'step-chip lifted' : 'step-chip'} style={moving ? { transform: `translate(${drag.dx}px, ${drag.dy}px)` } : undefined}>
                  <button type="button" onClick={() => data.toggleGoalStep(g.id, s.id)} aria-label={s.done ? `Mark ${s.title} not done` : `Mark ${s.title} done`} style={{ lineHeight: 0 }}>
                    <Check done={s.done} style={{ width: 18, height: 18 }} />
                  </button>
                  {editing?.id === s.id ? (
                    <input className="text-input" autoFocus value={editing.title} aria-label="Step name" enterKeyHint="done"
                      onChange={(e) => setEditing({ id: s.id, title: e.target.value })}
                      onBlur={() => { data.renameGoalStep(g.id, s.id, editing.title); setEditing(null) }}
                      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                      style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, padding: 0 }} />
                  ) : (
                    <button type="button" onClick={() => open ? setEditing({ id: s.id, title: s.title }) : onOpen()}
                      style={{ flex: 1, minWidth: 0, textAlign: 'left', fontSize: 14, fontWeight: 600, color: s.done ? 'var(--muted-4)' : 'var(--ink)', textDecoration: s.done ? 'line-through' : 'none' }}>
                      {s.title}
                    </button>
                  )}
                  {open && <button type="button" onClick={() => data.removeGoalStep(g.id, s.id)} aria-label={`Remove ${s.title}`} style={{ fontSize: 17, lineHeight: 1, color: 'var(--clay)', padding: '2px 6px' }}>×</button>}
                </div>
              </div>
            )
          })}
          <Slot sm on={slotAt(steps.length)} />

          {open && (
            <div style={{ animation: 'pop-in .18s ease' }}>
              <div style={{ marginTop: steps.length ? 4 : 0 }}>
                <AddField value={step} onChange={setStep} onAdd={addStep} placeholder={steps.length ? 'Add another step…' : 'Add a step…'} label={`New step for ${g.title}`} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, fontSize: 13, fontWeight: 700 }}>
                <label style={{ position: 'relative', color: routine ? 'var(--gold-text)' : 'var(--muted-2)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {routine ? routine.name : 'Link routine'} ›
                  <select aria-label="Linked routine" value={g.routineId ?? ''} onChange={(e) => data.updateGoal(g.id, { routineId: e.target.value || undefined })}
                    style={{ position: 'absolute', inset: 0, opacity: 0 }}>
                    <option value="">No routine</option>
                    {data.routines.filter((r) => r.active).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </label>
                <button type="button" onClick={() => data.setPriority(g.id, !g.priority)} aria-pressed={!!g.priority}
                  style={{ color: g.priority ? 'var(--gold-text)' : 'var(--muted-2)', whiteSpace: 'nowrap' }}>
                  {g.priority ? '★ Top priority' : '☆ Make top priority'}
                </button>
                <button type="button" onClick={() => data.removeGoal(g.id)} style={{ marginLeft: 'auto', color: 'var(--clay)' }}>Remove</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

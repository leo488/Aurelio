import { useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Chip, Toggle } from '../components/controls'
import { Ori } from '../components/Ori'
import { flash } from '../components/Toast'
import { FormHeader, Label, OriCard } from '../components/ui'
import { CATEGORY_LABEL } from '../data/select'
import { uid, useData } from '../data/store'
import type { Routine, RoutineIcon, RoutineStep, TimeCategory } from '../data/types'
import { daysLabel, WEEKDAY_LETTER, WEEKDAY_LONG } from '../lib/date'
import { parseStep, totalMinutes } from '../lib/labels'
import { draftIcon, generateRoutine, type RoutineDraft } from '../lib/routineDraft'
import { capitalize } from '../lib/words'
import { StepSheet } from '../sheets/StepSheet'

const CATEGORIES: TimeCategory[] = ['morning', 'afternoon', 'evening', 'night', 'custom']
const REMIND_BEFORE = [5, 10, 15, 30]
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

const toSteps = (d: RoutineDraft, days: number[]): RoutineStep[] =>
  d.steps.map((s) => ({ id: uid(), title: s.title, duration: s.duration, days, countsTowardStreak: true }))

/** The icon follows the time of day; a workout or reading routine keeps its own. */
const iconFor = (current: RoutineIcon, cat: TimeCategory): RoutineIcon =>
  current === 'dumbbell' || current === 'book' ? current : cat === 'evening' || cat === 'night' ? 'moon' : 'sun'

/** /routines/new and /routines/:id/edit. */
export function NewRoutine() {
  const { id } = useParams()
  const existing = useData((s) => (id ? s.routines.find((r) => r.id === id) : undefined))
  if (id && !existing) return <Navigate to="/routines" replace />
  return <Builder key={id ?? 'new'} routine={existing} />
}

/**
 * Build or edit a routine, by hand or from Ori. A generated routine lands here as a draft so it can be
 * reviewed and changed before anything is saved.
 */
function Builder({ routine }: { routine?: Routine }) {
  const data = useData()
  const navigate = useNavigate()
  const state = useLocation().state as { draft?: RoutineDraft; ask?: boolean } | null
  const incoming = state?.draft
  const [name, setName] = useState(routine?.name ?? incoming?.name ?? '')
  const [description, setDescription] = useState(routine?.description ?? incoming?.description ?? '')
  const [icon, setIcon] = useState<RoutineIcon>(routine?.icon ?? (incoming ? draftIcon(incoming) : 'sun'))
  const [category, setCategory] = useState<TimeCategory>(routine?.timeCategory ?? incoming?.timeCategory ?? 'morning')
  const [categoryLabel, setCategoryLabel] = useState(routine?.categoryLabel ?? incoming?.categoryLabel ?? '')
  const [days, setDays] = useState(routine?.repeatPattern.days ?? incoming?.days ?? ALL_DAYS)
  const [time, setTime] = useState(routine ? routine.scheduledTime ?? '' : incoming?.scheduledTime ?? '07:00')
  const [remind, setRemind] = useState(routine?.reminder.enabled ?? true)
  const [before, setBefore] = useState(routine?.reminder.minutesBefore ?? 15)
  const [steps, setSteps] = useState<RoutineStep[]>(() => routine?.steps ?? (incoming ? toSteps(incoming, incoming.days ?? ALL_DAYS) : []))
  const [newStep, setNewStep] = useState('')
  const [editing, setEditing] = useState<RoutineStep | null>(null)
  const [asking, setAsking] = useState(!!state?.ask)
  const [prompt, setPrompt] = useState('')
  const [thinking, setThinking] = useState(false)
  const [generated, setGenerated] = useState(!!incoming)

  const addStep = () => {
    if (!newStep.trim()) return
    setSteps((xs) => [...xs, { id: uid(), ...parseStep(newStep), days, countsTowardStreak: true }])
    setNewStep('')
  }
  const move = (i: number, d: number) =>
    setSteps((xs) => {
      const j = i + d
      if (j < 0 || j >= xs.length) return xs
      const next = [...xs]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  const toggleDay = (d: number) => {
    const on = days.includes(d)
    setDays(on ? days.filter((x) => x !== d) : [...days, d].sort())
    // A new day applies to every step; a removed one is dropped from them when saving.
    if (!on) setSteps((xs) => xs.map((s) => (s.days.includes(d) ? s : { ...s, days: [...s.days, d].sort() })))
  }

  const apply = (d: RoutineDraft) => {
    setName(d.name)
    setDescription(d.description ?? '')
    setIcon(draftIcon(d))
    setCategory(d.timeCategory)
    setCategoryLabel(d.categoryLabel ?? '')
    if (d.scheduledTime) setTime(d.scheduledTime)
    if (d.days) setDays(d.days)
    setSteps(toSteps(d, d.days ?? days))
    setGenerated(true)
  }
  const generate = async () => {
    if (!prompt.trim()) return
    setThinking(true)
    try {
      apply(await generateRoutine(prompt))
      setAsking(false)
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Ori couldn’t build that one')
    } finally {
      setThinking(false)
    }
  }

  const save = () => {
    if (!name.trim()) return flash('Give the routine a name first')
    if (!steps.length) return flash('Add at least one step')
    if (!days.length) return flash('Pick at least one day')
    const n = capitalize(name.trim())
    const fields = {
      name: n, description: description.trim() || undefined, icon: iconFor(icon, category), timeCategory: category,
      categoryLabel: category === 'custom' ? categoryLabel.trim() || undefined : undefined,
      scheduledTime: time || undefined, repeatPattern: { type: 'weekly' as const, days },
      reminder: { enabled: remind && !!time, minutesBefore: before },
      steps: steps.map((s) => ({ ...s, days: s.days.filter((d) => days.includes(d)) })),
    }
    if (routine) {
      data.updateRoutine(routine.id, fields)
      navigate(`/routines/${routine.id}`, { replace: true })
    } else {
      data.createRoutine(fields)
      navigate('/routines', { replace: true })
    }
    flash(`Saved · ${n}`)
  }

  const minutes = totalMinutes(steps)
  const cancel = () => (routine ? navigate(`/routines/${routine.id}`, { replace: true }) : navigate(-1))

  return (
    <main className="screen modal no-bar">
      <FormHeader title={routine ? 'Edit routine' : generated ? 'Review routine' : 'New routine'} onCancel={cancel} onSave={save} canSave={!!name.trim()} />

      {generated && (
        <div className="pad" style={{ paddingTop: 18 }}>
          <div className="ori-card" style={{ alignItems: 'flex-start' }}>
            <Ori size={26} />
            <div style={{ fontSize: 13.5, color: 'var(--chip-suggest-text)', lineHeight: 1.45 }}>
              Here’s a draft{minutes ? ` of about ${minutes} minutes` : ''}. Change anything, then Save. Nothing is saved until you do.
            </div>
          </div>
        </div>
      )}

      <div className="pad" style={{ paddingTop: generated ? 20 : 26 }}>
        <input className="text-input display" autoFocus={!routine && !incoming && !state?.ask} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name it" aria-label="Routine name"
          style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-.03em' }} />
        <input className="text-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" aria-label="Description"
          style={{ fontSize: 15, marginTop: 10 }} />
        <div style={{ height: 1, background: 'var(--divider-confirm)', marginTop: 12 }} />
      </div>

      <div className="pad" style={{ paddingTop: 20 }}>
        <Label style={{ marginBottom: 11 }}>Time of day</Label>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }} role="radiogroup" aria-label="Time of day">
          {CATEGORIES.map((c) => <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{CATEGORY_LABEL[c]}</Chip>)}
        </div>
        {category === 'custom' && (
          <input className="text-input" value={categoryLabel} onChange={(e) => setCategoryLabel(e.target.value)} placeholder="Label it, e.g. Before class" aria-label="Custom label"
            style={{ fontSize: 16, fontWeight: 700, marginTop: 12, padding: '12px 14px', background: 'var(--chip-alt-2)', borderRadius: 14 }} />
        )}
      </div>

      <div className="pad" style={{ paddingTop: 16, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: '1px solid var(--divider)' }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Start time</div>
          <input type="time" aria-label="Start time" value={time} onChange={(e) => setTime(e.target.value)}
            style={{ border: 'none', background: 'var(--chip-alt-2)', borderRadius: 12, padding: '8px 10px', fontSize: 14, fontWeight: 700, color: 'var(--ink)', outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0 12px' }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Repeats</div>
          <div style={{ fontSize: 13.5, color: 'var(--muted-2)', fontWeight: 600 }}>{days.length ? daysLabel(days) : 'No days picked'}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, paddingBottom: 14, borderBottom: '1px solid var(--divider)' }}>
          {WEEKDAY_LETTER.map((l, d) => {
            const on = days.includes(d)
            return (
              <button key={d} type="button" aria-pressed={on} aria-label={WEEKDAY_LONG[d]} onClick={() => toggleDay(d)}
                style={{ flex: 1, textAlign: 'center', padding: '11px 0', borderRadius: 14, background: on ? 'var(--ink)' : 'var(--chip)', color: on ? 'var(--paper)' : 'var(--muted-2)', fontSize: 12.5, fontWeight: 700 }}>
                {l}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
          <button type="button" style={{ textAlign: 'left' }} onClick={() => setBefore(REMIND_BEFORE[(REMIND_BEFORE.indexOf(before) + 1) % REMIND_BEFORE.length])}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Remind me</div>
            <div style={{ fontSize: 12, color: 'var(--muted-2)', marginTop: 2 }}>{time ? `${before} minutes before` : 'Set a start time to get reminders'}</div>
          </button>
          <Toggle label="Remind me" on={remind && !!time} onChange={(v) => setRemind(v)} />
        </div>
      </div>

      <div className="pad" style={{ paddingTop: 14, paddingBottom: 'calc(40px + var(--safe-bottom))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Label>Steps</Label>
          {minutes > 0 && <div style={{ fontSize: 12.5, color: 'var(--muted-2)', fontWeight: 700 }}>~{minutes} min</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          {steps.map((st, i) => (
            <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px 10px 14px', borderRadius: 12, background: 'var(--white)', animation: 'fade-in .2s ease' }}>
              <div style={{ width: 20, fontSize: 12, fontWeight: 800, color: 'var(--drag-handle)' }}>{i + 1}</div>
              <button type="button" onClick={() => setEditing(st)} style={{ flex: 1, fontSize: 15, fontWeight: 700, textAlign: 'left' }}>{st.title}</button>
              {!!st.duration && <div style={{ fontSize: 12, color: 'var(--muted-3)', fontWeight: 600 }}>{st.duration} min</div>}
              <button type="button" aria-label={`Move ${st.title} up`} onClick={() => move(i, -1)} style={{ padding: 4, fontSize: 14, color: i === 0 ? 'var(--arrow-off)' : 'var(--chip-text)' }}>↑</button>
              <button type="button" aria-label={`Move ${st.title} down`} onClick={() => move(i, 1)} style={{ padding: 4, fontSize: 14, color: i === steps.length - 1 ? 'var(--arrow-off)' : 'var(--chip-text)' }}>↓</button>
              <button type="button" aria-label={`Remove ${st.title}`} onClick={() => setSteps((xs) => xs.filter((x) => x.id !== st.id))} style={{ padding: '4px 6px', fontSize: 16, color: 'var(--clay)' }}>×</button>
            </div>
          ))}
          {steps.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted-3)', padding: '4px 2px 2px' }}>No steps yet. Add the first one below.</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 6px 6px 14px', borderRadius: 12, border: '1px dashed var(--dashed)' }}>
            <input value={newStep} onChange={(e) => setNewStep(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addStep()} placeholder="Add a step…" aria-label="New step"
              style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 16, color: 'var(--ink)', padding: '8px 0' }} />
            <button type="button" onClick={addStep} style={{ background: 'var(--ink)', color: 'var(--paper)', fontSize: 12.5, fontWeight: 800, padding: '9px 14px', borderRadius: 14 }}>Add</button>
          </div>
        </div>

        {asking ? (
          <div className="ori-card" style={{ marginTop: 20, flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
            <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
              <Ori size={26} animate={thinking} />
              <div style={{ fontSize: 13.5, color: 'var(--chip-suggest-text)', fontWeight: 700 }}>{thinking ? 'Putting it together…' : 'Describe the routine you want'}</div>
            </div>
            <textarea autoFocus value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} aria-label="Describe the routine"
              placeholder="Create a 30-minute morning routine for me"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void generate() } }}
              style={{ width: '100%', background: 'var(--white)', border: 'none', borderRadius: 14, padding: 12, fontSize: 16, lineHeight: 1.45, outline: 'none', resize: 'none', color: 'var(--ink)' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-ink" style={{ flex: 1, padding: 12 }} disabled={thinking || !prompt.trim()} onClick={() => void generate()}>Build it</button>
              <button type="button" className="btn btn-chip" style={{ padding: '12px 16px' }} onClick={() => setAsking(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <OriCard style={{ marginTop: 20 }} onClick={() => setAsking(true)} text={generated ? 'Ask Ori for a different version.' : 'Or tell Ori what you want and review its draft.'} />
        )}
      </div>

      {editing && (
        <StepSheet routine={{ id: routine?.id ?? 'draft', repeatPattern: { type: 'weekly', days } }} step={editing} onClose={() => setEditing(null)}
          onSave={(s) => setSteps((xs) => xs.map((x) => (x.id === s.id ? s : x)))}
          onDelete={() => setSteps((xs) => xs.filter((x) => x.id !== editing.id))} />
      )}
    </main>
  )
}

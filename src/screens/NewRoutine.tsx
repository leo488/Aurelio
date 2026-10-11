import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Row, Toggle } from '../components/controls'
import { Icon } from '../components/Icon'
import { Ori } from '../components/Ori'
import { flash } from '../components/Toast'
import { CATEGORY_LABEL } from '../data/select'
import { uid, useData } from '../data/store'
import type { RoutineIcon, RoutineStep, TimeCategory } from '../data/types'
import { daysLabel, looseTime, WEEKDAY_LETTER } from '../lib/date'
import { parseStep, totalMinutes } from '../lib/labels'
import { draftIcon, generateRoutine, type RoutineDraft } from '../lib/routineDraft'
import { capitalize } from '../lib/words'

const ICONS: RoutineIcon[] = ['sun', 'moon', 'dumbbell', 'book']
const CATEGORIES: TimeCategory[] = ['morning', 'afternoon', 'evening', 'night', 'custom']
const REMIND_BEFORE = [5, 10, 15, 30]
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

const toSteps = (d: RoutineDraft, days: number[]): RoutineStep[] =>
  d.steps.map((s) => ({ id: uid(), title: s.title, duration: s.duration, days, countsTowardStreak: true }))

/**
 * New routine, by hand or from Ori. A generated routine lands here as a draft so it can be
 * reviewed and changed before anything is saved.
 */
export function NewRoutine() {
  const data = useData()
  const navigate = useNavigate()
  const state = useLocation().state as { draft?: RoutineDraft; ask?: boolean } | null
  const incoming = state?.draft
  const [name, setName] = useState(incoming?.name ?? '')
  const [description, setDescription] = useState(incoming?.description ?? '')
  const [icon, setIcon] = useState<RoutineIcon>(incoming ? draftIcon(incoming) : 'sun')
  const [category, setCategory] = useState<TimeCategory>(incoming?.timeCategory ?? 'morning')
  const [categoryLabel, setCategoryLabel] = useState(incoming?.categoryLabel ?? '')
  const [days, setDays] = useState(incoming?.days ?? ALL_DAYS)
  const [time, setTime] = useState(incoming?.scheduledTime ?? '07:00')
  const [remind, setRemind] = useState(true)
  const [before, setBefore] = useState(10)
  const [steps, setSteps] = useState<RoutineStep[]>(() => (incoming ? toSteps(incoming, incoming.days ?? ALL_DAYS) : []))
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [asking, setAsking] = useState(!!state?.ask)
  const [prompt, setPrompt] = useState('')
  const [thinking, setThinking] = useState(false)
  const [generated, setGenerated] = useState(!!incoming)

  const addStep = () => {
    if (!draft.trim()) return setAdding(false)
    const p = parseStep(draft)
    setSteps((xs) => [...xs, { id: uid(), ...p, days, countsTowardStreak: true }])
    setDraft('')
  }
  const move = (i: number, d: number) =>
    setSteps((xs) => {
      const next = [...xs]
      const [m] = next.splice(i, 1)
      next.splice(i + d, 0, m)
      return next
    })

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
    if (!name.trim()) return
    const n = capitalize(name.trim())
    data.createRoutine({
      name: n, description: description.trim() || undefined, icon, timeCategory: category,
      categoryLabel: category === 'custom' ? categoryLabel.trim() || undefined : undefined,
      scheduledTime: time || undefined, repeatPattern: { type: 'weekly', days },
      reminder: { enabled: remind && !!time, minutesBefore: before },
      steps: steps.map((s) => ({ ...s, days: s.days.filter((d) => days.includes(d)) })),
    })
    navigate('/routines', { replace: true })
    flash(`${n} saved · ${daysLabel(days)}${time ? ` at ${looseTime(time)}` : ''}`)
  }

  const minutes = totalMinutes(steps)

  return (
    <main className="screen modal no-bar">
      <div className="pad top-12" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" onClick={() => navigate(-1)} style={{ fontSize: 15, fontWeight: 600, color: 'var(--muted-2)' }}>Cancel</button>
        <div style={{ fontSize: 14, fontWeight: 800 }}>{generated ? 'Review routine' : 'New routine'}</div>
        <button type="button" onClick={save} disabled={!name.trim()} style={{ fontSize: 15, fontWeight: 800, color: name.trim() ? 'var(--gold-text)' : 'var(--muted-4)' }}>Save</button>
      </div>

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

      <div className="pad" style={{ paddingTop: generated ? 20 : 28 }}>
        <input className="text-input display" autoFocus={!incoming && !state?.ask} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name it" aria-label="Routine name"
          style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-.03em' }} />
        <input className="text-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" aria-label="Description"
          style={{ fontSize: 16, marginTop: 10 }} />
        <div style={{ height: 1, background: 'var(--divider-confirm)', marginTop: 14 }} />
      </div>

      <div className="pad" style={{ paddingTop: 22 }}>
        <div className="label" style={{ marginBottom: 12 }}>Time of day</div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }} role="radiogroup" aria-label="Time of day">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={category === c} className={`chip${category === c ? ' active' : ''}`} style={{ padding: '9px 14px' }} onClick={() => setCategory(c)}>
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
        {category === 'custom' && (
          <input className="text-input" value={categoryLabel} onChange={(e) => setCategoryLabel(e.target.value)} placeholder="Label it, e.g. Before class" aria-label="Custom label"
            style={{ fontSize: 16, fontWeight: 700, marginTop: 14, padding: '12px 14px', background: 'var(--white)', borderRadius: 14 }} />
        )}
      </div>

      <div className="pad" style={{ paddingTop: 22 }}>
        <div className="label" style={{ marginBottom: 12 }}>Icon</div>
        <div style={{ display: 'flex', gap: 10 }} role="radiogroup" aria-label="Icon">
          {ICONS.map((i) => (
            <button key={i} type="button" role="radio" aria-checked={icon === i} aria-label={i} onClick={() => setIcon(i)}
              style={{ width: 46, height: 46, borderRadius: 16, background: icon === i ? 'var(--ink)' : 'var(--chip-alt-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={i} size={21} color={icon === i ? 'var(--gold)' : 'var(--muted-2)'} />
            </button>
          ))}
        </div>
      </div>

      <div className="pad" style={{ paddingTop: 24, display: 'flex', flexDirection: 'column' }}>
        <Row title="Repeats" value={daysLabel(days)} />
        <div style={{ display: 'flex', gap: 7, padding: '14px 0' }}>
          {WEEKDAY_LETTER.map((l, d) => {
            const on = days.includes(d)
            return (
              <button key={d} type="button" aria-pressed={on} aria-label={['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][d]}
                onClick={() => setDays(on ? (days.length > 1 ? days.filter((x) => x !== d) : days) : [...days, d].sort())}
                style={{ flex: 1, textAlign: 'center', padding: '11px 0', borderRadius: 14, background: on ? 'var(--ink)' : 'var(--chip)', color: on ? 'var(--paper)' : 'var(--muted-2)', fontSize: 12.5, fontWeight: 700 }}>
                {l}
              </button>
            )
          })}
        </div>
        <Row title="Start time" right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {time && <button type="button" onClick={() => setTime('')} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted-3)' }}>Clear</button>}
            <label className="row-value" style={{ position: 'relative' }}>
              {time ? looseTime(time) : 'Any time'} ›
              <input type="time" aria-label="Start time" value={time} onChange={(e) => setTime(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0 }} />
            </label>
          </div>
        } />
        <Row title="Remind me" sub={time ? `${before} minutes before · tap to change` : 'Set a start time to get reminders'}
          onClick={time ? () => setBefore(REMIND_BEFORE[(REMIND_BEFORE.indexOf(before) + 1) % REMIND_BEFORE.length]) : undefined}
          right={<Toggle label="Remind me" on={remind && !!time} onChange={(v) => time && setRemind(v)} />} />
      </div>

      <div className="pad" style={{ paddingTop: 22, paddingBottom: 'calc(40px + var(--safe-bottom))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div className="label">Steps</div>
          {minutes > 0 && <div style={{ fontSize: 12.5, color: 'var(--muted-2)', fontWeight: 700 }}>~{minutes} min</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 12 }}>
          {steps.map((st, i) => (
            <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 18, background: 'var(--white)' }}>
              <div style={{ color: 'var(--muted-3)', fontSize: 12.5, fontWeight: 800, width: 16 }}>{i + 1}</div>
              <input className="text-input" value={st.title} aria-label={`Step ${i + 1}`} onChange={(e) => setSteps((xs) => xs.map((x) => (x.id === st.id ? { ...x, title: e.target.value } : x)))}
                style={{ flex: 1, fontSize: 16, fontWeight: 700 }} />
              {st.duration && <div style={{ fontSize: 12.5, color: 'var(--muted-2)', whiteSpace: 'nowrap' }}>{st.duration} min</div>}
              <button type="button" className="reorder-btn" aria-label={`Move ${st.title} up`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
              <button type="button" className="reorder-btn" aria-label={`Move ${st.title} down`} disabled={i === steps.length - 1} onClick={() => move(i, 1)}>↓</button>
              <button type="button" aria-label={`Remove ${st.title}`} onClick={() => setSteps((xs) => xs.filter((x) => x.id !== st.id))} style={{ color: 'var(--muted-4)', fontSize: 13, padding: '0 2px' }}>✕</button>
            </div>
          ))}
          {adding ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 18, background: 'var(--white)' }}>
              <input className="text-input" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Step, then minutes (Stretch 5)" aria-label="New step"
                onKeyDown={(e) => e.key === 'Enter' && addStep()} onBlur={addStep} style={{ fontSize: 16, fontWeight: 700 }} />
            </div>
          ) : (
            <button type="button" onClick={() => setAdding(true)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 18, border: '1px dashed var(--dashed)', color: 'var(--muted-2)' }}>
              <span style={{ fontSize: 15 }}>+</span><span style={{ fontSize: 15, fontWeight: 700 }}>Add step</span>
            </button>
          )}
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
              style={{ width: '100%', background: 'var(--white)', border: 'none', borderRadius: 14, padding: 12, fontSize: 16, lineHeight: 1.45, outline: 'none', resize: 'none' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-ink" style={{ flex: 1, padding: 12 }} disabled={thinking || !prompt.trim()} onClick={() => void generate()}>Build it</button>
              <button type="button" className="btn btn-chip" style={{ padding: '12px 16px' }} onClick={() => setAsking(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button type="button" className="ori-card" style={{ marginTop: 20 }} onClick={() => setAsking(true)}>
            <Ori size={26} />
            <div style={{ fontSize: 13.5, color: 'var(--chip-suggest-text)', lineHeight: 1.45 }}>{generated ? 'Ask Ori for a different version.' : 'Or let Ori draft it. “A 30-minute morning routine.”'}</div>
          </button>
        )}
      </div>
    </main>
  )
}

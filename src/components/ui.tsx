import { useNavigate } from 'react-router-dom'
import { useMe } from '../data/session'
import { useData } from '../data/store'
import type { Priority, Routine, Task, TimeCategory } from '../data/types'
import { addDays, dt, hhmm, logicalToday, minutesOf, MONTHS, weekday, WEEKDAY_LONG, WEEKDAY_SHORT } from '../lib/date'
import { Avatar } from './Avatar'
import { Check, Chip, Toggle } from './controls'
import { Icon, type IconName } from './Icon'
import { Ori } from './Ori'
import { Sheet } from './Sheet'
import { flash } from './Toast'

// Building blocks copied from the v2 prototype (design_handoff_aurelio_dark_skin/design/Aurelio Prototype v2 Dark.dc.html).

/** The gold progress ring: an SVG arc on a dark track. Today uses 76/34/6, the runner 172/80/7. */
export function Ring({ pct, size = 76, r = 34, width = 6, glow = true, children }: { pct: number; size?: number; r?: number; width?: number; glow?: boolean; children?: React.ReactNode }) {
  const c = 2 * Math.PI * r
  const mid = size / 2
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: '0 0 auto' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={mid} cy={mid} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={width} />
        <circle cx={mid} cy={mid} r={r} fill="none" stroke="var(--gold)" strokeWidth={width} strokeLinecap="round" strokeDasharray={c.toFixed(1)}
          strokeDashoffset={(c * (1 - Math.max(0, Math.min(100, pct)) / 100)).toFixed(1)}
          style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)', filter: glow ? 'var(--glow-ring)' : undefined }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
    </div>
  )
}

const CAT: Record<TimeCategory, { icon: IconName; color: string }> = {
  morning: { icon: 'sun', color: 'var(--gold)' },
  afternoon: { icon: 'leaf', color: 'var(--olive)' },
  evening: { icon: 'sunset', color: 'var(--iris)' },
  night: { icon: 'moon', color: 'var(--night-tint)' },
  custom: { icon: 'focus', color: 'var(--gold-text)' },
}

/** A routine's icon and tint: its time of day, unless it has its own (dumbbell, book). Paused routines go grey. */
export function catLook(r: Pick<Routine, 'icon' | 'timeCategory' | 'active'>) {
  const c = CAT[r.timeCategory] ?? CAT.custom
  const icon: IconName = r.icon === 'dumbbell' || r.icon === 'book' ? r.icon : c.icon
  return { icon, color: r.active ? c.color : 'var(--drag-handle)' }
}

export type HeatKind = 'full' | 'partial' | 'missed' | 'skip' | 'off' | 'today' | 'pending' | 'future'

export function heatStyle(kind: HeatKind, radius: number): React.CSSProperties {
  const base: React.CSSProperties = { aspectRatio: '1', boxSizing: 'border-box', borderRadius: radius }
  switch (kind) {
    case 'full': return { ...base, background: 'var(--olive)' }
    case 'partial': return { ...base, background: 'var(--olive-pale)' }
    case 'missed': return { ...base, background: 'var(--heat-missed)' }
    case 'skip': return { ...base, border: '1.4px dashed var(--heat-skipped)' }
    case 'off': return { ...base, background: 'transparent', border: '1px solid var(--heat-off)' }
    case 'today': return { ...base, background: 'var(--gold)' }
    case 'pending': return { ...base, border: '1.8px solid var(--gold)' }
    case 'future': return { ...base, background: 'var(--heat-future)' }
  }
}

/** M T W T F S S over a seven-column grid. */
export function WeekLetters({ gap, size = 10, marginBottom = 8 }: { gap: number; size?: number; marginBottom?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap, fontSize: size, color: 'var(--muted-3)', fontWeight: 800, textAlign: 'center', marginBottom }}>
      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => <div key={i}>{l}</div>)}
    </div>
  )
}

export const Label = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => <div className="label" style={style}>{children}</div>

/** 40px cream circle with a plus, top right of list screens. */
export function PlusButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label}
      style={{ width: 40, height: 40, flex: '0 0 auto', borderRadius: '50%', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="plus" size={19} stroke={1.9} color="var(--paper)" />
    </button>
  )
}

/** Big title with an optional grey line under it, and an optional action on the right. */
export function ScreenHeader({ title, sub, right, size = 32 }: { title: string; sub?: React.ReactNode; right?: React.ReactNode; size?: number }) {
  return (
    <div className="pad top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <h1 className="display" style={{ fontSize: size, fontWeight: 700, letterSpacing: '-.03em', margin: 0 }}>{title}</h1>
        {sub && <div style={{ fontSize: 13, color: 'var(--muted-2)', marginTop: 2, fontWeight: 600 }}>{sub}</div>}
      </div>
      {right}
    </div>
  )
}

/** Cancel · Title · Save, at the top of the builder and task forms. */
export function FormHeader({ title, onCancel, onSave, saveLabel = 'Save', canSave = true }: { title: string; onCancel: () => void; onSave: () => void; saveLabel?: string; canSave?: boolean }) {
  return (
    <div className="pad top-12" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <button type="button" onClick={onCancel} style={{ fontSize: 15, fontWeight: 600, color: 'var(--muted-2)' }}>Cancel</button>
      <div style={{ fontSize: 14, fontWeight: 800 }}>{title}</div>
      <button type="button" onClick={onSave} style={{ fontSize: 15, fontWeight: 800, color: canSave ? 'var(--gold-text)' : 'var(--muted-4)' }}>{saveLabel}</button>
    </div>
  )
}

/** "Or tell Ori…" card at the bottom of forms. */
export function OriCard({ text, onClick, style }: { text: string; onClick: () => void; style?: React.CSSProperties }) {
  return (
    <button type="button" className="ori-card" onClick={onClick} style={style}>
      <Ori size={26} />
      <div style={{ fontSize: 13.5, color: 'var(--chip-suggest-text)', lineHeight: 1.45 }}>{text}</div>
    </button>
  )
}

/** Checkable step row used on Today's card and the routine page. */
export function StepRow({ title, minutes, done, onToggle, divided, pad = 9 }: { title: string; minutes?: number; done: boolean; onToggle: () => void; divided?: boolean; pad?: number }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={done}
      style={{ display: 'flex', alignItems: 'center', gap: 13, padding: `${pad}px 0`, width: '100%', textAlign: 'left', borderBottom: divided ? '1px solid var(--divider)' : undefined }}>
      <Check done={done} />
      <div style={{ flex: 1, fontSize: 15.5, ...(done ? { color: 'var(--muted-4)', textDecoration: 'line-through' } : { fontWeight: 600 }) }}>{title}</div>
      {!!minutes && <div style={{ fontSize: 12.5, color: 'var(--muted-3)', fontWeight: 600 }}>{minutes} min</div>}
    </button>
  )
}

/** Primary/secondary pair of flat buttons (Pause · Delete, Last milestone · After a miss). */
export function FlatButton({ children, onClick, tone = 'chip', style }: { children: React.ReactNode; onClick: () => void; tone?: 'chip' | 'ink' | 'clay'; style?: React.CSSProperties }) {
  const tones = {
    chip: { background: 'var(--chip)', color: 'var(--chip-suggest-text)' },
    ink: { background: 'var(--ink)', color: 'var(--paper)' },
    clay: { background: 'var(--clay-badge)', color: 'var(--clay)' },
  }
  return (
    <button type="button" onClick={onClick} style={{ flex: 1, padding: 14, borderRadius: 10, fontSize: 14, fontWeight: 800, textAlign: 'center', ...tones[tone], ...style }}>{children}</button>
  )
}

// ─── Tasks ──────────────────────────────────────────────────────────────

export const PRIORITY_LABEL: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High' }

/** "Monday 12 October" */
export const longDay = (iso: string) => {
  const d = new Date(`${iso}T12:00`)
  return `${WEEKDAY_LONG[weekday(iso)]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** Today, Tomorrow, Yesterday, else "Wed 14". */
export const shortDay = (iso: string, today = logicalToday()) => {
  if (iso === today) return 'Today'
  if (iso === addDays(today, 1)) return 'Tomorrow'
  if (iso === addDays(today, -1)) return 'Yesterday'
  return `${WEEKDAY_SHORT[weekday(iso)]} ${Number(iso.slice(8, 10))}`
}

/** "Medium priority · Reminder · Notes" */
export const taskLine = (t: Task) => [`${PRIORITY_LABEL[t.priority]} priority`, t.reminderAt ? 'Reminder' : null, t.notes ? 'Notes' : null].filter(Boolean).join(' · ')

/** Reminder time for a task: 15 minutes before its start, or the morning summary (09:00) when it has no time. */
export function defaultReminder(date: string | undefined, start: string | undefined, before = 15) {
  if (!date) return undefined
  if (!start) return dt(date, '09:00')
  const m = minutesOf(start) - before
  return m < 0 ? dt(addDays(date, -1), hhmm(m + 1440)) : dt(date, hhmm(m))
}

function TaskBox({ t, today }: { t: Task; today: string }) {
  const late = !t.completed && !!t.date && t.date < today
  return <Check done={t.completed} overdue={(t.priority === 'high' && !t.completed) || late} />
}

/** Time column, tick, title and meta: Today's plan and the calendar day panel. */
export function TaskTimeRow({ task: t, onOpen, divider = 'var(--divider)' }: { task: Task; onOpen: (id: string) => void; divider?: string }) {
  const toggle = useData((s) => s.toggleTask)
  const today = logicalToday()
  return (
    <div style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: `1px solid ${divider}`, animation: 'fade-in .25s ease' }}>
      <div style={{ width: 44, flex: '0 0 auto', fontSize: 12.5, fontWeight: 800, paddingTop: 3, color: t.completed ? 'var(--drag-handle)' : t.startTime ? 'var(--ink)' : 'var(--muted-3)' }}>{t.startTime ?? 'Any'}</div>
      <button type="button" aria-label={`${t.completed ? 'Mark not done' : 'Complete'}: ${t.title}`} aria-pressed={t.completed} onClick={() => { if (!t.completed) flash(`Done · ${t.title}`); toggle(t.id) }} style={{ lineHeight: 0, flex: '0 0 auto' }}>
        <TaskBox t={t} today={today} />
      </button>
      <button type="button" onClick={() => onOpen(t.id)} style={{ flex: 1, textAlign: 'left' }}>
        <div style={{ fontSize: 15.5, ...(t.completed ? { color: 'var(--muted-4)', textDecoration: 'line-through' } : { fontWeight: 700 }) }}>{t.title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted-2)', marginTop: 2 }}>{taskLine(t)}</div>
      </button>
    </div>
  )
}

/** Tick, title and "when" line: the Upcoming list. Overdue "when" lines are clay. */
export function TaskWhenRow({ task: t, onOpen }: { task: Task; onOpen: (id: string) => void }) {
  const toggle = useData((s) => s.toggleTask)
  const today = logicalToday()
  const late = !t.completed && !!t.date && t.date < today
  const when = t.date ? `${shortDay(t.date, today)}${t.startTime ? ` · ${t.startTime}` : ''}` : 'Someday'
  return (
    <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start', padding: '14px 0', borderBottom: '1px solid var(--divider)' }}>
      <button type="button" aria-label={`${t.completed ? 'Mark not done' : 'Complete'}: ${t.title}`} aria-pressed={t.completed} onClick={() => { if (!t.completed) flash(`Done · ${t.title}`); toggle(t.id) }} style={{ lineHeight: 0, marginTop: 1, flex: '0 0 auto' }}>
        <TaskBox t={t} today={today} />
      </button>
      <button type="button" onClick={() => onOpen(t.id)} style={{ flex: 1, textAlign: 'left' }}>
        <div style={{ fontSize: 15.5, ...(t.completed ? { color: 'var(--muted-4)', textDecoration: 'line-through' } : { fontWeight: 700 }) }}>{t.title}</div>
        <div style={{ fontSize: 12.5, marginTop: 2, ...(late ? { fontWeight: 700, color: 'var(--clay)' } : { fontWeight: 500, color: 'var(--muted-2)' }) }}>{when}</div>
      </button>
    </div>
  )
}

/** Tap a task: edit priority and reminder, complete it, move it a day or a week, or delete it. */
export function TaskSheet({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const data = useData()
  const navigate = useNavigate()
  const today = logicalToday()
  const t = taskId ? data.tasks.find((x) => x.id === taskId) : undefined
  if (!t) return null
  const move = (date: string) => {
    data.updateTask(t.id, { date, reminderAt: t.reminderAt ? defaultReminder(date, t.startTime) : undefined })
    onClose()
    flash(`Moved to ${shortDay(date, today)}`)
  }
  const base = t.date ?? today
  return (
    <Sheet open onClose={onClose} label={t.title}>
      <div className="display" style={{ fontSize: 27, fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.15 }}>{t.title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, color: 'var(--muted-2)' }}>
        <Icon name="clock" size={15} stroke={1.7} color="var(--muted-2)" />
        <div style={{ fontSize: 13, fontWeight: 700 }}>{t.date ? `${longDay(t.date)} · ${t.startTime ? (t.endTime ? `${t.startTime} – ${t.endTime}` : t.startTime) : 'Any time'}` : 'Someday · no date'}</div>
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--chip-text)', marginTop: 10 }}>{t.notes || 'No notes'}</div>
      <div style={{ height: 1, background: 'var(--divider-confirm)', marginTop: 16 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--divider)' }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Priority</div>
        <div style={{ display: 'flex', gap: 6 }} role="radiogroup" aria-label="Priority">
          {(['low', 'medium', 'high'] as Priority[]).map((p) => <Chip key={p} active={t.priority === p} onClick={() => data.updateTask(t.id, { priority: p })}>{PRIORITY_LABEL[p]}</Chip>)}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Reminder</div>
        <Toggle label="Reminder" on={!!t.reminderAt} onChange={(on) => data.updateTask(t.id, { reminderAt: on ? defaultReminder(t.date ?? today, t.startTime) : undefined })} />
      </div>
      <button type="button" onClick={() => { if (!t.completed) flash(`Done · ${t.title}`); data.toggleTask(t.id); onClose() }}
        style={{ width: '100%', marginTop: 8, padding: 16, borderRadius: 12, background: 'var(--ink)', color: 'var(--paper)', fontSize: 15, fontWeight: 800 }}>
        {t.completed ? 'Mark as not done' : 'Mark complete'}
      </button>
      <div style={{ display: 'flex', gap: 8, marginTop: 9 }}>
        <FlatButton style={{ padding: '14px 6px', fontSize: 13.5 }} onClick={() => move(addDays(base, 1))}>Next day</FlatButton>
        <FlatButton style={{ padding: '14px 6px', fontSize: 13.5 }} onClick={() => move(addDays(base, 7))}>Next week</FlatButton>
        <FlatButton style={{ padding: '14px 6px', fontSize: 13.5 }} tone="clay" onClick={() => { data.removeTask(t.id); onClose(); flash(`Deleted · ${t.title}`) }}>Delete</FlatButton>
      </div>
      <button type="button" onClick={() => { onClose(); navigate(`/tasks/${t.id}`) }} style={{ width: '100%', marginTop: 14, fontSize: 13, fontWeight: 800, color: 'var(--gold-text)', textAlign: 'center' }}>Edit details</button>
    </Sheet>
  )
}

// ─── The shared layer ───────────────────────────────────────────────────

/** The partner's progress for today, as published by their app. Numbers only, never the items. */
export function usePartnerLine() {
  const status = useData((s) => s.partnerStatus)
  const today = logicalToday()
  const p = status?.date === today ? status : null
  if (!p) return 'Nothing shared yet today'
  return p.total ? `${p.done} of ${p.total} ${p.unit} done today` : `No ${p.unit} today`
}

/** The strip at the bottom of Today: who, how they're doing, Remind. */
export function PartnerStrip({ onRemind }: { onRemind: () => void }) {
  const { partnerRole, partnerName } = useMe()
  const line = usePartnerLine()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 16px', borderRadius: 12, background: 'var(--chip-alt-2)' }}>
      <Avatar user={partnerRole} size={28} />
      <div style={{ flex: 1, fontSize: 13.5, color: 'var(--chip-suggest-text)', lineHeight: 1.4 }}><span style={{ fontWeight: 800, color: 'var(--ink)' }}>{partnerName}</span> · {line}</div>
      <button type="button" onClick={onRemind} style={{ background: 'var(--white)', color: 'var(--ink)', fontSize: 12, fontWeight: 800, padding: '8px 12px', borderRadius: 99 }}>Remind</button>
    </div>
  )
}

const PRESETS = {
  // What Leo sends Soniya, and what Soniya sends Leo.
  sonia: ['Don’t forget your next appointment', 'Call your mum tonight', 'Drink some water', 'Take a proper break'],
  leo: ['Don’t skip your evening routine', 'Time for your workout', 'Drink some water', 'Lights out by 23:00 tonight'],
}

export function useCheer() {
  const cheer = useData((s) => s.cheer)
  const { partnerName } = useMe()
  return () => (cheer() ? flash(`Cheer sent to ${partnerName}`) : flash(`${partnerName} hasn’t signed in yet`))
}

/** Remind the other person: a few presets, sent as a notification on their phone. */
export function RemindSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const send = useData((s) => s.sendNudge)
  const { partnerRole, partnerName } = useMe()
  const cheer = useCheer()
  return (
    <Sheet open={open} onClose={onClose} label={`Remind ${partnerName}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar user={partnerRole} size={40} />
        <div>
          <div className="display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.025em' }}>Remind {partnerName}</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted-2)', marginTop: 2 }}>It arrives as a notification on their phone</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 14 }}>
        {PRESETS[partnerRole].map((p) => (
          <button key={p} type="button" onClick={() => { onClose(); flash(send(p) ? `Sent to ${partnerName} · “${p}”` : `${partnerName} hasn’t signed in yet`) }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', borderBottom: '1px solid var(--divider)', width: '100%', textAlign: 'left' }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{p}</div>
            <div style={{ fontSize: 13, color: 'var(--gold-text)', fontWeight: 800 }}>Send</div>
          </button>
        ))}
      </div>
      <button type="button" onClick={() => { onClose(); cheer() }} style={{ width: '100%', marginTop: 16, padding: 15, borderRadius: 12, background: 'var(--chip)', color: 'var(--chip-suggest-text)', fontSize: 14.5, fontWeight: 800 }}>Just send a cheer</button>
    </Sheet>
  )
}

/** Today in the header: "MONDAY 12 OCTOBER". */
export const headerDate = (iso: string) => longDay(iso).toUpperCase()


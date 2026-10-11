import { useState } from 'react'
import { Avatar } from '../components/Avatar'
import { Row } from '../components/controls'
import { Ember } from '../components/Ember'
import { Sheet } from '../components/Sheet'
import { flash } from '../components/Toast'
import { useMe } from '../data/session'
import { dayProgress, tasksOn } from '../data/select'
import { useData } from '../data/store'
import type { Role } from '../data/types'
import { clock, dt, hhmm, logicalToday, nowMinutes, relativeDay } from '../lib/date'

const C = 295 // ring circumference used by the design (r = 47)

/**
 * The shared layer, kept light: each other's progress as a number (never the items), a nudge,
 * some encouragement and a short feed of what happened.
 */
export function Together() {
  const data = useData()
  const { me, partner, partnerRole, partnerName } = useMe()
  const today = logicalToday()
  const [nudging, setNudging] = useState(false)

  const mine = me.role === 'leo'
    ? (() => { const p = dayProgress(data, today); return { done: p.done, total: p.total, unit: 'routines' } })()
    : (() => { const l = tasksOn(data, today); return { done: l.filter((t) => t.completed).length, total: l.length, unit: 'tasks' } })()
  const theirs = data.partnerStatus?.date === today ? data.partnerStatus : null

  const person = (role: Role, label: string, p: { done: number; total: number; unit: string } | null, streak?: number) => (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto' }}>
        <svg width="100" height="100" viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
          <circle cx="50" cy="50" r="47" fill="none" stroke="#E4DBCC" strokeWidth="5" />
          <circle cx="50" cy="50" r="47" fill="none" stroke="#C79A4A" strokeWidth="5" strokeLinecap="round" strokeDasharray={C}
            strokeDashoffset={C - Math.round(C * (p && p.total ? p.done / p.total : 0))} transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset .5s ease' }} />
        </svg>
        <Avatar user={role} size={78} style={{ position: 'absolute', top: 11, left: 11 }} />
      </div>
      <div className="display" style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.02em', marginTop: 14 }}>{label}</div>
      <div style={{ fontSize: 12.5, color: 'var(--muted-2)', marginTop: 2 }}>{p ? (p.total ? `${p.done} of ${p.total} ${p.unit}` : `No ${p.unit} today`) : 'Nothing shared yet today'}</div>
      {!!streak && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 6 }}>
          <Ember streak={streak} size={14} />
          <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--gold-text)' }}>{streak}</div>
        </div>
      )}
    </div>
  )

  const name = (userId: string) => (userId === me.id ? 'You' : partner && userId === partner.id ? partner.name : partnerName)
  const encourage = () => {
    if (!data.cheer()) return flash(`${partnerName} hasn’t signed in yet`)
    flash(`Sent · ${partnerName} will see it`)
  }

  return (
    <main className="screen" style={{ background: 'var(--wash-together)' }}>
      <div className="pad top">
        <h1 className="title">Together</h1>
        <div style={{ fontSize: 13.5, color: 'var(--shared-text-2)', marginTop: 3, fontWeight: 700 }}>Progress only. Your routines and tasks stay yours.</div>
      </div>
      <div className="pad" style={{ paddingTop: 30, display: 'flex', gap: 20, justifyContent: 'center' }}>
        {person(me.role, 'You', mine)}
        {person(partnerRole, partnerName, theirs ? { done: theirs.done, total: theirs.total, unit: theirs.unit } : null, theirs?.streak)}
      </div>
      <div className="pad" style={{ paddingTop: 30, display: 'flex', gap: 10 }}>
        <button type="button" className="btn btn-ink" style={{ flex: 1, fontSize: 14 }} onClick={encourage}>Send encouragement</button>
        <button type="button" className="btn btn-chip" style={{ flex: 1, fontSize: 14 }} onClick={() => (partner ? setNudging(true) : flash(`${partnerName} hasn’t signed in yet`))}>Remind {partnerName}</button>
      </div>
      <div className="pad" style={{ paddingTop: 30 }}>
        <div className="label">Lately</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
          {data.activity.length === 0 && <div style={{ fontSize: 14, color: 'var(--muted-2)' }}>Nothing yet. Finished routines and plans show up here.</div>}
          {data.activity.slice(0, 8).map((a) => {
            const when = new Date(a.createdAt)
            const whenText = logicalToday(when) === today ? clock(when) : relativeDay(logicalToday(when), today)
            const role: Role = a.userId === me.id ? me.role : partnerRole
            return (
              <div key={a.id} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                <Avatar user={role} size={26} />
                <div>
                  <div style={{ fontSize: 14, lineHeight: 1.5 }}><span style={{ fontWeight: 800 }}>{name(a.userId)}</span> {a.text}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted-3)', marginTop: 2 }}>{whenText}{a.cheeredBy ? ` · ${name(a.cheeredBy)} cheered` : ''}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {nudging && <NudgeSheet onClose={() => setNudging(false)} />}
    </main>
  )
}

/** A reminder for the other person. It waits in their notifications until the time you pick. */
function NudgeSheet({ onClose }: { onClose: () => void }) {
  const send = useData((s) => s.sendNudge)
  const { partnerName, me } = useMe()
  const today = logicalToday()
  const [text, setText] = useState('')
  type When = 'now' | 'hour' | 'evening' | 'pick'
  const [when, setWhen] = useState<When>('now')
  const [picked, setPicked] = useState('18:00')
  const suggestions = me.role === 'leo' ? ['Don’t forget your 2pm', 'Drink some water', 'Call me when you’re free'] : ['Time for your workout', 'Evening routine?', 'Don’t forget to stretch']

  const at = () => {
    if (when === 'now') return undefined
    if (when === 'hour') return new Date(Date.now() + 3600000).toISOString()
    const t = when === 'evening' ? '18:00' : picked
    return new Date(dt(today, t)).toISOString()
  }
  const label = when === 'now' ? 'Now' : when === 'hour' ? `In an hour (${clock(new Date(Date.now() + 3600000))})` : when === 'evening' ? 'This evening, 18:00' : `Today at ${picked}`
  const options: When[] = ['now', 'hour', ...(nowMinutes() < 18 * 60 ? (['evening'] as const) : []), 'pick']

  return (
    <Sheet open onClose={onClose} label={`Remind ${partnerName}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" onClick={onClose} style={{ fontSize: 15, fontWeight: 600, color: 'var(--muted-2)' }}>Cancel</button>
        <div style={{ fontSize: 14, fontWeight: 800 }}>Remind {partnerName}</div>
        <button type="button" disabled={!text.trim()} style={{ fontSize: 15, fontWeight: 800, color: text.trim() ? 'var(--gold-text)' : 'var(--muted-4)' }}
          onClick={() => { if (send(text, at())) { flash(when === 'now' ? `Sent to ${partnerName}` : `${partnerName} gets it ${label.toLowerCase()}`); onClose() } }}>
          Send
        </button>
      </div>
      <input className="text-input display" autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="What should they remember?" aria-label="Reminder"
        style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.02em', marginTop: 22 }} />
      <div style={{ height: 1, background: 'var(--divider-confirm)', marginTop: 12 }} />
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 14 }}>
        {suggestions.map((s) => <button key={s} type="button" className="chip soft" onClick={() => setText(s)}>{s}</button>)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 12 }}>
        <Row last title="When" value={`${label} ›`} onClick={() => setWhen(options[(options.indexOf(when) + 1) % options.length])} />
        {when === 'pick' && <input type="time" aria-label="Time" value={picked} min={hhmm(nowMinutes())} onChange={(e) => e.target.value && setPicked(e.target.value)} className="inline-picker" style={{ alignSelf: 'flex-end', fontSize: 16 }} />}
      </div>
    </Sheet>
  )
}

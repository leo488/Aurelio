import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Row, Toggle } from '../components/controls'
import { Icon } from '../components/Icon'
import { Ori } from '../components/Ori'
import { flash } from '../components/Toast'
import { pronoun, useMe } from '../data/session'
import { useData } from '../data/store'
import type { RoutineIcon, RoutineItem } from '../data/types'
import { daysLabel, looseTime, WEEKDAY_LETTER } from '../lib/date'
import { parseItem } from '../lib/labels'
import { capitalize } from '../lib/words'

const ICONS: RoutineIcon[] = ['dumbbell', 'sun', 'moon', 'book']

export function NewRoutine() {
  const data = useData()
  const { me, partner, partnerName } = useMe()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState<RoutineIcon>('sun')
  const [days, setDays] = useState([0, 1, 2, 3, 4, 5, 6])
  const [time, setTime] = useState('07:00')
  const [remind, setRemind] = useState(true)
  const [share, setShare] = useState(false)
  const [items, setItems] = useState<RoutineItem[]>([])
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const addItem = () => {
    if (!draft.trim()) return setAdding(false)
    const p = parseItem(draft)
    setItems((xs) => [...xs, { id: Math.random().toString(36).slice(2, 10), ...p, days, countsTowardStreak: true }])
    setDraft('')
  }

  const save = () => {
    if (!name.trim()) return
    const n = capitalize(name.trim())
    data.addRoutine({
      owner: share ? 'both' : me, sharedWith: share ? partner : undefined, name: n, icon, time, days, remind,
      items: items.map((i) => ({ ...i, days: i.days.filter((d) => days.includes(d)) })),
    })
    navigate('/routines')
    flash(`${n} saved · ${daysLabel(days)} at ${looseTime(time)}`)
  }

  return (
    <main className="screen modal no-bar">
      <div className="pad top-12" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" onClick={() => navigate(-1)} style={{ fontSize: 15, fontWeight: 600, color: 'var(--muted-2)' }}>Cancel</button>
        <div style={{ fontSize: 14, fontWeight: 800 }}>New routine</div>
        <button type="button" onClick={save} disabled={!name.trim()} style={{ fontSize: 15, fontWeight: 800, color: name.trim() ? 'var(--gold-text)' : 'var(--muted-4)' }}>Save</button>
      </div>
      <div className="pad" style={{ paddingTop: 28 }}>
        <input className="text-input display" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Name it" aria-label="Routine name"
          style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-.03em' }} />
        <div style={{ height: 1, background: 'var(--divider-confirm)', marginTop: 14 }} />
      </div>
      <div className="pad" style={{ paddingTop: 22 }}>
        <div className="label" style={{ marginBottom: 12 }}>Icon</div>
        <div style={{ display: 'flex', gap: 10 }} role="radiogroup" aria-label="Icon">
          {ICONS.map((i) => (
            <button key={i} type="button" role="radio" aria-checked={icon === i} aria-label={i} onClick={() => setIcon(i)}
              style={{ width: 46, height: 46, borderRadius: 16, background: icon === i ? 'var(--ink)' : 'var(--chip-alt-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={i} size={21} color={icon === i ? '#C79A4A' : '#8E857B'} />
            </button>
          ))}
        </div>
      </div>
      <div className="pad" style={{ paddingTop: 24, display: 'flex', flexDirection: 'column' }}>
        <Row title="Repeats" value={`${daysLabel(days)} ›`} />
        <div style={{ display: 'flex', gap: 7, padding: '14px 0' }}>
          {WEEKDAY_LETTER.map((l, d) => {
            const on = days.includes(d)
            return (
              <button key={d} type="button" aria-pressed={on} onClick={() => setDays(on ? (days.length > 1 ? days.filter((x) => x !== d) : days) : [...days, d].sort())}
                style={{ flex: 1, textAlign: 'center', padding: '11px 0', borderRadius: 14, background: on ? 'var(--ink)' : 'var(--chip)', color: on ? 'var(--paper)' : 'var(--muted-2)', fontSize: 12.5, fontWeight: 700 }}>
                {l}
              </button>
            )
          })}
        </div>
        <Row title="Start time" right={
          <label className="row-value" style={{ position: 'relative' }}>
            {looseTime(time)} ›
            <input type="time" aria-label="Start time" value={time} onChange={(e) => e.target.value && setTime(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0 }} />
          </label>
        } />
        <Row title="Remind me" sub="10 minutes before" right={<Toggle label="Remind me" on={remind} onChange={setRemind} />} />
        <Row last title={`Share with ${partnerName}`} sub={`${capitalize(pronoun[partner].they)} can check items off too`} right={<Toggle label={`Share with ${partnerName}`} on={share} onChange={setShare} />} />
      </div>
      <div className="pad" style={{ paddingTop: 22, paddingBottom: 'calc(40px + var(--safe-bottom))' }}>
        <div className="label">Items</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 12 }}>
          {items.map((it) => (
            <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 18, background: '#fff' }}>
              <div style={{ color: 'var(--drag-handle)', fontSize: 14 }} aria-hidden="true">⠿</div>
              <div style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{it.name}</div>
              {it.durationMin && <div style={{ fontSize: 12.5, color: 'var(--muted-2)' }}>{it.durationMin} min</div>}
              <button type="button" aria-label={`Remove ${it.name}`} onClick={() => setItems((xs) => xs.filter((x) => x.id !== it.id))} style={{ color: 'var(--muted-4)', fontSize: 13 }}>✕</button>
            </div>
          ))}
          {adding ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 18, background: '#fff' }}>
              <input className="text-input" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Item, then minutes (Push day 40)" aria-label="New item"
                onKeyDown={(e) => e.key === 'Enter' && addItem()} onBlur={addItem} style={{ fontSize: 15, fontWeight: 700 }} />
            </div>
          ) : (
            <button type="button" onClick={() => setAdding(true)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 18, border: '1px dashed #D5CAB8', color: 'var(--muted-2)' }}>
              <span style={{ fontSize: 15 }}>+</span><span style={{ fontSize: 15, fontWeight: 700 }}>Add item</span>
            </button>
          )}
        </div>
        <button type="button" className="ori-card" style={{ marginTop: 20 }} onClick={() => navigate('/ori')}>
          <Ori size={26} />
          <div style={{ fontSize: 13.5, color: 'var(--chip-suggest-text)', lineHeight: 1.45 }}>Or describe the whole routine out loud.</div>
        </button>
      </div>
    </main>
  )
}

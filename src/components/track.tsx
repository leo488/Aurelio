import { useState } from 'react'
import { useData } from '../data/store'
import type { TrackItem, TrackSlot } from '../data/types'
import { addDays, mondayOf, WEEKDAY_LETTER, WEEKDAY_LONG } from '../lib/date'
import { checkId, checkedSet, dayScore, itemsForWeek, level, SLOTS } from '../lib/track'

/** A square shaded by how much of the day was done: a little, about half, most, all. */
export function HeatCell({ done, total, future, today, size, title }: { done: number; total: number; future?: boolean; today?: boolean; size?: number; title?: string }) {
  const lv = future ? 'f' : level(done, total)
  return <div className={`heat heat-${lv}${today ? ' now' : ''}`} style={size ? { width: size, height: size } : undefined} title={title} />
}

/** None · Some · Half · Most · All, under a heat map. */
export function HeatLegend() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--muted-2)', fontWeight: 700 }}>
      Less
      {[0, 1, 2, 3, 4].map((l) => <div key={l} className={`heat heat-${l}`} style={{ width: 11, height: 11, borderRadius: 3 }} />)}
      More
    </div>
  )
}

/** Slot name for a group of rows. */
const SlotLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.09em', color: 'var(--muted-3)', textTransform: 'uppercase', padding: '14px 0 4px' }}>{children}</div>
)

/**
 * The week as Leo kept it in his journal: every item down the side, Monday to Sunday across,
 * tap a square to tick that day. Future days wait. In edit mode rows can be renamed and removed.
 */
export function TrackGrid({ week, today, editing }: { week: string; today: string; editing: boolean }) {
  const data = useData()
  const monday = mondayOf(week)
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const list = itemsForWeek(data.trackItems, week)
  const checked = checkedSet(Object.values(data.trackChecks))
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null)

  const row = (item: TrackItem) => (
    <div key={item.id} className="track-row">
      {editing && renaming?.id === item.id ? (
        <input className="text-input" autoFocus value={renaming.title} aria-label="Item name" enterKeyHint="done"
          onChange={(e) => setRenaming({ id: item.id, title: e.target.value })}
          onBlur={() => { data.renameTrackItem(item.id, renaming.title); setRenaming(null) }}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          style={{ fontSize: 14, fontWeight: 700 }} />
      ) : (
        <button type="button" className="track-title" disabled={!editing} onClick={() => setRenaming({ id: item.id, title: item.title })}>{item.title}</button>
      )}
      {editing ? (
        <button type="button" onClick={() => data.removeTrackItem(item.id, week)} aria-label={`Remove ${item.title}`}
          style={{ gridColumn: 'span 7', justifySelf: 'end', fontSize: 13, fontWeight: 700, color: 'var(--clay)', padding: '6px 4px' }}>Remove</button>
      ) : days.map((d, i) => {
        const on = checked.has(checkId(item.id, d))
        const future = d > today
        return (
          <button key={d} type="button" disabled={future} onClick={() => data.toggleCheck(item.id, d)} aria-pressed={on}
            aria-label={`${item.title}, ${WEEKDAY_LONG[i]}${on ? ', done' : ''}`}
            className={`tick${on ? ' on' : ''}${d === today ? ' now' : ''}${future ? ' future' : ''}`}>
            {on && <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>}
          </button>
        )
      })}
    </div>
  )

  return (
    <div>
      <div className="track-row head" aria-hidden="true">
        <div />
        {days.map((d, i) => (
          <div key={d} style={{ textAlign: 'center', color: d === today ? 'var(--gold-text)' : 'var(--muted-3)' }}>
            <div style={{ fontSize: 10.5, fontWeight: 800 }}>{WEEKDAY_LETTER[i]}</div>
            <div style={{ fontSize: 11, fontWeight: 800, marginTop: 2, color: d === today ? 'var(--gold-text)' : d > today ? 'var(--muted-4)' : 'var(--muted-1)' }}>{Number(d.slice(8))}</div>
          </div>
        ))}
      </div>
      {SLOTS.map(([slot, label]) => {
        const rows = list.filter((i) => i.slot === slot)
        return rows.length ? <div key={slot}><SlotLabel>{label}</SlotLabel>{rows.map(row)}</div> : null
      })}
      {list.length === 0 && <div style={{ fontSize: 13.5, color: 'var(--muted-2)', padding: '16px 0' }}>Nothing on this week’s list.</div>}
      {!editing && list.length > 0 && (
        <div className="track-row foot">
          <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--muted-2)' }}>Each day</div>
          {days.map((d) => {
            const s = dayScore(data.trackItems, checked, d)
            return (
              <div key={d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <HeatCell done={s.done} total={s.total} future={d > today} today={d === today} size={22} />
                <div style={{ fontSize: 9.5, fontWeight: 800, color: 'var(--muted-3)', minHeight: 11 }}>{d > today ? '' : `${s.done}/${s.total}`}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Add a line to the list: morning, during the day or evening, every week or only this one. */
export function TrackAdd({ week }: { week: string }) {
  const add = useData((s) => s.addTrackItem)
  const [title, setTitle] = useState('')
  const [slot, setSlot] = useState<TrackSlot>('day')
  const [once, setOnce] = useState(false)
  const submit = () => {
    if (!title.trim()) return
    add(title, slot, week, once)
    setTitle('')
  }
  return (
    <div style={{ marginTop: 14 }}>
      <form className="add-field" onSubmit={(e) => { e.preventDefault(); submit() }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add to the list…" aria-label="New item" enterKeyHint="go" />
        <button type="submit" disabled={!title.trim()}>Add</button>
      </form>
      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {SLOTS.map(([k, label]) => (
          <button key={k} type="button" className={`chip${slot === k ? ' active' : ''}`} aria-pressed={slot === k} onClick={() => setSlot(k)}>{label}</button>
        ))}
        <button type="button" className={`chip${once ? ' active' : ''}`} aria-pressed={once} onClick={() => setOnce(!once)}>Only this week</button>
      </div>
    </div>
  )
}

/** Today's list, ticked from Today. Same ticks as the week grid. */
export function TodayList({ today, week }: { today: string; week: string }) {
  const data = useData()
  const list = itemsForWeek(data.trackItems, week)
  return (
    <>
      {SLOTS.map(([slot, label]) => {
        const rows = list.filter((i) => i.slot === slot)
        if (!rows.length) return null
        return (
          <div key={slot} style={{ marginBottom: 6 }}>
            <SlotLabel>{label}</SlotLabel>
            {rows.map((i) => {
              const on = !!data.trackChecks[checkId(i.id, today)]
              return (
                <button key={i.id} type="button" className="today-item" aria-pressed={on} onClick={() => data.toggleCheck(i.id, today)}>
                  <span className={`tick${on ? ' on' : ''}`} aria-hidden="true">
                    {on && <svg width="13" height="13" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>}
                  </span>
                  <span style={{ flex: 1, fontSize: 15.5, fontWeight: 600, color: on ? 'var(--muted-4)' : 'var(--ink)', textDecoration: on ? 'line-through' : 'none' }}>{i.title}</span>
                </button>
              )
            })}
          </div>
        )
      })}
    </>
  )
}

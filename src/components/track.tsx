import { useState } from 'react'
import { useData } from '../data/store'
import type { TrackItem, TrackSlot } from '../data/types'
import { WEEKDAY_LONG, WEEKDAY_SHORT, weekday } from '../lib/date'
import { checkId, level, SLOTS, weekList } from '../lib/track'
import { type DragItem, type DragState, type DropTarget, useDrag } from '../lib/useDrag'
import { Check } from './controls'

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
const SlotLabel = ({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 800, letterSpacing: '.09em', color: 'var(--muted-3)', textTransform: 'uppercase', padding: '18px 2px 8px' }}>
    <span>{children}</span>{right}
  </div>
)

/** A thin gold line where a dragged item would land. */
const Slot = ({ on, sm }: { on: boolean; sm?: boolean }) => <div className={`drop-slot${sm ? ' sm' : ''}${on ? ' on' : ''}`} aria-hidden="true" />

/** Monday to Sunday, each with how much of it got done. Tap one to see that day. */
export function DayStrip({ days, today, selected, onPick }: { days: { date: string; done: number; total: number; future: boolean }[]; today: string; selected: string; onPick: (d: string) => void }) {
  return (
    <div className="day-strip" role="tablist" aria-label="Days of the week">
      {days.map((d) => {
        const on = d.date === selected
        return (
          <button key={d.date} type="button" role="tab" aria-selected={on} onClick={() => onPick(d.date)}
            aria-label={`${WEEKDAY_LONG[weekday(d.date)]}${d.future ? '' : `, ${d.done} of ${d.total} done`}`}
            className={`day-cell${on ? ' on' : ''}${d.date === today ? ' now' : ''}${d.future ? ' future' : ''}`}>
            <span className="day-name">{WEEKDAY_SHORT[weekday(d.date)]}</span>
            <span className="day-num">{Number(d.date.slice(8))}</span>
            <span className={`day-bar heat-${d.future ? 'f' : level(d.done, d.total)}`} aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}

/** "+ Add" that opens into a field, under each part of the day. */
function AddInline({ label, onAdd, small }: { label: string; onAdd: (title: string) => void; small?: boolean }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  if (!open) {
    return (
      <button type="button" className={small ? 'add-inline sm' : 'add-inline'} onClick={() => setOpen(true)}>
        <span aria-hidden="true">+</span> {label}
      </button>
    )
  }
  const submit = () => {
    if (title.trim()) onAdd(title)
    setTitle('')
  }
  return (
    <form className="add-field" style={{ marginTop: small ? 4 : 6 }} onSubmit={(e) => { e.preventDefault(); submit() }}>
      <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${label}…`} aria-label={label} enterKeyHint="go"
        onBlur={() => { if (!title.trim()) setOpen(false) }} />
      <button type="submit" disabled={!title.trim()}>Add</button>
    </form>
  )
}

/**
 * One day of Leo's week: the list as cards under morning, during the day and evening, ticked for this day.
 * Hold a card to drag it up, down, to another part of the day, or onto another card to make it a sub to-do.
 * Tap a card's name to rename it, add sub to-dos, move it or take it off the list.
 */
export function WeekDay({ week, date, today }: { week: string; date: string; today: string }) {
  const data = useData()
  const [open, setOpen] = useState<string | null>(null)
  const { top, subs } = weekList(data.trackItems, week)
  const future = date > today

  const { drag, bind } = useDrag((item: DragItem, t: DropTarget) => {
    const slotOf = (id: string) => top.find((i) => i.id === id)?.slot ?? 'day'
    if (t.kind === 'goal-at') {
      const slot = t.list as TrackSlot
      if (!SLOTS.some(([k]) => k === slot)) return
      const index = item.kind === 'goal' && item.list === slot && t.index > item.index ? t.index - 1 : t.index
      data.moveTrackItem(item.id, { slot, index }, week)
      return
    }
    if (item.kind === 'goal' && t.kind === 'nest') {
      data.moveTrackItem(item.id, { slot: slotOf(t.goalId), parentId: t.goalId, index: t.index ?? Infinity }, week)
      return
    }
    if (item.kind === 'step' && t.kind === 'step-at') {
      const index = t.goalId === item.goalId && t.index > item.index ? t.index - 1 : t.index
      data.moveTrackItem(item.id, { slot: slotOf(t.goalId), parentId: t.goalId, index }, week)
    }
  }, 'track')

  return (
    <div data-drag-scope="track">
      {SLOTS.map(([slot, label]) => {
        const rows = top.filter((i) => i.slot === slot)
        const done = rows.filter((i) => data.trackChecks[checkId(i.id, date)]).length
        const at = (j: number) => drag?.target?.kind === 'goal-at' && drag.target.list === slot && drag.target.index === j
        return (
          <section key={slot}>
            <SlotLabel right={rows.length > 0 && !future && <span style={{ letterSpacing: 0, color: done === rows.length ? 'var(--gold-text)' : 'var(--muted-3)' }}>{done}/{rows.length}</span>}>{label}</SlotLabel>
            {rows.map((item, i) => (
              <div key={item.id}>
                <Slot on={at(i)} />
                <TrackCard item={item} subs={subs.get(item.id) ?? []} index={i} week={week} date={date} future={future}
                  open={open === item.id} onOpen={() => setOpen(open === item.id ? null : item.id)} drag={drag} bind={bind} />
              </div>
            ))}
            <div data-dz="end" data-list={slot} data-index={rows.length} style={{ paddingBottom: 2 }}>
              <Slot on={at(rows.length)} />
              <AddInline label={`Add to ${slot === 'day' ? 'the day' : label.toLowerCase()}`} onAdd={(t) => data.addTrackItem(t, slot, week)} />
            </div>
          </section>
        )
      })}
    </div>
  )
}

type Bind = ReturnType<typeof useDrag>['bind']

/** One item on the list as a card, with its sub to-dos inside. */
function TrackCard({ item, subs, index, week, date, future, open, onOpen, drag, bind }: {
  item: TrackItem; subs: TrackItem[]; index: number; week: string; date: string; future: boolean
  open: boolean; onOpen: () => void; drag: DragState | null; bind: Bind
}) {
  const data = useData()
  const [title, setTitle] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null)
  const on = (id: string) => !!data.trackChecks[checkId(id, date)]
  const subsDone = subs.filter((s) => on(s.id)).length
  const lifted = drag?.item.kind === 'goal' && drag.item.id === item.id
  const nestHere = drag?.target?.kind === 'nest' && drag.target.goalId === item.id && drag.target.index === undefined
  const stepHere = drag?.target?.kind === 'step-at' && drag.target.goalId === item.id && drag.target.index === subs.length && drag.item.kind === 'step' && drag.item.goalId !== item.id
  const slotAt = (j: number) => !!drag?.target && drag.target.kind !== 'goal-at' && 'goalId' in drag.target && drag.target.goalId === item.id && drag.target.index === j
  const saveTitle = () => {
    if (title !== null && title.trim() && title.trim() !== item.title) data.renameTrackItem(item.id, title)
    setTitle(null)
  }
  const tick = (id: string, name: string) => (
    <button type="button" disabled={future} onClick={() => data.toggleCheck(id, date)} aria-pressed={on(id)}
      aria-label={on(id) ? `Mark ${name} not done` : `Mark ${name} done`} style={{ lineHeight: 0, padding: 4, margin: -4, opacity: future ? 0.35 : 1 }}>
      <Check done={on(id)} style={id === item.id ? undefined : { width: 18, height: 18 }} />
    </button>
  )

  return (
    <div data-dz="goal" data-goal={item.id} data-list={item.slot} data-index={index} data-steps={subs.length} {...bind({ kind: 'goal', id: item.id, index, list: item.slot })}
      className={`card goal-card track-card${lifted ? ' lifted' : ''}${nestHere || stepHere ? ' nest' : ''}`}
      style={lifted ? { transform: `translate(${drag.dx}px, ${drag.dy}px) scale(1.02)` } : undefined}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 10px 12px 14px' }}>
        {tick(item.id, item.title)}
        {open ? (
          <input className="text-input" value={title ?? item.title} aria-label="Task name" onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} enterKeyHint="done"
            style={{ flex: 1, minWidth: 0, fontSize: 15.5, fontWeight: 700, padding: 0 }} />
        ) : (
          <button type="button" onClick={onOpen} style={{ flex: 1, minWidth: 0, textAlign: 'left', color: 'inherit' }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: on(item.id) ? 'var(--muted-4)' : 'var(--ink)', textDecoration: on(item.id) ? 'line-through' : 'none' }}>{item.title}</div>
            {subs.length > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-2)', marginTop: 3 }}>{subsDone}/{subs.length}</div>}
          </button>
        )}
        <button type="button" onClick={onOpen} aria-label={open ? `Close ${item.title}` : `Edit ${item.title}`} aria-expanded={open}
          style={{ fontSize: 16, lineHeight: 1, padding: '4px 6px', color: 'var(--muted-4)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>›</button>
      </div>

      {(subs.length > 0 || open) && (
        <div style={{ padding: '0 10px 10px 14px', marginTop: -6, display: 'flex', flexDirection: 'column' }}>
          {subs.map((s, j) => {
            const moving = drag?.item.kind === 'step' && drag.item.id === s.id
            return (
              <div key={s.id}>
                <Slot sm on={slotAt(j)} />
                <div data-dz="step" data-goal={item.id} data-index={j} {...bind({ kind: 'step', id: s.id, goalId: item.id, index: j })}
                  className={moving ? 'step-chip lifted' : 'step-chip'} style={moving ? { transform: `translate(${drag.dx}px, ${drag.dy}px)` } : undefined}>
                  {tick(s.id, s.title)}
                  {renaming?.id === s.id ? (
                    <input className="text-input" autoFocus value={renaming.title} aria-label="Sub to-do name" enterKeyHint="done"
                      onChange={(e) => setRenaming({ id: s.id, title: e.target.value })}
                      onBlur={() => { data.renameTrackItem(s.id, renaming.title); setRenaming(null) }}
                      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                      style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, padding: 0 }} />
                  ) : (
                    <button type="button" onClick={() => (open ? setRenaming({ id: s.id, title: s.title }) : onOpen())}
                      style={{ flex: 1, minWidth: 0, textAlign: 'left', fontSize: 14, fontWeight: 600, color: on(s.id) ? 'var(--muted-4)' : 'var(--ink)', textDecoration: on(s.id) ? 'line-through' : 'none' }}>
                      {s.title}
                    </button>
                  )}
                  {open && <button type="button" onClick={() => data.removeTrackItem(s.id, week)} aria-label={`Remove ${s.title}`} style={{ fontSize: 17, lineHeight: 1, color: 'var(--clay)', padding: '2px 6px' }}>×</button>}
                </div>
              </div>
            )
          })}
          <Slot sm on={slotAt(subs.length)} />

          {open && (
            <div style={{ animation: 'pop-in .18s ease' }}>
              <AddInline small label="Add a sub to-do" onAdd={(t) => data.addTrackItem(t, item.slot, week, false, item.id)} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                {SLOTS.map(([k, label]) => (
                  <button key={k} type="button" className={`chip${item.slot === k ? ' active' : ''}`} aria-pressed={item.slot === k}
                    onClick={() => item.slot !== k && data.moveTrackItem(item.id, { slot: k, index: Infinity }, week)}>{label}</button>
                ))}
                <button type="button" onClick={() => data.removeTrackItem(item.id, week)} style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: 'var(--clay)', padding: '6px 2px' }}>Remove</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** Today's list, ticked from Today. Same ticks as the week page, sub to-dos under their item. */
export function TodayList({ today, week }: { today: string; week: string }) {
  const data = useData()
  const { top, subs } = weekList(data.trackItems, week)
  const row = (i: TrackItem, sub?: boolean) => {
    const on = !!data.trackChecks[checkId(i.id, today)]
    return (
      <button key={i.id} type="button" className={sub ? 'today-item sub' : 'today-item'} aria-pressed={on} onClick={() => data.toggleCheck(i.id, today)}>
        <Check done={on} style={sub ? { width: 18, height: 18 } : undefined} />
        <span style={{ flex: 1, fontSize: sub ? 14 : 15.5, fontWeight: 600, color: on ? 'var(--muted-4)' : 'var(--ink)', textDecoration: on ? 'line-through' : 'none' }}>{i.title}</span>
      </button>
    )
  }
  return (
    <>
      {SLOTS.map(([slot, label]) => {
        const rows = top.filter((i) => i.slot === slot)
        if (!rows.length) return null
        return (
          <div key={slot} className="card" style={{ padding: '2px 14px', marginTop: 8 }}>
            <SlotLabel>{label}</SlotLabel>
            {rows.map((i) => (
              <div key={i.id}>
                {row(i)}
                {subs.get(i.id)?.map((s) => row(s, true))}
              </div>
            ))}
          </div>
        )
      })}
    </>
  )
}

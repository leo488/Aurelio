import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { longDay, PlusButton, TaskSheet, TaskTimeRow, WeekLetters } from '../components/ui'
import { tasksOn } from '../data/select'
import { useData } from '../data/store'
import { fromISO, logicalToday, monthDay, MONTHS, toISO, weekday } from '../lib/date'

/** Soniya's month: pick a day and its plan is right underneath to tick, open or add to. */
export function Calendar() {
  const data = useData()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState<string | null>(null)
  const today = logicalToday()
  const selected = params.get('d') ?? today
  const month = params.get('m') ?? selected.slice(0, 7)
  const first = fromISO(`${month}-01`)
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const lead = weekday(`${month}-01`)
  const touchX = useRef<number | null>(null)

  const go = (d: string, m = d.slice(0, 7)) => setParams({ d, m }, { replace: true })
  const shiftMonth = (n: number) => {
    const d = new Date(first.getFullYear(), first.getMonth() + n, 1)
    setParams({ d: selected, m: toISO(d).slice(0, 7) }, { replace: true })
  }
  const add = () => navigate(`/tasks/new?date=${selected}`)

  const items = tasksOn(data, selected)
  const done = items.filter((t) => t.completed).length

  return (
    <main className="screen" style={{ paddingBottom: 0 }}>
      <div className="pad top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="display" style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-.03em', margin: 0 }}>{MONTHS[first.getMonth()]}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)} className="month-arrow">‹</button>
            <div style={{ fontSize: 13, color: 'var(--muted-2)', fontWeight: 600 }}>{first.getFullYear()}</div>
            <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)} className="month-arrow">›</button>
          </div>
        </div>
        <PlusButton label="Add to this day" onClick={add} />
      </div>
      <div
        style={{ padding: '20px 18px 0' }}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          if (Math.abs(dx) > 60) shiftMonth(dx < 0 ? 1 : -1)
          touchX.current = null
        }}
      >
        <WeekLetters gap={0} size={10.5} marginBottom={6} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', justifyItems: 'center', rowGap: 2 }}>
          {Array.from({ length: lead }, (_, i) => <div key={`b${i}`} style={{ width: 42, height: 48 }} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const iso = `${month}-${String(i + 1).padStart(2, '0')}`
            const sel = iso === selected
            const isToday = iso === today
            const list = tasksOn(data, iso).slice(0, 3)
            return (
              <button key={iso} type="button" onClick={() => go(iso, month)} aria-pressed={sel} aria-label={monthDay(iso)}
                style={{
                  width: 42, height: 48, borderRadius: 14, padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 14,
                  transition: 'background .15s', background: sel ? 'var(--ink)' : 'transparent', color: sel ? 'var(--paper)' : iso < today ? 'var(--muted-4)' : 'var(--ink)',
                  fontWeight: sel || isToday ? 800 : 600, boxShadow: isToday && !sel ? 'inset 0 0 0 1.5px var(--gold)' : undefined,
                }}>
                <span style={{ lineHeight: 1 }}>{i + 1}</span>
                <span style={{ display: 'flex', gap: 2, height: 4 }}>
                  {list.map((t) => (
                    <span key={t.id} style={{ width: 4, height: 4, borderRadius: '50%', background: t.completed ? (sel ? 'var(--dark-muted-3)' : 'var(--olive-pale)') : t.priority === 'high' || t.deadline ? 'var(--clay)' : 'var(--gold)' }} />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <div style={{ marginTop: 18, background: 'var(--chip-alt-2)', borderRadius: '16px 16px 0 0', padding: '22px var(--pad-x) calc(130px + var(--safe-bottom))', minHeight: 300 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div className="display" style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-.022em' }}>{selected === today ? 'Today · ' : ''}{longDay(selected)}</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted-2)', fontWeight: 600, marginTop: 3 }}>
              {items.length ? `${items.length} ${items.length === 1 ? 'task' : 'tasks'} · ${done} done` : 'Nothing planned'}
            </div>
          </div>
          <button type="button" onClick={add} style={{ background: 'var(--white)', color: 'var(--ink)', fontSize: 12, fontWeight: 800, padding: '8px 12px', borderRadius: 99, whiteSpace: 'nowrap' }}>+ Add</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
          {items.map((t) => <TaskTimeRow key={t.id} task={t} onOpen={setOpen} divider="var(--divider-confirm)" />)}
          {items.length === 0 && (
            <div style={{ padding: '30px 0 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: 'var(--muted-2)' }}>Nothing planned for this day.</div>
              <button type="button" onClick={add} style={{ marginTop: 12, background: 'var(--ink)', color: 'var(--paper)', fontSize: 13, fontWeight: 800, padding: '11px 18px', borderRadius: 10 }}>Plan something</button>
            </div>
          )}
        </div>
      </div>
      <TaskSheet taskId={open} onClose={() => setOpen(null)} />
    </main>
  )
}

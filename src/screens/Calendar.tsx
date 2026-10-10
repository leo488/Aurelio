import { useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMe } from '../data/session'
import { eventsOn, myRoutines, tasksOn } from '../data/select'
import { useData } from '../data/store'
import { fromISO, logicalToday, monthDay, MONTHS, timeOf, toISO, weekday, WEEKDAY_LETTER } from '../lib/date'
import { logKey, outcome } from '../lib/streak'

export function Calendar() {
  const data = useData()
  const { me, partnerName } = useMe()
  const [params, setParams] = useSearchParams()
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

  const routines = myRoutines(data, me)
  const dots = (iso: string) => {
    const out: string[] = []
    if (iso < today && routines.some((r) => outcome(r, iso, data.logs[logKey(iso, r.id)]) === 'full')) out.push('#6E7F63')
    if (eventsOn(data, me, iso).length) out.push('#8A7E9B')
    if (tasksOn(data, me, iso).some((t) => t.isDeadline && !t.done)) out.push('#B4674A')
    return out
  }

  const items = [
    ...eventsOn(data, me, selected).map((e) => ({
      key: e.id, color: e.shared ? '#C79A4A' : '#8A7E9B', title: e.shared ? `${e.title} with ${partnerName}` : e.title,
      meta: e.shared ? `${timeOf(e.start)} · shared` : `${timeOf(e.start)} – ${timeOf(e.end)}`, sort: e.start,
    })),
    ...tasksOn(data, me, selected).map((t) => ({
      key: t.id, color: t.isDeadline ? '#B4674A' : '#C79A4A', title: t.title,
      meta: [timeOf(t.due) ?? 'Any time', t.durationMin ? `${t.durationMin >= 60 ? `${t.durationMin / 60}h` : `${t.durationMin} min`}` : ''].filter(Boolean).join(' · '),
      sort: t.due ?? '', done: t.done,
    })),
  ].sort((a, b) => a.sort.localeCompare(b.sort))

  return (
    <main className="screen" style={{ paddingBottom: 0 }}>
      <div className="pad top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="title">{MONTHS[first.getMonth()]}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
            <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)} className="month-arrow">‹</button>
            <div style={{ fontSize: 13, color: 'var(--muted-2)', fontWeight: 600 }}>{first.getFullYear()}</div>
            <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)} className="month-arrow">›</button>
          </div>
        </div>
        <Link to="/tasks" className="chip" style={{ background: 'var(--chip)', color: 'var(--chip-suggest-text)', fontWeight: 800, padding: '9px 14px' }}>Tasks</Link>
      </div>
      <div
        style={{ padding: '22px 22px 0' }}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          if (Math.abs(dx) > 60) shiftMonth(dx < 0 ? 1 : -1)
          touchX.current = null
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', fontSize: 10.5, color: 'var(--muted-3)', fontWeight: 800, textAlign: 'center', marginBottom: 10 }}>
          {WEEKDAY_LETTER.map((l, i) => <div key={i}>{l}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', justifyItems: 'center', rowGap: 4 }}>
          {Array.from({ length: lead }, (_, i) => <div key={`b${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const iso = `${month}-${String(i + 1).padStart(2, '0')}`
            const sel = iso === selected
            const ds = dots(iso)
            return (
              <button key={iso} type="button" onClick={() => go(iso, month)} aria-pressed={sel} aria-label={monthDay(iso)}
                style={{ position: 'relative', width: 34, height: 34, borderRadius: 12, background: sel ? 'var(--ink)' : 'transparent', color: sel ? 'var(--paper)' : iso < today ? 'var(--muted-4)' : 'var(--ink)', fontSize: 14, fontWeight: sel ? 800 : 600, textAlign: 'center', outline: iso === today && !sel ? '1.5px solid var(--sand)' : undefined }}>
                {i + 1}
                {ds.length > 0 && (
                  <span style={{ position: 'absolute', left: 0, right: 0, bottom: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
                    {ds.map((c) => <span key={c} style={{ width: 4, height: 4, borderRadius: '50%', background: sel ? 'var(--paper)' : c }} />)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
      <div className="pad" style={{ paddingTop: 20, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {[['#6E7F63', 'Routine done'], ['#8A7E9B', 'Event'], ['#B4674A', 'Deadline']].map(([c, l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--muted-2)', fontWeight: 600 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />{l}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 22, background: 'var(--chip-alt-2)', borderRadius: '28px 28px 0 0', padding: '20px 26px calc(130px + var(--safe-bottom))', minHeight: 230 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div className="display" style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-.022em' }}>{monthDay(selected)}</div>
          <Link to={`/calendar/${selected}`} style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--gold-text)' }}>Open day</Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 10 }}>
          {items.length === 0 && <div style={{ padding: '14px 0', fontSize: 14, color: 'var(--muted-2)' }}>Nothing planned yet.</div>}
          {items.map((it, i) => (
            <div key={it.key} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px 0', borderBottom: i < items.length - 1 ? '1px solid var(--divider-confirm)' : undefined, opacity: 'done' in it && it.done ? 0.55 : 1 }}>
              <div style={{ width: 3, height: 28, borderRadius: 2, background: it.color }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, textDecoration: 'done' in it && it.done ? 'line-through' : undefined }}>{it.title}</div>
                <div className="meta">{it.meta}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

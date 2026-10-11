import { useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check } from '../components/controls'
import { QuickAdd } from '../components/tasks'
import { tasksOn, timeRange } from '../data/select'
import { useData } from '../data/store'
import { fromISO, logicalToday, monthDay, MONTHS, toISO, weekday, WEEKDAY_LETTER, WEEKDAY_LONG } from '../lib/date'

/** Sonia's planner: pick a day and its tasks are right there to tick, edit or add to. */
export function Calendar() {
  const data = useData()
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

  const dots = (iso: string) => {
    const list = tasksOn(data, iso)
    if (!list.length) return []
    const out: string[] = []
    if (list.every((t) => t.completed)) out.push('#6E7F63')
    else out.push('#8A7E9B')
    if (list.some((t) => t.deadline && !t.completed)) out.push('#B4674A')
    return out
  }

  const items = tasksOn(data, selected)
  const left = items.filter((t) => !t.completed).length

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
        {selected !== today && (
          <button type="button" className="chip" style={{ background: 'var(--chip)', color: 'var(--chip-suggest-text)', fontWeight: 800, padding: '9px 14px' }} onClick={() => go(today)}>Today</button>
        )}
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
        {[['#8A7E9B', 'Planned'], ['#6E7F63', 'All done'], ['#B4674A', 'Deadline']].map(([c, l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--muted-2)', fontWeight: 600 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />{l}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 22, background: 'var(--chip-alt-2)', borderRadius: '28px 28px 0 0', padding: '20px 26px calc(130px + var(--safe-bottom))', minHeight: 230 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div className="display" style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-.022em' }}>{WEEKDAY_LONG[weekday(selected)]}, {monthDay(selected)}</div>
            <div className="meta">{items.length === 0 ? 'Nothing planned' : `${items.length} task${items.length === 1 ? '' : 's'} · ${left} left`}</div>
          </div>
          <Link to={`/calendar/${selected}`} style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--gold-text)' }}>Timeline</Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 10 }}>
          {items.map((t, i) => (
            <div key={t.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '13px 0', borderBottom: i < items.length - 1 ? '1px solid var(--divider-confirm)' : undefined, opacity: t.completed ? 0.55 : 1 }}>
              <div style={{ width: 44, fontSize: 12, fontWeight: 800, color: 'var(--muted-3)', flex: '0 0 auto' }}>{t.startTime ?? 'Any'}</div>
              <button type="button" aria-label={`${t.completed ? 'Mark not done' : 'Complete'}: ${t.title}`} aria-pressed={t.completed} onClick={() => data.toggleTask(t.id)} style={{ lineHeight: 0 }}>
                <Check done={t.completed} />
              </button>
              <Link to={`/tasks/${t.id}`} style={{ flex: 1, color: 'inherit' }}>
                <div style={{ fontSize: 15, fontWeight: 700, textDecoration: t.completed ? 'line-through' : undefined }}>{t.title}</div>
                {(t.endTime || t.deadline || t.notes) && <div className="meta">{[t.endTime ? timeRange(t) : '', t.deadline ? 'Deadline' : '', t.notes ?? ''].filter(Boolean).join(' · ')}</div>}
              </Link>
              <div style={{ width: 3, height: 28, borderRadius: 2, background: t.deadline ? '#B4674A' : t.priority === 'high' ? '#C79A4A' : 'transparent' }} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}><QuickAdd date={selected} /></div>
      </div>
    </main>
  )
}

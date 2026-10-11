import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ProgressRing } from '../components/controls'
import { completionFor, nowRoutine } from '../data/select'
import { useData } from '../data/store'
import { clock, logicalToday } from '../lib/date'
import { stepLabel } from '../lib/labels'
import { stepsOn } from '../lib/streak'

/** Focus mode: one item at a time. Mark done, skip, or push to later. */
export function Runner() {
  const data = useData()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const today = logicalToday()
  const r = data.routines.find((x) => x.id === params.get('r')) ?? nowRoutine(data)?.routine
  const items = r ? stepsOn(r, today) : []
  const log = r ? completionFor(data, r, today) : undefined
  const isDone = (id: string) => !!log?.completedStepIds.includes(id)
  const [idx, setIdx] = useState(() => Math.max(0, items.findIndex((i) => !isDone(i.id))))
  const [time, setTime] = useState(clock())

  useEffect(() => {
    if (r) data.markRunStart(r.id)
    const t = setInterval(() => setTime(clock()), 15000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r?.id])

  if (!r || items.length === 0) return <Navigate to="/today" replace />

  const doneCount = items.filter((i) => isDone(i.id)).length
  const pct = Math.round((doneCount / items.length) * 100)
  const current = items[idx] ?? items[0]
  const next = items.slice(idx + 1).find((i) => !isDone(i.id))

  const advance = (markDone: boolean) => {
    let doneNow = new Set(log?.completedStepIds ?? [])
    if (markDone && !isDone(current.id)) {
      data.toggleStep(r.id, current.id)
      doneNow = new Set([...doneNow, current.id])
    }
    const n = items.findIndex((it, i) => i > idx && !doneNow.has(it.id))
    if (n === -1) navigate(`/run/done?r=${r.id}`, { replace: true })
    else setIdx(n)
  }

  return (
    <main className="screen dark no-bar" style={{ background: 'var(--dark-runner)' }}>
      <div className="pad top-14" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" aria-label="Close" onClick={() => navigate('/today')} style={{ color: 'var(--glyph-close)', fontSize: 16 }}>✕</button>
        <div style={{ fontSize: 13, color: 'var(--glyph-close)', fontWeight: 700 }}>{r.name} · {time}</div>
        <button type="button" aria-label="Routine details" onClick={() => navigate(`/routines/${r.id}`)} style={{ color: 'var(--glyph-close)', fontSize: 16 }}>⋯</button>
      </div>
      <div style={{ padding: '56px 34px 0', textAlign: 'center' }}>
        <div style={{ width: 172, margin: '0 auto' }}>
          <ProgressRing pct={pct} size={172} inset={9} track="var(--dark-pending)">
            <div className="display" style={{ fontSize: 46, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1 }}>
              {doneCount}<span style={{ fontSize: 24, color: 'var(--dark-muted-3)' }}>/{items.length}</span>
            </div>
            <div className="label" style={{ color: 'var(--dark-muted-3)', marginTop: 6 }}>Done</div>
          </ProgressRing>
        </div>
        <div className="display" style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-.03em', marginTop: 36 }} aria-live="polite">{stepLabel(current)}</div>
        <div style={{ fontSize: 14.5, color: 'var(--muted-back)', marginTop: 9 }}>{next ? `Next: ${stepLabel(next)}` : 'Last one'}</div>
      </div>
      <div className="pad dark-bottom" style={{ marginTop: 'auto', paddingTop: 30, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 7, justifyContent: 'center', marginBottom: 14 }}>
          {items.map((it, i) => (
            <div key={it.id} style={{ width: 34, height: 4, borderRadius: 2, background: isDone(it.id) ? 'var(--olive)' : i === idx ? 'var(--gold)' : 'var(--dark-pending)' }} />
          ))}
        </div>
        <button type="button" onClick={() => advance(true)} style={{ padding: 19, borderRadius: 22, background: 'var(--gold)', color: 'var(--on-gold)', fontSize: 16, fontWeight: 800, textAlign: 'center' }}>Mark done</button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn-dark-outline" onClick={() => advance(false)}>Skip</button>
          <button type="button" className="btn-dark-outline" onClick={() => advance(false)}>Later today</button>
        </div>
      </div>
    </main>
  )
}

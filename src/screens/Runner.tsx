import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { flash } from '../components/Toast'
import { Ring } from '../components/ui'
import { completionFor, nowRoutine } from '../data/select'
import { useData } from '../data/store'
import { logicalToday } from '../lib/date'
import { stepsOn } from '../lib/streak'

/** Focus mode: one step at a time. Mark done, skip it for today, or push the routine to later. */
export function Runner() {
  const data = useData()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const today = logicalToday()
  const r = data.routines.find((x) => x.id === params.get('r')) ?? nowRoutine(data)?.routine
  const items = r ? stepsOn(r, today) : []
  const log = r ? completionFor(data, r, today) : undefined
  const isDone = (id: string) => !!log?.completedStepIds.includes(id)
  const isSkipped = (id: string) => !!log?.skippedStepIds?.includes(id)
  const [idx, setIdx] = useState(() => Math.max(0, items.findIndex((i) => !isDone(i.id) && !isSkipped(i.id))))

  useEffect(() => {
    if (r) data.markRunStart(r.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r?.id])

  if (!r || items.length === 0) return <Navigate to="/today" replace />

  const doneCount = items.filter((i) => isDone(i.id)).length
  const current = items[idx] ?? items[0]
  const next = items.find((it, i) => i > idx && !isDone(it.id) && !isSkipped(it.id))

  const advance = (markDone: boolean) => {
    const settled = new Set([...(log?.completedStepIds ?? []), ...(log?.skippedStepIds ?? []), current.id])
    if (markDone) {
      if (!isDone(current.id)) data.toggleStep(r.id, current.id)
    } else data.skipStepToday(r.id, current.id)
    const n = items.findIndex((it, i) => i > idx && !settled.has(it.id))
    if (n === -1) navigate(`/run/done?r=${r.id}`, { replace: true })
    else setIdx(n)
  }

  return (
    <main className="screen dark no-bar" style={{ background: 'var(--dark-runner)' }}>
      <div className="pad top-14" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" aria-label="Close" onClick={() => navigate(`/routines/${r.id}`)} style={{ color: 'var(--glyph-close)', fontSize: 16 }}>✕</button>
        <div style={{ fontSize: 13, color: 'var(--glyph-close)', fontWeight: 700 }}>{r.name}</div>
        <div style={{ width: 16 }} />
      </div>
      <div style={{ padding: '50px 34px 0', textAlign: 'center' }}>
        <div style={{ width: 172, margin: '0 auto' }}>
          <Ring pct={items.length ? (doneCount / items.length) * 100 : 0} size={172} r={80} width={7} glow={false}>
            <div className="display" style={{ fontSize: 46, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1 }}>
              {doneCount}<span style={{ fontSize: 24, color: 'var(--dark-muted-3)' }}>/{items.length}</span>
            </div>
            <div className="label" style={{ color: 'var(--dark-muted-3)', marginTop: 6 }}>Done</div>
          </Ring>
        </div>
        <div className="display" style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-.03em', marginTop: 36, lineHeight: 1.15 }} aria-live="polite">{current.title}</div>
        {!!current.duration && <div style={{ fontSize: 14, color: 'var(--gold)', fontWeight: 700, marginTop: 8 }}>{current.duration} min</div>}
        <div style={{ fontSize: 14, color: 'var(--muted-back)', marginTop: 6 }}>{next ? `Next: ${next.title}` : 'Last step'}</div>
      </div>
      <div className="pad dark-bottom" style={{ marginTop: 'auto', paddingTop: 30, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 7, justifyContent: 'center', marginBottom: 14 }}>
          {items.map((it, i) => (
            <div key={it.id} style={{ flex: 1, maxWidth: 40, height: 4, borderRadius: 2, transition: 'background .3s', background: isDone(it.id) ? 'var(--olive)' : i === idx ? 'var(--gold)' : 'var(--dark-pending)' }} />
          ))}
        </div>
        <button type="button" onClick={() => advance(true)} style={{ padding: 19, borderRadius: 22, background: 'var(--gold)', color: 'var(--on-gold)', fontSize: 16, fontWeight: 800, textAlign: 'center' }}>Mark done</button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn-dark-outline" onClick={() => advance(false)}>Skip step</button>
          <button type="button" className="btn-dark-outline" onClick={() => { navigate('/today'); flash(`${r.name} moved to later today`) }}>Later today</button>
        </div>
      </div>
    </main>
  )
}

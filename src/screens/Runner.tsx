import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ProgressRing } from '../components/controls'
import { pronoun, useMe } from '../data/session'
import { logOf, nowRoutine } from '../data/select'
import { useData } from '../data/store'
import { clock, logicalToday } from '../lib/date'
import { itemLabel } from '../lib/labels'
import { itemsOn } from '../lib/streak'

/** Focus mode: one item at a time. Mark done, skip, or push to later. */
export function Runner() {
  const data = useData()
  const { me } = useMe()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const today = logicalToday()
  const r = data.routines.find((x) => x.id === params.get('r')) ?? nowRoutine(data, me)?.routine
  const items = r ? itemsOn(r, today) : []
  const log = r ? logOf(data, r) : undefined
  const isDone = (id: string) => !!log?.doneItemIds.includes(id)
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
    let doneNow = new Set(log?.doneItemIds ?? [])
    if (markDone && !isDone(current.id)) {
      const res = data.toggleItem(r.id, current.id)
      doneNow = new Set([...doneNow, current.id])
      if (res.completedRoutine) {
        data.addActivity({ who: me, kind: 'routine-done', text: `finished ${pronoun[me].their} ${r.name.toLowerCase()}`, routineId: r.id })
      }
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
          <ProgressRing pct={pct} size={172} inset={9} track="#2E2A24" hole="#17150F">
            <div className="display" style={{ fontSize: 46, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1 }}>
              {doneCount}<span style={{ fontSize: 24, color: '#79706A' }}>/{items.length}</span>
            </div>
            <div className="label" style={{ color: '#79706A', marginTop: 6 }}>Done</div>
          </ProgressRing>
        </div>
        <div className="display" style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-.03em', marginTop: 36 }} aria-live="polite">{itemLabel(current)}</div>
        <div style={{ fontSize: 14.5, color: 'var(--muted-back)', marginTop: 9 }}>{next ? `Next: ${itemLabel(next)}` : 'Last one'}</div>
      </div>
      <div className="pad dark-bottom" style={{ marginTop: 'auto', paddingTop: 30, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 7, justifyContent: 'center', marginBottom: 14 }}>
          {items.map((it, i) => (
            <div key={it.id} style={{ width: 34, height: 4, borderRadius: 2, background: isDone(it.id) ? '#6E7F63' : i === idx ? '#C79A4A' : '#2E2A24' }} />
          ))}
        </div>
        <button type="button" onClick={() => advance(true)} style={{ padding: 19, borderRadius: 22, background: 'var(--gold)', color: '#231A08', fontSize: 16, fontWeight: 800, textAlign: 'center' }}>Mark done</button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn-dark-outline" onClick={() => advance(false)}>Skip</button>
          <button type="button" className="btn-dark-outline" onClick={() => advance(false)}>Later today</button>
        </div>
      </div>
    </main>
  )
}

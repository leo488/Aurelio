import { useNavigate } from 'react-router-dom'
import { flash } from '../components/Toast'
import { useMe } from '../data/session'
import { myRoutines } from '../data/select'
import { laterStart, useData } from '../data/store'
import { addDays, eyebrowDate, logicalToday, looseTime } from '../lib/date'
import { greeting } from '../lib/greeting'
import { itemLabel } from '../lib/labels'
import { itemsOn, logKey } from '../lib/streak'
import { numberWord, numberWordLower } from '../lib/words'

/** After a streak breaks: kind words, a back-fill, and a suggestion to lighten the routine. */
export function Missed() {
  const data = useData()
  const { me, name } = useMe()
  const navigate = useNavigate()
  const today = logicalToday()
  const mine = myRoutines(data, me).filter((r) => r.owner === me && !r.paused)
  const broken = mine
    .filter((r) => r.streak.lastBreak && !r.streak.lastBreak.backfilled && r.streak.lastBreak.date >= addDays(today, -2))
    .sort((a, b) => b.streak.lastBreak!.date.localeCompare(a.streak.lastBreak!.date))[0]
  // Without a fresh break this screen is a preview of what one would look like.
  const r = broken ?? mine[0]
  if (!r) return null
  const b = broken?.streak.lastBreak ?? { value: r.streak.current, done: 1, total: r.items.length, date: addDays(today, -1) }

  // The item missed most often in the last month is the one to suggest dropping.
  const misses = new Map<string, number>()
  for (let i = 1; i <= 30; i++) {
    const d = addDays(today, -i)
    const log = data.logs[logKey(d, r.id)]
    if (!log || log.skipped) continue
    for (const it of itemsOn(r, d)) if (!log.doneItemIds.includes(it.id)) misses.set(it.id, (misses.get(it.id) ?? 0) + 1)
  }
  const worst = [...r.items].sort((a, c) => (misses.get(c.id) ?? 0) - (misses.get(a.id) ?? 0))[r.items.length > 1 ? 0 : -1]
  const newTime = laterStart(r.time)

  const backfill = () => {
    if (!broken) return flash('Nothing to back-fill right now')
    const n = data.backfill(r.id)
    if (n === null) return flash('Back-fill works once a week')
    navigate('/today')
    flash(`Yesterday back-filled · streak restored to ${n}`)
  }

  return (
    <main className="screen" style={{ background: 'var(--wash-missed)' }}>
      <div className="pad top">
        <div className="eyebrow">{eyebrowDate(today)}</div>
        <h1 className="title-30" style={{ marginTop: 4 }}>{greeting()}, {name}</h1>
      </div>
      <div className="pad" style={{ paddingTop: 24 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--clay)', letterSpacing: '.06em' }}>STREAK ENDED AT {b.value}</div>
        <div className="display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.028em', lineHeight: 1.25, marginTop: 10 }}>
          {b.date === addDays(today, -1) ? 'Yesterday' : 'That day'} came apart. It happens.
        </div>
        <div style={{ fontSize: 14, color: 'var(--chip-text)', lineHeight: 1.65, marginTop: 10 }}>
          {numberWord(b.done)} of {numberWordLower(b.total)} items got done. Your {Math.max(r.streak.longest, b.value)}-day record still stands, and today is day one of the next run.
        </div>
        <div style={{ display: 'flex', gap: 9, marginTop: 20 }}>
          <button type="button" className="btn btn-ink" style={{ flex: 1, borderRadius: 16 }} onClick={() => navigate('/today')}>Start today</button>
          <button type="button" className="btn btn-chip" style={{ flex: 1, borderRadius: 16 }} onClick={backfill}>Back-fill it</button>
        </div>
      </div>
      <div className="pad" style={{ paddingTop: 28 }}>
        <div className="label">Maybe it was too much</div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
          {worst && (
            <button type="button" className="setting-row" onClick={() => { data.deleteItem(r.id, worst.id); navigate(`/routines/${r.id}`); flash(`${r.name} is lighter now`) }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, textAlign: 'left' }}>Drop “{itemLabel(worst)}” from {r.name}</div>
              <div style={{ fontSize: 13, color: 'var(--gold-text)', fontWeight: 800 }}>Do it</div>
            </button>
          )}
          <button type="button" className="setting-row last" onClick={() => { data.updateRoutine(r.id, { time: newTime }); navigate(`/routines/${r.id}`); flash(`${r.name} now starts at ${looseTime(newTime)}`) }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, textAlign: 'left' }}>Move start to {looseTime(newTime)}</div>
            <div style={{ fontSize: 13, color: 'var(--gold-text)', fontWeight: 800 }}>Do it</div>
          </button>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted-2)', lineHeight: 1.6, marginTop: 14 }}>
          Suggested because those two are missed most often. Ori only offers this after a break, never during a run.
        </div>
      </div>
    </main>
  )
}

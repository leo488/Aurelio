import { useNavigate } from 'react-router-dom'
import { flash } from '../components/Toast'
import { useMe } from '../data/session'
import { routineTime } from '../data/select'
import { laterStart, useData } from '../data/store'
import { addDays, eyebrowDate, logicalToday, looseTime } from '../lib/date'
import { greeting } from '../lib/greeting'
import { stepLabel } from '../lib/labels'
import { completionOf, routineStreak, stepsOn } from '../lib/streak'
import { numberWord, numberWordLower } from '../lib/words'

/** After a streak breaks: kind words, a back-fill, and a suggestion to lighten the routine. */
export function Missed() {
  const data = useData()
  const { name } = useMe()
  const navigate = useNavigate()
  const today = logicalToday()
  const mine = data.routines.filter((r) => r.active).map((r) => ({ r, st: routineStreak(r, data.completions, today) }))
  const broken = mine
    .filter((x) => x.st.lastBreak && x.st.lastBreak.date >= addDays(today, -2) && !completionOf(data.completions, x.r.id, x.st.lastBreak.date)?.backfilled)
    .sort((a, b) => b.st.lastBreak!.date.localeCompare(a.st.lastBreak!.date))[0]
  // Without a fresh break this screen is a preview of what one would look like.
  const pick = broken ?? mine[0]
  if (!pick) return null
  const { r, st } = pick
  const b = broken?.st.lastBreak ?? { value: st.current, done: 1, total: r.steps.length, date: addDays(today, -1) }

  // The step missed most often in the last month is the one to suggest dropping.
  const misses = new Map<string, number>()
  for (let i = 1; i <= 30; i++) {
    const d = addDays(today, -i)
    const c = completionOf(data.completions, r.id, d)
    if (c?.skipped) continue
    for (const s of stepsOn(r, d)) if (!c?.completedStepIds.includes(s.id)) misses.set(s.id, (misses.get(s.id) ?? 0) + 1)
  }
  const worst = r.steps.length > 1 ? [...r.steps].sort((a, c) => (misses.get(c.id) ?? 0) - (misses.get(a.id) ?? 0))[0] : undefined
  const newTime = laterStart(routineTime(r))

  const backfill = () => {
    if (!broken) return flash('Nothing to back-fill right now')
    const n = data.backfill(r.id)
    if (n === null) return flash('Back-fill works once a week')
    navigate('/today')
    flash(`Back-filled · streak restored to ${n}`)
  }

  return (
    <main className="screen" style={{ background: 'var(--wash-missed)' }}>
      <div className="pad top">
        <div className="eyebrow">{eyebrowDate(today)}</div>
        <h1 className="title-30" style={{ marginTop: 4 }}>{greeting()}, {name}</h1>
      </div>
      <div className="pad" style={{ paddingTop: 24 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--clay)', letterSpacing: '.06em' }}>{r.name.toUpperCase()} · STREAK ENDED AT {b.value}</div>
        <div className="display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.028em', lineHeight: 1.25, marginTop: 10 }}>
          {b.date === addDays(today, -1) ? 'Yesterday' : 'That day'} came apart. It happens.
        </div>
        <div style={{ fontSize: 14, color: 'var(--chip-text)', lineHeight: 1.65, marginTop: 10 }}>
          {numberWord(b.done)} of {numberWordLower(b.total)} steps got done. Your {Math.max(st.longest, b.value)}-day record still stands, and today is day one of the next run.
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
            <button type="button" className="setting-row" onClick={() => { data.deleteStep(r.id, worst.id); navigate(`/routines/${r.id}`); flash(`${r.name} is lighter now`) }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, textAlign: 'left' }}>Drop “{stepLabel(worst)}” from {r.name}</div>
              <div style={{ fontSize: 13, color: 'var(--gold-text)', fontWeight: 800 }}>Do it</div>
            </button>
          )}
          <button type="button" className="setting-row last" onClick={() => { data.updateRoutine(r.id, { scheduledTime: newTime }); navigate(`/routines/${r.id}`); flash(`${r.name} now starts at ${looseTime(newTime)}`) }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, textAlign: 'left' }}>Move start to {looseTime(newTime)}</div>
            <div style={{ fontSize: 13, color: 'var(--gold-text)', fontWeight: 800 }}>Do it</div>
          </button>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted-2)', lineHeight: 1.6, marginTop: 14 }}>
          Suggested because that step is missed most often. Ori only offers this after a break, never during a run.
        </div>
      </div>
    </main>
  )
}

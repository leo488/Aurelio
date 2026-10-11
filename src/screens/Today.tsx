import { Fragment } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { Check, ProgressRing } from '../components/controls'
import { Ember } from '../components/Ember'
import { Icon, ROUTINE_TINT } from '../components/Icon'
import { InstallHint } from '../components/InstallHint'
import { flash } from '../components/Toast'
import { useMe } from '../data/session'
import { completionFor, dayProgress, nowRoutine, routineTime } from '../data/select'
import { useData } from '../data/store'
import { eyebrowDate, logicalToday, looseTime, minutesOf, nowMinutes } from '../lib/date'
import { greeting } from '../lib/greeting'
import { stepLabel } from '../lib/labels'
import { dayStreak, MILESTONES, progress, stepsOn } from '../lib/streak'
import { useCountUp } from '../lib/useCountUp'
import { numberWord } from '../lib/words'

/** Leo's home: how many routines are done today, the streak, and the routine to do now. */
export function Today() {
  const data = useData()
  const { me, name } = useMe()
  const navigate = useNavigate()
  const today = logicalToday()
  const now = new Date()

  const day = dayProgress(data, today)
  const streak = dayStreak(data.routines, data.completions, today)
  // The ring fills with partial progress too: two routines done and one half-way is 2.5 of N.
  const fraction = day.total ? day.list.reduce((n, r) => {
    const p = progress(r, today, completionFor(data, r, today))
    return n + (completionFor(data, r, today)?.skipped ? 1 : p.total ? p.done / p.total : 0)
  }, 0) / day.total : 0
  const ring = useCountUp(Math.round(fraction * 100))
  const doneShown = Math.round(useCountUp(day.done))
  const streakShown = Math.round(useCountUp(streak.current))

  if (data.routines.length === 0) return <Navigate to="/welcome" replace />

  const focus = nowRoutine(data, now)
  const toggle = (routineId: string, stepId: string) => {
    const r = data.routines.find((x) => x.id === routineId)!
    const res = data.toggleStep(routineId, stepId)
    if (res.completedRoutine) {
      const milestone = MILESTONES.includes(res.streak)
      flash(`${r.name} complete · streak now ${res.streak}`, milestone ? { label: 'See it', run: () => navigate(`/milestone?r=${routineId}`) } : undefined)
    }
  }

  const mins = nowMinutes(now)
  const later = day.list.filter((r) => {
    if (r.id === focus?.routine.id) return false
    const c = completionFor(data, r, today)
    const p = progress(r, today, c)
    return p.done < p.total && !c?.skipped && minutesOf(routineTime(r)) >= mins - 60
  })
  const doneToday = day.list.filter((r) => r.id !== focus?.routine.id && !later.includes(r))

  const r = focus?.routine
  const c = r ? completionFor(data, r, today) : undefined
  const steps = r ? stepsOn(r, today) : []
  const p = r ? progress(r, today, c) : { done: 0, total: 0 }
  const left = day.total - day.done
  const subline = day.total === 0 ? 'Nothing scheduled today' : left === 0 ? 'Every routine is done today' : `${numberWord(left)} routine${left === 1 ? '' : 's'} left today`

  return (
    <main className="screen" style={{ background: 'var(--wash-default)' }}>
      <div className="pad top" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Link to="/profile" aria-label="Your profile" style={{ lineHeight: 0 }}><Avatar user={me.role} size={46} /></Link>
        <div style={{ flex: 1 }}>
          <div className="eyebrow">{eyebrowDate(today)}</div>
          <h1 className="title-30" style={{ marginTop: 3 }}>{greeting(now)}, {name}</h1>
        </div>
        <Link to="/notifications" aria-label="Notifications" style={{ padding: 6, lineHeight: 0 }}>
          <Icon name="bell" size={22} stroke={1.7} />
        </Link>
      </div>

      <InstallHint />

      <div className="pad" style={{ paddingTop: 24, display: 'flex', alignItems: 'center', gap: 18 }}>
        <ProgressRing pct={Math.round(ring)} />
        <div style={{ flex: 1 }}>
          <div className="label">Today’s progress</div>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.01em', marginTop: 4 }} aria-label={`${day.done} of ${day.total} routines completed`}>
            {doneShown} / {day.total} routines completed
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--muted-1)', marginTop: 3 }}>{subline}</div>
          <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, color: 'inherit', animation: 'pop-in .35s ease' }}>
            <Ember streak={streak.current} size={19} />
            <div className="display" style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.03em' }}>{streakShown}</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted-2)', fontWeight: 600 }}>day streak · best {streak.longest}</div>
          </Link>
        </div>
      </div>

      {r && (
        <div className="pad" style={{ paddingTop: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="label">{focus.started ? 'Now' : 'Next'} · {looseTime(routineTime(r))}</div>
            {p.done < p.total && <Link to={`/run?r=${r.id}`} className="pill-ink">Focus mode</Link>}
          </div>
          <div className="card" style={{ padding: '19px 20px 15px', marginTop: 12 }}>
            <Link to={`/routines/${r.id}`} style={{ display: 'flex', alignItems: 'center', gap: 11, color: 'inherit' }}>
              <Icon name={r.icon} size={21} color={ROUTINE_TINT[r.icon]} />
              <div className="display" style={{ flex: 1, fontSize: 21, fontWeight: 700, letterSpacing: '-.022em' }}>{r.name}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted-2)' }}>{p.done}/{p.total}</div>
            </Link>
            <div style={{ height: 3, background: 'var(--chip-alt-2)', borderRadius: 2, marginTop: 13 }}>
              <div style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%`, height: '100%', background: 'var(--gold)', borderRadius: 2, transition: 'width .35s ease' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
              {steps.map((st) => {
                const done = !!c?.completedStepIds.includes(st.id)
                return (
                  <button key={st.id} type="button" onClick={() => toggle(r.id, st.id)} aria-pressed={done}
                    style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '9px 0', width: '100%', textAlign: 'left' }}>
                    <Check done={done} />
                    <div style={{ flex: 1, fontSize: 15.5, transition: 'color .2s', ...(done ? { color: 'var(--muted-4)', textDecoration: 'line-through' } : { fontWeight: 600 }) }}>{stepLabel(st)}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {(later.length > 0 || doneToday.length > 0) && (
        <div className="pad" style={{ paddingTop: 22 }}>
          <div className="label">{later.length ? 'Later today' : 'Done today'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 6 }}>
            {[...later, ...doneToday].map((x) => {
              const xc = completionFor(data, x, today)
              const xp = progress(x, today, xc)
              const finished = xp.done === xp.total || !!xc?.skipped
              return (
                <Fragment key={x.id}>
                  <Link to={`/routines/${x.id}`} className="list-row" style={{ opacity: finished ? 0.6 : 1 }}>
                    <Icon name={x.icon} size={21} color={ROUTINE_TINT[x.icon]} />
                    <div style={{ flex: 1 }}>
                      <div className="row-title" style={finished ? { textDecoration: 'line-through', color: 'var(--muted-4)' } : undefined}>{x.name}</div>
                      <div className="meta">{xc?.skipped ? 'Skipped today' : `${looseTime(routineTime(x))} · ${xp.done}/${xp.total} steps`}</div>
                    </div>
                  </Link>
                </Fragment>
              )
            })}
          </div>
        </div>
      )}
    </main>
  )
}

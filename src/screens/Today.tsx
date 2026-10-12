import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { Check } from '../components/controls'
import { Ember } from '../components/Ember'
import { Icon } from '../components/Icon'
import { InstallHint, PushHint } from '../components/InstallHint'
import { flash } from '../components/Toast'
import { StatCards } from '../components/StatCards'
import { catLook, headerDate, Label, PartnerStrip, RemindSheet, StepRow } from '../components/ui'
import { useMe } from '../data/session'
import { completionFor, dayProgress, nowRoutine, routineTime } from '../data/select'
import { useData } from '../data/store'
import type { Routine, TimeCategory } from '../data/types'
import { logicalToday } from '../lib/date'
import { greeting } from '../lib/greeting'
import { dayStreak, MILESTONES, progress, stepsOn } from '../lib/streak'

const GROUPS: [TimeCategory, string][] = [['morning', 'Morning'], ['afternoon', 'Afternoon'], ['evening', 'Evening'], ['night', 'Night'], ['custom', 'Custom']]

/** Leo's home: routines done today, the streak, the routine that's up next, and the rest of the day. */
export function Today() {
  const data = useData()
  const { me, name } = useMe()
  const navigate = useNavigate()
  const [remind, setRemind] = useState(false)
  const today = logicalToday()
  const now = new Date()

  const day = dayProgress(data, today)
  const streak = dayStreak(data.routines, data.completions, today)

  if (data.routines.length === 0) return <Navigate to="/welcome" replace />

  const focus = nowRoutine(data, now)
  const next = focus?.routine
  const allDone = day.total > 0 && day.done === day.total

  const toggle = (routineId: string, stepId: string) => {
    const r = data.routines.find((x) => x.id === routineId)!
    const res = data.toggleStep(routineId, stepId)
    if (res.completedRoutine) {
      const milestone = MILESTONES.includes(res.streak)
      flash(`${r.name} done · ${res.streak} in a row`, milestone ? { label: 'See it', run: () => navigate(`/milestone?r=${routineId}`) } : undefined)
    }
  }

  const c = next ? completionFor(data, next, today) : undefined
  const steps = next ? stepsOn(next, today) : []
  const p = next ? progress(next, today, c) : { done: 0, total: 0 }
  const look = next ? catLook(next) : null
  const sub = day.total === 0 ? 'Nothing scheduled today' : allDone ? 'Nothing left today' : next ? `${next.name} is up next` : ''

  const row = (r: Routine) => {
    const rc = completionFor(data, r, today)
    const rp = progress(r, today, rc)
    const done = rp.total > 0 && rp.done === rp.total
    const skipped = !!rc?.skipped
    const l = catLook(r)
    return (
      <Link key={r.id} to={`/routines/${r.id}`} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 0', borderBottom: '1px solid var(--divider)', color: 'inherit' }}>
        <Icon name={l.icon} size={21} color={l.color} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15.5, fontWeight: 700, color: done || skipped ? 'var(--muted-4)' : 'var(--ink)' }}>{r.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted-2)', marginTop: 2 }}>{routineTime(r)} · {skipped ? 'Skipped today' : done ? 'Done today' : `${rp.done} of ${rp.total} steps`}</div>
        </div>
        {done ? <Check done /> : <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--muted-3)' }}>{skipped ? '—' : `${rp.done}/${rp.total}`}</div>}
      </Link>
    )
  }
  const groups = GROUPS.map(([k, label]) => ({ label, items: day.list.filter((r) => r.timeCategory === k && r.id !== next?.id) })).filter((g) => g.items.length)

  return (
    <main className="screen" style={{ background: 'var(--wash-default)' }}>
      <div className="pad top" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Link to="/profile" aria-label="Your profile" style={{ lineHeight: 0 }}><Avatar user={me.role} size={46} /></Link>
        <div style={{ flex: 1 }}>
          <div className="eyebrow">{headerDate(today)}</div>
          <h1 className="display" style={{ fontSize: 29, fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.1, margin: '3px 0 0' }}>{greeting(now)}, {name}</h1>
        </div>
        <Link to="/notifications" aria-label="Notifications" style={{ padding: 6, lineHeight: 0 }}>
          <Icon name="bell" size={22} stroke={1.7} />
        </Link>
      </div>

      <InstallHint />
      <PushHint />

      <StatCards done={day.done} total={day.total} unit="Routines" streak={streak.current} streakCaption="Day streak" streakTo="/streak" today={today} fire weekTo="/week" />
      {sub && !next && <div className="pad" style={{ paddingTop: 12, fontSize: 13.5, color: 'var(--muted-1)' }}>{sub}</div>}

      {next && look && (
        <div className="pad" style={{ paddingTop: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Label>Up next · {routineTime(next)}</Label>
            <Link to={`/run?r=${next.id}`} className="pill-ink">Focus mode</Link>
          </div>
          <div className="card" style={{ padding: '19px 20px 13px', marginTop: 12 }}>
            <Link to={`/routines/${next.id}`} style={{ display: 'flex', alignItems: 'center', gap: 11, color: 'inherit' }}>
              <Icon name={look.icon} size={21} color={look.color} />
              <div className="display" style={{ flex: 1, fontSize: 21, fontWeight: 700, letterSpacing: '-.022em' }}>{next.name}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted-2)' }}>{p.done}/{p.total}</div>
            </Link>
            <div style={{ height: 3, background: 'var(--chip-alt-2)', borderRadius: 2, marginTop: 13 }}>
              <div style={{ width: `${p.total ? Math.round((p.done / p.total) * 100) : 0}%`, height: '100%', background: 'var(--gold)', borderRadius: 2, transition: 'width .35s ease' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 6 }}>
              {steps.map((st) => (
                <StepRow key={st.id} title={st.title} minutes={st.duration} done={!!c?.completedStepIds.includes(st.id)} onToggle={() => toggle(next.id, st.id)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {allDone && (
        <div className="pad" style={{ paddingTop: 26 }}>
          <div className="card" style={{ padding: '22px 20px', display: 'flex', alignItems: 'center', gap: 16, animation: 'pop-in .3s ease' }}>
            <Ember streak={Math.max(25, streak.current)} size={46} flicker />
            <div>
              <div className="display" style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-.022em' }}>Every routine done</div>
              <div style={{ fontSize: 13, color: 'var(--muted-1)', marginTop: 3 }}>That’s {streak.current} {streak.current === 1 ? 'day' : 'days'} in a row.</div>
            </div>
          </div>
        </div>
      )}

      <div className="pad" style={{ paddingTop: 24 }}>
        {groups.map((g) => (
          <div key={g.label} style={{ marginBottom: 12 }}>
            <Label>{g.label}</Label>
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 4 }}>{g.items.map(row)}</div>
          </div>
        ))}
      </div>

      <div className="pad" style={{ paddingTop: 10 }}>
        <PartnerStrip onRemind={() => setRemind(true)} />
      </div>
      <RemindSheet open={remind} onClose={() => setRemind(false)} />
    </main>
  )
}

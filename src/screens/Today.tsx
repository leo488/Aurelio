import { Fragment } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { Check, ProgressRing } from '../components/controls'
import { Ember } from '../components/Ember'
import { Icon, ROUTINE_TINT } from '../components/Icon'
import { InstallHint } from '../components/InstallHint'
import { flash } from '../components/Toast'
import { pronoun, useMe } from '../data/session'
import { dayProgress, eventsOn, isOverdue, isShared, logOf, myRoutines, myTasks, nowRoutine, routinesOn, taskMeta } from '../data/select'
import { useData } from '../data/store'
import { diffDays, eyebrowDate, relativeDay, logicalToday, looseTime, minutesOf, nowMinutes, timeOf } from '../lib/date'
import { greeting } from '../lib/greeting'
import { itemLabel } from '../lib/labels'
import { itemsOn, liveStreak, MILESTONES, progress } from '../lib/streak'
import { numberWord } from '../lib/words'

export function Today() {
  const data = useData()
  const { me, partner, name } = useMe()
  const navigate = useNavigate()
  const today = logicalToday()
  const now = new Date()

  const mine = myRoutines(data, me).filter((r) => r.owner === me)
  if (mine.length === 0) return <Navigate to="/welcome" replace />

  const day = dayProgress(data, me, today)
  const focus = nowRoutine(data, me, now)
  const best = [...mine].filter((r) => !r.paused).sort((a, b) => liveStreak(b, today, logOf(data, b)) - liveStreak(a, today, logOf(data, a)))[0] ?? mine[0]
  const bestStreak = liveStreak(best, today, logOf(data, best))

  const toggle = (routineId: string, itemId: string) => {
    const r = data.routines.find((x) => x.id === routineId)!
    const res = data.toggleItem(routineId, itemId)
    if (res.completedRoutine) {
      data.addActivity({ who: me, kind: 'routine-done', text: `finished ${pronoun[me].their} ${r.name.toLowerCase()}`, routineId })
      const milestone = MILESTONES.includes(res.streak)
      flash(`${r.name} complete · streak now ${res.streak}`, milestone ? { label: 'See it', run: () => navigate(`/milestone?r=${routineId}`) } : undefined)
    }
  }

  const mins = nowMinutes(now)
  type LaterRow = { key: string; sort: number; node: React.ReactNode }
  const later: LaterRow[] = []
  for (const e of eventsOn(data, me, today)) {
    if (minutesOf(timeOf(e.end)!) < mins) continue
    later.push({
      key: e.id, sort: minutesOf(timeOf(e.start)!),
      node: (
        <Link to={`/calendar/${today}`} className="list-row">
          <div className="spine" style={{ background: e.shared ? 'var(--gold)' : 'var(--iris)' }} />
          <div style={{ flex: 1 }}>
            <div className="row-title">{e.title}</div>
            <div className="meta">{timeOf(e.start)} – {timeOf(e.end)}</div>
          </div>
        </Link>
      ),
    })
  }
  for (const t of myTasks(data, me)) {
    if (t.done) continue
    const overdue = isOverdue(t, now)
    const dueToday = t.due?.startsWith(today)
    if (!overdue && !dueToday) continue
    later.push({
      key: t.id, sort: overdue ? -1 : minutesOf(timeOf(t.due) ?? '23:59'),
      node: (
        <Link to="/tasks" className="list-row">
          <Check done={false} overdue={overdue} />
          <div style={{ flex: 1 }}>
            <div className="row-title">{t.title}</div>
            <div className="meta" style={overdue ? { color: 'var(--clay)', fontWeight: 700 } : undefined}>
              {overdue ? overdueText(diffDays(today, t.due!.slice(0, 10)), relativeDay(t.due!.slice(0, 10), today)) : taskMeta(t, me, '', today)}
            </div>
          </div>
        </Link>
      ),
    })
  }
  for (const r of routinesOn(data, me, today)) {
    if (r.id === focus?.routine.id || isShared(r)) continue
    const p = progress(r, today, logOf(data, r))
    if (p.done === p.total || minutesOf(r.time) < mins - 60) continue
    later.push({
      key: r.id, sort: minutesOf(r.time),
      node: (
        <Link to="/routines" className="list-row">
          <Icon name={r.icon} size={21} color={ROUTINE_TINT[r.icon]} />
          <div style={{ flex: 1 }}>
            <div className="row-title">{r.name}</div>
            <div className="meta">{looseTime(r.time)} · {p.total} items</div>
          </div>
        </Link>
      ),
    })
  }
  later.sort((a, b) => a.sort - b.sort)

  const r = focus?.routine
  const log = r ? logOf(data, r) : undefined
  const items = r ? itemsOn(r, today) : []
  const p = r ? progress(r, today, log) : { done: 0, total: 0 }
  const blocksLeft = day.blocksLeft === 0 ? 'Every block is done today' : `${numberWord(day.blocksLeft)} block${day.blocksLeft === 1 ? '' : 's'} left today`

  return (
    <main className="screen" style={{ background: 'var(--wash-default)' }}>
      <div className="pad top" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Avatar user={me} size={46} />
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
        <ProgressRing pct={day.pct} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.01em' }}>{day.done} of {day.total} done</div>
          <div style={{ fontSize: 13.5, color: 'var(--muted-1)', marginTop: 3 }}>{blocksLeft}</div>
          <Link to="/streak" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, color: 'inherit' }}>
            <Ember streak={bestStreak} size={19} />
            <div className="display" style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.03em' }}>{bestStreak}</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted-2)', fontWeight: 600 }}>days · best {Math.max(best.streak.longest, bestStreak)}</div>
          </Link>
        </div>
      </div>

      {r && (
        <div className="pad" style={{ paddingTop: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="label">{focus.started ? 'Now' : 'Next'} · {looseTime(r.time)}</div>
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
              {items.map((it) => {
                const done = !!log?.doneItemIds.includes(it.id)
                return (
                  <button key={it.id} type="button" onClick={() => toggle(r.id, it.id)} aria-pressed={done}
                    style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '9px 0', width: '100%', textAlign: 'left' }}>
                    <Check done={done} />
                    <div style={{ flex: 1, fontSize: 15.5, transition: 'color .2s', ...(done ? { color: 'var(--muted-4)', textDecoration: 'line-through' } : { fontWeight: 600 }) }}>{itemLabel(it)}</div>
                    {it.shared && <Avatar user={partner} size={18} />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {later.length > 0 && (
        <div className="pad" style={{ paddingTop: 22 }}>
          <div className="label">Later</div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 6 }}>
            {later.map((l) => (
              <Fragment key={l.key}>{l.node}</Fragment>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}

const overdueText = (days: number, rel: string) => (days === 0 ? 'Overdue' : days === 1 ? 'Overdue since yesterday' : `Overdue since ${rel}`)

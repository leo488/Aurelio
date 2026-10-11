import { Link } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { ProgressRing } from '../components/controls'
import { Ember } from '../components/Ember'
import { Icon } from '../components/Icon'
import { InstallHint } from '../components/InstallHint'
import { QuickAdd, TaskRow, Timeline } from '../components/tasks'
import { useMe } from '../data/session'
import { overdueTasks, tasksOn, upcomingTasks } from '../data/select'
import { useData } from '../data/store'
import { eyebrowDate, logicalToday, relativeDay } from '../lib/date'
import { greeting } from '../lib/greeting'
import { planningStreak } from '../lib/stats'
import { useCountUp } from '../lib/useCountUp'

/** Sonia's home: what's on today, how far through it she is, and adding a task in place. */
export function SoniaToday() {
  const data = useData()
  const { me, name } = useMe()
  const today = logicalToday()
  const now = new Date()
  const list = tasksOn(data, today)
  const done = list.filter((t) => t.completed).length
  const pct = list.length ? Math.round((done / list.length) * 100) : 0
  const ring = useCountUp(pct)
  const count = Math.round(useCountUp(list.length))
  const streak = planningStreak(data, today)
  const overdue = overdueTasks(data, today)
  const upcoming = upcomingTasks(data, today, 7)
  const nextDays = [...new Set(upcoming.map((t) => t.date!))].slice(0, 3)

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
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.01em' }} aria-label={`${list.length} tasks today`}>{count} task{list.length === 1 ? '' : 's'} today</div>
          <div style={{ fontSize: 13.5, color: 'var(--muted-1)', marginTop: 3 }}>
            {list.length === 0 ? 'Nothing planned yet' : `${done} completed · ${list.length - done} remaining`}
          </div>
          {streak > 0 && (
            <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, color: 'inherit', animation: 'pop-in .35s ease' }}>
              <Ember streak={streak} size={19} />
              <div className="display" style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.03em' }}>{streak}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted-2)', fontWeight: 600 }}>day planning streak</div>
            </Link>
          )}
        </div>
      </div>

      {overdue.length > 0 && (
        <div className="pad" style={{ paddingTop: 24 }}>
          <div className="label" style={{ color: 'var(--clay)' }}>Overdue</div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 4 }}>
            {overdue.map((t) => <TaskRow key={t.id} task={t} />)}
          </div>
        </div>
      )}

      <div className="pad" style={{ paddingTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <div className="label">Today</div>
          <Link to={`/calendar/${today}`} style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--gold-text)' }}>Open day</Link>
        </div>
        <Timeline tasks={list} empty="A clear day. Add the first thing below." />
        <div style={{ marginTop: 14 }}><QuickAdd date={today} /></div>
      </div>

      {nextDays.length > 0 && (
        <div className="pad" style={{ paddingTop: 26 }}>
          <div className="label">Coming up</div>
          {nextDays.map((d) => (
            <div key={d} style={{ marginTop: 10 }}>
              <Link to={`/calendar?d=${d}&m=${d.slice(0, 7)}`} style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted-1)' }}>{relativeDay(d, today)}</Link>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {upcoming.filter((t) => t.date === d).map((t) => <TaskRow key={t.id} task={t} showDate={false} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

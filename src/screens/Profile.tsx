import { Link } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { StreakMark } from '../components/controls'
import { Ember } from '../components/Ember'
import { Icon, ROUTINE_TINT } from '../components/Icon'
import { useMe } from '../data/session'
import { useData } from '../data/store'
import { logicalToday, WEEKDAY_LETTER, weekday } from '../lib/date'
import { leoStats, soniaStats } from '../lib/stats'

const Stat = ({ value, caption }: { value: React.ReactNode; caption: string }) => (
  <div>
    <div className="display" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.035em', lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 11, color: 'var(--stat-caption)', fontWeight: 700, marginTop: 4 }}>{caption}</div>
  </div>
)

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', rowGap: 22, columnGap: 12 }}>{children}</div>
)

/** Each person's profile is their performance, worked out from their own records. */
export function Profile() {
  const { me, name, partnerName } = useMe()
  return (
    <main className="screen" style={{ background: 'var(--wash-settings)' }}>
      <div className="pad" style={{ paddingTop: 'calc(var(--safe-top) + 20px)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Avatar user={me.role} size={62} />
        <div style={{ flex: 1 }}>
          <h1 className="display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.03em', margin: 0 }}>{name}</h1>
          <div style={{ fontSize: 13, color: 'var(--muted-2)', marginTop: 2 }}>Paired with {partnerName}</div>
        </div>
        <Link to="/settings" aria-label="Settings" style={{ padding: 4, lineHeight: 0 }}><Icon name="gear" size={22} stroke={1.7} /></Link>
      </div>
      {me.role === 'leo' ? <LeoPerformance /> : <SoniaPerformance />}
    </main>
  )
}

function LeoPerformance() {
  const data = useData()
  const today = logicalToday()
  const s = leoStats(data, today)
  const colour = { full: 'var(--olive)', partial: 'var(--olive-pale)', missed: 'var(--heat-missed)', skipped: 'var(--heat-future)', none: 'var(--heat-future)' }
  return (
    <>
      <div className="pad" style={{ paddingTop: 30, display: 'flex', alignItems: 'center', gap: 18 }}>
        <Ember streak={s.current} size={64} flicker />
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div className="display" style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-.05em', lineHeight: 0.9 }}>{s.current}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted-2)' }}>day streak</div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted-1)', marginTop: 8 }}>A day counts when every routine due that day is done.</div>
        </div>
      </div>
      <div className="pad" style={{ paddingTop: 28 }}>
        <Grid>
          <Stat value={s.longest} caption="Longest streak" />
          <Stat value={s.routinesCompleted} caption="Routines completed" />
          <Stat value={s.completedDays} caption="Full days" />
          <Stat value={`${s.today.rate}%`} caption={`Today · ${s.today.done}/${s.today.total}`} />
          <Stat value={`${s.weekly}%`} caption="This week" />
          <Stat value={`${s.monthly}%`} caption="Last 30 days" />
        </Grid>
      </div>
      <div className="pad" style={{ paddingTop: 30 }}>
        <div className="label" style={{ marginBottom: 12 }}>Last 7 days</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 7 }}>
          {s.week.map((d) => (
            <div key={d.date} style={{ textAlign: 'center' }}>
              <div title={d.date} style={{ aspectRatio: '1', borderRadius: 7, background: d.date === today && d.outcome !== 'full' ? 'var(--gold)' : colour[d.outcome] }} />
              <div style={{ fontSize: 10, color: 'var(--muted-3)', fontWeight: 800, marginTop: 6 }}>{WEEKDAY_LETTER[weekday(d.date)]}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="pad" style={{ paddingTop: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div className="label">Routines</div>
          <Link to="/streak" style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--gold-text)' }}>Consistency</Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 6 }}>
          {s.perRoutine.map(({ routine: r, current, longest, completedDays, month }) => (
            <Link key={r.id} to={`/routines/${r.id}`} className="list-row" style={{ opacity: r.active ? 1 : 0.55 }}>
              <Icon name={r.icon} size={21} color={ROUTINE_TINT[r.icon]} />
              <div style={{ flex: 1 }}>
                <div className="row-title">{r.name}</div>
                <div className="meta">{month}% last 30 days · best {longest} · {completedDays} done</div>
              </div>
              <StreakMark n={current} />
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}

function SoniaPerformance() {
  const data = useData()
  const today = logicalToday()
  const s = soniaStats(data, today)
  const max = Math.max(1, ...s.week.map((d) => d.total))
  return (
    <>
      <div className="pad" style={{ paddingTop: 30 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div className="display" style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-.05em', lineHeight: 0.9 }}>{s.today.rate}%</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted-2)' }}>of today done</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted-1)', marginTop: 8 }}>{s.today.done} of {s.today.total} tasks today{s.streak ? ` · ${s.streak}-day planning streak` : ''}</div>
      </div>
      <div className="pad" style={{ paddingTop: 28 }}>
        <Grid>
          <Stat value={s.completed} caption="Tasks completed" />
          <Stat value={s.remaining} caption="Tasks remaining" />
          <Stat value={s.streak} caption="Planning streak" />
          <Stat value={`${s.weekly.rate}%`} caption={`This week · ${s.weekly.done}/${s.weekly.total}`} />
          <Stat value={s.activeDays} caption="Planned days, 30d" />
          <Stat value={s.plannedAhead} caption="Next 7 days" />
        </Grid>
      </div>
      <div className="pad" style={{ paddingTop: 30 }}>
        <div className="label" style={{ marginBottom: 14 }}>Weekly productivity</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 9, alignItems: 'end', height: 120 }}>
          {s.week.map((d) => (
            <div key={d.date} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }} title={`${d.done} of ${d.total}`}>
              <div style={{ background: 'var(--chip-alt-2)', borderRadius: 8, height: `${(d.total / max) * 100}%`, minHeight: 6, display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: `${d.total ? (d.done / d.total) * 100 : 0}%`, background: d.date === today ? 'var(--gold)' : 'var(--olive)', borderRadius: 8 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 9, marginTop: 8 }}>
          {s.week.map((d) => <div key={d.date} style={{ fontSize: 10, color: 'var(--muted-3)', fontWeight: 800, textAlign: 'center' }}>{WEEKDAY_LETTER[weekday(d.date)]}</div>)}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted-2)', lineHeight: 1.6, marginTop: 16 }}>
          The planning streak counts days in a row where you finished at least 60% of what you planned. Days with nothing planned don’t count against you.
        </div>
      </div>
    </>
  )
}

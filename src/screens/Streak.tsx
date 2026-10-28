import { Link } from 'react-router-dom'
import { Fire } from '../components/StatCards'
import { HeatCell, HeatLegend } from '../components/track'
import { Label, ScreenHeader, WeekLetters } from '../components/ui'
import { useData } from '../data/store'
import { addDays, logicalToday, mondayOf, MONTHS_SHORT, weekStart } from '../lib/date'
import { checkedSet, dayScore, firstWeek, trackedWeeks, trackStreak, trackWeekNumber, weekSummary } from '../lib/track'

/** The map shows every tracked week, at least four rows and at most ten. */
const MIN_WEEKS = 4
const MAX_WEEKS = 10

const range = (monday: string) => {
  const sunday = addDays(monday, 6)
  const [m1, d1] = [Number(monday.slice(5, 7)), Number(monday.slice(8))]
  const [m2, d2] = [Number(sunday.slice(5, 7)), Number(sunday.slice(8))]
  return m1 === m2 ? `${d1} – ${d2} ${MONTHS_SHORT[m2 - 1]}` : `${d1} ${MONTHS_SHORT[m1 - 1]} – ${d2} ${MONTHS_SHORT[m2 - 1]}`
}

const Stat = ({ value, caption }: { value: React.ReactNode; caption: string }) => (
  <div style={{ padding: '12px 0', borderTop: '1px solid var(--divider)' }}>
    <div className="display" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.03em' }}>{value}</div>
    <div style={{ fontSize: 11.5, color: 'var(--muted-2)', fontWeight: 700, marginTop: 2 }}>{caption}</div>
  </div>
)

/** How consistent Leo has been: any tick keeps the run going, and the map shades each day by how much got done. */
export function Streak() {
  const data = useData()
  const today = logicalToday()
  const checked = checkedSet(Object.values(data.trackChecks))
  const first = firstWeek(data.trackItems, today)
  const st = trackStreak(data.trackItems, checked, today, first)
  const weeks = trackedWeeks(data.trackItems, today).map((k) => weekSummary(data.trackItems, checked, k, today))
  const done = weeks.reduce((n, w) => n + w.done, 0)
  const total = weeks.reduce((n, w) => n + w.total, 0)
  const shown = Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, weeks.length))
  const start = addDays(weekStart(today), -7 * (shown - 1))
  const cells = Array.from({ length: shown * 7 }, (_, i) => addDays(start, i))
  const firstDay = mondayOf(first)

  return (
    <main className="screen" style={{ background: 'var(--wash-streak)' }}>
      <ScreenHeader title="Streak" />
      <div className="pad" style={{ paddingTop: 20, display: 'flex', alignItems: 'center', gap: 18 }}>
        <Fire lit={st.current > 0} size={64} />
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div className="display" style={{ fontSize: 58, fontWeight: 800, letterSpacing: '-.05em', lineHeight: 0.9 }}>{st.current}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted-2)' }}>{st.current === 1 ? 'day' : 'days'} in a row</div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted-1)', marginTop: 8 }}>Any tick counts. Every bit shows.</div>
        </div>
      </div>
      <div className="pad" style={{ paddingTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <Stat value={st.longest} caption="Longest run" />
        <Stat value={st.days} caption="Days with a tick" />
        <Stat value={`${total ? Math.round((done / total) * 100) : 0}%`} caption="Of everything" />
      </div>

      <div className="pad" style={{ paddingTop: 18 }}>
        <WeekLetters gap={6} marginBottom={8} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }} role="img" aria-label={`Last ${shown} weeks`}>
          {cells.map((d) => {
            if (d < firstDay) return <div key={d} className="heat heat-f" style={{ opacity: 0.4 }} />
            const s = dayScore(data.trackItems, checked, d)
            return <HeatCell key={d} done={s.done} total={s.total} future={d > today} today={d === today} title={`${d}: ${s.done}/${s.total}`} />
          })}
        </div>
        <div style={{ marginTop: 14 }}><HeatLegend /></div>
      </div>

      <div className="pad" style={{ paddingTop: 26 }}>
        <Label>Week by week</Label>
        {weeks.map((w) => (
          <Link key={w.key} to={w.key === weeks[0].key ? '/week' : `/week?w=${w.key}`} className="list-row" style={{ color: 'inherit' }}>
            <div style={{ width: 64 }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Week {trackWeekNumber(first, w.key)}</div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted-3)', marginTop: 2 }}>{range(w.monday)}</div>
            </div>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {w.days.map((d) => <HeatCell key={d.date} done={d.done} total={d.total} future={d.future} />)}
            </div>
            <div style={{ width: 40, textAlign: 'right', fontSize: 13, fontWeight: 800, color: 'var(--muted-1)' }}>{Math.round(w.pct * 100)}%</div>
          </Link>
        ))}
      </div>
    </main>
  )
}

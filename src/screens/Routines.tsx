import { Link } from 'react-router-dom'
import { StreakMark } from '../components/controls'
import { Ember } from '../components/Ember'
import { Icon, ROUTINE_TINT } from '../components/Icon'
import { CATEGORY_LABEL, categoryText, routineTime } from '../data/select'
import { useData } from '../data/store'
import type { Routine, TimeCategory } from '../data/types'
import { addDays, daysLabel, logicalToday, looseTime } from '../lib/date'
import { completionOf, outcome, routineStreak } from '../lib/streak'

const ORDER: TimeCategory[] = ['morning', 'afternoon', 'evening', 'night', 'custom']

/** Every routine, grouped by the part of the day it belongs to. No limit on how many. */
export function Routines() {
  const data = useData()
  const today = logicalToday()
  const active = data.routines.filter((r) => r.active)
  const inactive = data.routines.filter((r) => !r.active)
  const byTime = (a: Routine, b: Routine) => routineTime(a).localeCompare(routineTime(b))

  // Custom routines group under their own label ("Before lunch"), the rest under the category name.
  const groups = new Map<string, Routine[]>()
  for (const cat of ORDER) {
    for (const r of active.filter((x) => x.timeCategory === cat).sort(byTime)) {
      const key = cat === 'custom' ? categoryText(r) : CATEGORY_LABEL[cat]
      groups.set(key, [...(groups.get(key) ?? []), r])
    }
  }

  const weekBars = (r: Routine) =>
    Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today, i - 6)
      const o = outcome(r, d, completionOf(data.completions, r.id, d))
      return o === 'full' ? 'var(--olive)' : o === 'partial' ? 'var(--olive-pale)' : o === 'none' || o === 'skipped' ? 'var(--heat-future)' : d === today ? 'var(--heat-future)' : 'var(--heat-missed)'
    })

  return (
    <main className="screen">
      <div className="pad top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 className="title">Routines</h1>
        <Link to="/routines/new" aria-label="New routine" style={{ padding: 4, lineHeight: 0 }}>
          <Icon name="plus" size={24} stroke={1.9} />
        </Link>
      </div>
      {data.routines.length === 0 && (
        <div className="pad" style={{ paddingTop: 24, fontSize: 14, color: 'var(--muted-2)' }}>No routines yet. Tap + or ask Ori to build one.</div>
      )}
      {[...groups.entries()].map(([label, list]) => (
        <div key={label} className="pad" style={{ paddingTop: 22 }}>
          <div className="label">{label}</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {list.map((r) => (
              <Link key={r.id} to={`/routines/${r.id}`} style={{ padding: '16px 0', borderBottom: '1px solid var(--divider)', color: 'inherit', display: 'block' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Icon name={r.icon} size={22} color={ROUTINE_TINT[r.icon]} />
                  <div style={{ flex: 1 }}>
                    <div className="display" style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.022em' }}>{r.name}</div>
                    <div className="meta">{[daysLabel(r.repeatPattern.days), r.scheduledTime ? looseTime(r.scheduledTime) : '', `${r.steps.length} step${r.steps.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}</div>
                  </div>
                  <StreakMark n={routineStreak(r, data.completions, today).current} />
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 13 }} aria-hidden="true">
                  {weekBars(r).map((c, i) => <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: c }} />)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
      {inactive.length > 0 && (
        <div className="pad" style={{ paddingTop: 22 }}>
          <div className="label">Inactive</div>
          {inactive.map((r) => (
            <Link key={r.id} to={`/routines/${r.id}`} style={{ padding: '16px 0', display: 'flex', alignItems: 'center', gap: 12, opacity: 0.55, color: 'inherit' }}>
              <Icon name={r.icon} size={22} color="var(--muted-2)" />
              <div style={{ flex: 1 }}>
                <div className="display" style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.022em' }}>{r.name}</div>
                <div className="meta">Inactive · streak of {routineStreak(r, data.completions, today).current} held</div>
              </div>
              <Ember streak={0} size={17} />
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}

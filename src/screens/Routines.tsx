import { Link, useNavigate } from 'react-router-dom'
import { Ember } from '../components/Ember'
import { Icon } from '../components/Icon'
import { catLook, PlusButton, ScreenHeader } from '../components/ui'
import { categoryText, routineTime } from '../data/select'
import { useData } from '../data/store'
import type { TimeCategory } from '../data/types'
import { daysLabel, logicalToday } from '../lib/date'
import { routineStreak } from '../lib/streak'

const ORDER: TimeCategory[] = ['morning', 'afternoon', 'evening', 'night', 'custom']

/** Every routine, active first, then by time of day. No limit on how many. */
export function Routines() {
  const data = useData()
  const navigate = useNavigate()
  const today = logicalToday()
  const active = data.routines.filter((r) => r.active).length
  const list = [...data.routines].sort((a, b) =>
    Number(b.active) - Number(a.active) || ORDER.indexOf(a.timeCategory) - ORDER.indexOf(b.timeCategory) || routineTime(a).localeCompare(routineTime(b)))

  return (
    <main className="screen">
      <ScreenHeader title="Routines" sub={`${active} active · ${data.routines.length - active} paused`} right={<PlusButton label="New routine" onClick={() => navigate('/routines/new')} />} />
      <div className="pad" style={{ paddingTop: 12, display: 'flex', flexDirection: 'column' }}>
        {list.map((r) => {
          const look = catLook(r)
          const streak = routineStreak(r, data.completions, today).current
          return (
            <Link key={r.id} to={`/routines/${r.id}`} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '16px 0', borderBottom: '1px solid var(--divider)', color: 'inherit', opacity: r.active ? 1 : 0.55 }}>
              <Icon name={look.icon} size={22} color={look.color} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="display" style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.022em' }}>{r.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted-2)', marginTop: 2 }}>
                  {categoryText(r)} · {routineTime(r)} · {daysLabel(r.repeatPattern.days)} · {r.steps.length} {r.steps.length === 1 ? 'step' : 'steps'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Ember streak={r.active ? streak : 0} size={17} />
                <div className="display" style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.03em' }}>{streak}</div>
              </div>
            </Link>
          )
        })}
        {data.routines.length === 0 && (
          <div style={{ padding: '60px 10px 0', textAlign: 'center' }}>
            <Ember streak={0} size={64} style={{ display: 'inline-block' }} />
            <div className="display" style={{ fontSize: 23, fontWeight: 700, letterSpacing: '-.025em', marginTop: 18 }}>No routines yet</div>
            <div style={{ fontSize: 14, color: 'var(--muted-2)', marginTop: 8, lineHeight: 1.6 }}>Build one by hand, or tap Ori and say what you want.</div>
            <button type="button" onClick={() => navigate('/routines/new')} style={{ marginTop: 20, background: 'var(--ink)', color: 'var(--paper)', fontSize: 14, fontWeight: 800, padding: '14px 22px', borderRadius: 12 }}>Create a routine</button>
          </div>
        )}
      </div>
    </main>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Chip, StreakMark } from '../components/controls'
import { Ember } from '../components/Ember'
import { Icon, ROUTINE_TINT } from '../components/Icon'
import { useMe } from '../data/session'
import { isShared, logOf, myRoutines, routineMeta, sessionDate } from '../data/select'
import { useData } from '../data/store'
import type { Routine } from '../data/types'
import { addDays, daysLabel, logicalToday } from '../lib/date'
import { liveStreak, logKey, outcome, progress } from '../lib/streak'

type Filter = 'Active' | 'Shared' | 'Paused'

export function Routines() {
  const data = useData()
  const { me, partnerName } = useMe()
  const [filter, setFilter] = useState<Filter>('Active')
  const today = logicalToday()
  const all = myRoutines(data, me)

  const own = all.filter((r) => !isShared(r) && !r.paused)
  const shared = all.filter(isShared)
  const paused = all.filter((r) => r.paused && !isShared(r))

  const weekBars = (r: Routine) =>
    Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today, i - 6)
      const o = d === today ? 'none' : outcome(r, d, data.logs[logKey(d, r.id)])
      return o === 'full' ? '#6E7F63' : o === 'partial' ? '#B6C0AE' : '#E2D9CB'
    })

  return (
    <main className="screen">
      <div className="pad top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 className="title">Routines</h1>
        <Link to="/routines/new" aria-label="New routine" style={{ padding: 4, lineHeight: 0 }}>
          <Icon name="plus" size={24} stroke={1.9} />
        </Link>
      </div>
      <div className="pad" style={{ paddingTop: 18, display: 'flex', gap: 8 }}>
        {(['Active', 'Shared', 'Paused'] as Filter[]).map((f) => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Chip>
        ))}
      </div>
      <div className="pad" style={{ paddingTop: 14, display: 'flex', flexDirection: 'column' }}>
        {filter === 'Active' &&
          own.map((r) => {
            const daily = r.days.length === 7
            return (
              <Link key={r.id} to={`/routines/${r.id}`} style={{ padding: '18px 0', borderBottom: '1px solid var(--divider)', color: 'inherit', display: 'block' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Icon name={r.icon} size={22} color={ROUTINE_TINT[r.icon]} />
                  <div style={{ flex: 1 }}>
                    <div className="display" style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.022em' }}>{r.name}</div>
                    <div className="meta">{routineMeta(r, partnerName, daysLabel(r.days))}</div>
                  </div>
                  <StreakMark n={liveStreak(r, today, logOf(data, r))} />
                </div>
                {daily && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
                    {weekBars(r).map((c, i) => <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: c }} />)}
                  </div>
                )}
              </Link>
            )
          })}
        {(filter === 'Active' || filter === 'Shared') &&
          shared.map((r) => {
            const d = sessionDate(r, today)
            const p = progress(r, d, data.logs[logKey(d, r.id)])
            return (
              <Link key={r.id} to={`/routines/${r.id}`} style={{ padding: '18px 26px', margin: '0 -26px', borderBottom: '1px solid var(--divider)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--shared-bg)', color: 'inherit' }}>
                <Icon name="together" size={22} color="#A97C34" />
                <div style={{ flex: 1 }}>
                  <div className="display" style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.022em', color: 'var(--shared-text)' }}>{r.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--shared-text-2)', marginTop: 2 }}>{routineMeta(r, partnerName, daysLabel(r.days))}</div>
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--shared-text-2)' }}>{p.done}/{p.total}</div>
              </Link>
            )
          })}
        {(filter === 'Active' || filter === 'Paused') &&
          paused.map((r) => (
            <Link key={r.id} to={`/routines/${r.id}`} style={{ padding: '18px 0', display: 'flex', alignItems: 'center', gap: 12, opacity: 0.55, color: 'inherit' }}>
              <Icon name={r.icon} size={22} color="#8E857B" />
              <div style={{ flex: 1 }}>
                <div className="display" style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.022em' }}>{r.name}</div>
                <div className="meta">{routineMeta(r, partnerName, daysLabel(r.days))}</div>
              </div>
              <Ember streak={0} size={17} />
            </Link>
          ))}
        {filter === 'Shared' && shared.length === 0 && <Empty text={`Nothing shared with ${partnerName} yet.`} />}
        {filter === 'Paused' && paused.length === 0 && <Empty text="No paused routines." />}
      </div>
    </main>
  )
}

const Empty = ({ text }: { text: string }) => <div style={{ padding: '24px 0', fontSize: 14, color: 'var(--muted-2)' }}>{text}</div>

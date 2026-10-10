import { useNavigate } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { Ember } from '../components/Ember'
import { displayName, pronoun, useSession } from '../data/session'
import { myRoutines } from '../data/select'
import { useData } from '../data/store'
import type { User } from '../data/types'
import { logicalToday, relativeAgo } from '../lib/date'
import { liveStreak, logKey } from '../lib/streak'

export function ProfileSelect() {
  const setUser = useSession((s) => s.setUser)
  const navigate = useNavigate()
  const data = useData()
  const today = logicalToday()

  const streakOf = (u: User) => {
    const first = myRoutines(data, u).find((r) => r.owner === u && !r.paused)
    return first ? liveStreak(first, today, data.logs[logKey(today, first.id)]) : 0
  }
  const latest = data.activity.find((a) => a.kind === 'routine-done' && Date.now() - a.at < 12 * 3600000)

  const pick = (u: User) => {
    setUser(u)
    navigate(myRoutines(data, u).some((r) => r.owner === u) ? '/today' : '/welcome')
  }

  return (
    <main className="screen no-bar" style={{ display: 'flex', flexDirection: 'column', background: 'var(--wash-login)' }}>
      <div style={{ padding: 'calc(var(--safe-top) + 50px) 32px 0' }}>
        <h1 className="display" style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-.035em', lineHeight: 1.05, margin: 0 }}>
          Who are you<br />today?
        </h1>
      </div>
      <div style={{ display: 'flex', gap: 22, padding: '62px 32px 0', justifyContent: 'center' }}>
        {(['leo', 'soniya'] as const).map((u) => (
          <button key={u} type="button" className="profile-pick" onClick={() => pick(u)} style={{ flex: 1, textAlign: 'center', transition: 'transform .2s' }}>
            <Avatar user={u} size={132} style={{ display: 'block', margin: '0 auto' }} />
            <div className="display" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.02em', marginTop: 18 }}>{displayName[u]}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 7 }}>
              <Ember streak={streakOf(u)} size={15} />
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold-text)' }}>{streakOf(u)}</div>
            </div>
          </button>
        ))}
      </div>
      {latest && (
        <div style={{ marginTop: 'auto', padding: '0 32px calc(46px + var(--safe-bottom))', display: 'flex', alignItems: 'center', gap: 11, justifyContent: 'center' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--olive)', flex: '0 0 auto' }} />
          <div style={{ fontSize: 13.5, color: 'var(--chip-text)' }}>
            {displayName[latest.who]} finished {pronoun[latest.who].their} {routineWord(data.routines.find((r) => r.id === latest.routineId)?.name)} {relativeAgo(latest.at)}
          </div>
        </div>
      )}
    </main>
  )
}

const routineWord = (name = 'routine') => name.toLowerCase()

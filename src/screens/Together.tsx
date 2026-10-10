import { Link } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { Check } from '../components/controls'
import { Ember } from '../components/Ember'
import { Icon } from '../components/Icon'
import { flash } from '../components/Toast'
import { displayName, pronoun, useMe } from '../data/session'
import { dayProgress, myRoutines, sessionDate, togetherRun } from '../data/select'
import { useData } from '../data/store'
import type { User } from '../data/types'
import { clock, dateOf, logicalToday, relativeDay, timeOf } from '../lib/date'
import { logKey, progress } from '../lib/streak'

const C = 295 // ring circumference used by the design (r = 47)

export function Together() {
  const data = useData()
  const { me, partner, partnerName } = useMe()
  const today = logicalToday()
  const run = togetherRun(data)

  const person = (u: User) => {
    const p = dayProgress(data, u, today)
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ position: 'relative', width: 100, height: 100 }}>
          <svg width="100" height="100" viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
            <circle cx="50" cy="50" r="47" fill="none" stroke="#E4DBCC" strokeWidth="5" />
            <circle cx="50" cy="50" r="47" fill="none" stroke="#C79A4A" strokeWidth="5" strokeLinecap="round" strokeDasharray={C}
              strokeDashoffset={C - Math.round(C * (p.total ? p.done / p.total : 0))} transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset .5s ease' }} />
          </svg>
          <Avatar user={u} size={78} style={{ position: 'absolute', top: 11, left: 11 }} />
        </div>
        <div className="display" style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.02em', marginTop: 14 }}>{displayName[u]}</div>
        {/* Partners see progress only, never each other's item list. */}
        <div style={{ fontSize: 12.5, color: 'var(--muted-2)', marginTop: 2 }}>{p.done} of {p.total}</div>
      </div>
    )
  }

  const sharedTasks = data.tasks.filter((t) => t.owner === 'both' && !t.done)
  const sharedEvents = data.events.filter((e) => e.owner === 'both' && dateOf(e.start)! >= today).sort((a, b) => a.start.localeCompare(b.start))
  const sharedRoutines = myRoutines(data, me).filter((r) => r.owner === 'both')
  const rows: React.ReactNode[] = [
    ...sharedTasks.map((t) => (
      <button key={t.id} type="button" className="list-row" style={{ padding: '15px 0' }} onClick={() => data.toggleTask(t.id)}>
        <Check done={t.done} />
        <div style={{ flex: 1 }}>
          <div className="row-title">{t.title}</div>
          <div className="meta">{[t.due ? relativeDay(dateOf(t.due)!, today) : '', t.assignee ? displayName[t.assignee] : 'Both'].filter(Boolean).join(' · ')}</div>
        </div>
      </button>
    )),
    ...sharedEvents.map((e) => (
      <Link key={e.id} to={`/calendar/${dateOf(e.start)}`} className="list-row" style={{ padding: '15px 0' }}>
        <div className="spine" style={{ background: 'var(--iris)' }} />
        <div style={{ flex: 1 }}>
          <div className="row-title">{e.title}</div>
          <div className="meta">{relativeDay(dateOf(e.start)!, today)} {timeOf(e.start)}</div>
        </div>
      </Link>
    )),
    ...sharedRoutines.map((r) => {
      const d = sessionDate(r, today)
      const p = progress(r, d, data.logs[logKey(d, r.id)])
      return (
        <Link key={r.id} to={`/routines/${r.id}`} className="list-row" style={{ padding: '15px 0' }}>
          <Icon name="together" size={21} color="#A97C34" />
          <div style={{ flex: 1 }}>
            <div className="row-title">{r.name}</div>
            <div className="meta">Shared routine · {r.items.length} items</div>
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--gold-text)' }}>{p.done}/{p.total}</div>
        </Link>
      )
    }),
  ]

  const lately = data.activity.slice(0, 5)
  const encourage = () => {
    data.addActivity({ who: me, kind: 'cheer', text: `cheered ${partnerName}` })
    data.pushNotice(partner, { kind: 'partner', title: `${displayName[me]} sent you some encouragement`, meta: '' })
    flash(`Sent · ${pronoun[partner].they}’ll see it on ${pronoun[partner].their} Today`)
  }

  return (
    <main className="screen" style={{ background: 'var(--wash-together)' }}>
      <div className="pad top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="title">Together</h1>
          <div style={{ fontSize: 13.5, color: 'var(--shared-text-2)', marginTop: 3, fontWeight: 700 }}>
            {run > 0 ? `Day ${run} in a row, both of you` : 'A fresh start for both of you'}
          </div>
        </div>
        <Link to="/settings" aria-label="Settings" style={{ padding: 4, lineHeight: 0 }}><Icon name="gear" size={22} stroke={1.7} /></Link>
      </div>
      <div className="pad" style={{ paddingTop: 30, display: 'flex', gap: 28, justifyContent: 'center' }}>
        {person(me)}
        {person(partner)}
      </div>
      <div className="pad" style={{ paddingTop: 34 }}>
        <div className="label">Shared</div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 6 }}>
          {rows.length ? rows : <div style={{ padding: '14px 0', fontSize: 14, color: 'var(--muted-2)' }}>Share a task or routine with {partnerName} and it shows up here.</div>}
        </div>
      </div>
      <div className="pad" style={{ paddingTop: 26 }}>
        <div className="label">Lately</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
          {lately.map((a) => {
            const who = a.who === me ? 'You' : displayName[a.who]
            const routine = data.routines.find((r) => r.id === a.routineId)
            const when = new Date(a.at)
            const whenText = logicalToday(when) === today ? clock(when) : relativeDay(logicalToday(when), today)
            return (
              <div key={a.id} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                <Avatar user={a.who} size={26} />
                <div>
                  {a.kind === 'streak' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, lineHeight: 1.5, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800 }}>{who}</span> reached<Ember streak={a.value ?? 1} size={14} plain /><span style={{ fontWeight: 800 }}>{a.value}</span> on {routine?.name ?? 'a routine'}
                    </div>
                  ) : (
                    <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 800 }}>{who}</span> {a.who === me ? a.text.replace(/\b(his|her)\b/, 'your') : a.text}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: 'var(--muted-3)', marginTop: 2 }}>
                    {whenText}{a.cheeredBy ? ` · ${a.cheeredBy === me ? 'You' : displayName[a.cheeredBy]} cheered` : ''}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <button type="button" className="btn btn-ink" style={{ marginTop: 22, width: '100%', fontSize: 14 }} onClick={encourage}>Send encouragement</button>
      </div>
    </main>
  )
}

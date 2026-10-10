import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { NotifyPrompt } from '../components/NotifyPrompt'
import { flash } from '../components/Toast'
import { useMe } from '../data/session'
import { nowRoutine, routinesOn } from '../data/select'
import { useData } from '../data/store'
import type { Notice } from '../data/types'
import { clock, logicalToday, minutesOf, nowMinutes, relativeDay } from '../lib/date'
import { itemsOn } from '../lib/streak'

const DOT: Record<Notice['kind'], string> = { routine: '#C79A4A', deadline: '#B4674A', partner: '#C79A4A', catchup: '#C79A4A' }

export function Notifications() {
  const data = useData()
  const { me } = useMe()
  const navigate = useNavigate()
  const today = logicalToday()
  const inbox = data.inbox[me] ?? []
  const markInboxRead = data.markInboxRead

  // Everything counts as read once you've left the inbox.
  useEffect(() => () => markInboxRead(me), [markInboxRead, me])

  const when = (n: Notice) => {
    const d = new Date(n.at)
    const day = logicalToday(d)
    return day === today ? clock(d) : `${relativeDay(day, today)} ${clock(d)}`
  }
  const todayList = inbox.filter((n) => logicalToday(new Date(n.at)) === today)
  const earlier = inbox.filter((n) => logicalToday(new Date(n.at)) !== today)

  const snooze = (n: Notice) => {
    const until = new Date(Date.now() + 2 * 3600000)
    if (n.taskId) data.updateTask(n.taskId, { remindAt: `${logicalToday(until)}T${clock(until).padStart(5, '0')}` })
    useData.setState((s) => ({ inbox: { ...s.inbox, [me]: s.inbox[me].map((x) => (x.id === n.id ? { ...x, read: true } : x)) } }))
    flash(`Snoozed until ${clock(until)}`)
  }

  const row = (n: Notice, last: boolean) => (
    <div key={n.id} style={{ display: 'flex', gap: 13, padding: '16px 0', borderBottom: last ? undefined : '1px solid var(--divider)', opacity: n.read ? 0.6 : 1 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.read ? '#DDD3C3' : DOT[n.kind], marginTop: 6, flex: '0 0 auto' }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700 }}>{n.title}</div>
        <div style={{ fontSize: 12.5, color: n.read ? 'var(--muted-3)' : 'var(--muted-2)', marginTop: 3 }}>{[when(n), n.meta].filter(Boolean).join(' · ')}</div>
        {n.kind === 'deadline' && !n.read && (
          <div style={{ display: 'flex', gap: 7, marginTop: 11 }}>
            <button type="button" className="chip soft" style={{ fontSize: 12, padding: '8px 13px' }} onClick={() => navigate('/tasks')}>Start now</button>
            <button type="button" className="chip soft" style={{ fontSize: 12, padding: '8px 13px' }} onClick={() => snooze(n)}>Snooze 2h</button>
          </div>
        )}
      </div>
    </div>
  )

  // Lock-screen preview: the next routine reminder, as it would arrive.
  const upcoming = routinesOn(data, me, today).find((r) => minutesOf(r.time) > nowMinutes()) ?? nowRoutine(data, me)?.routine
  const preview = upcoming
    ? { title: `${upcoming.name} starts in 10 minutes`, body: itemsOn(upcoming, today).map((i, k) => (k ? i.name.toLowerCase() : i.name)).join(', ') }
    : null

  return (
    <main className="screen">
      <div className="pad top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="title-30">Notifications</h1>
        <Link to="/notifications/settings" style={{ fontSize: 13, fontWeight: 800, color: 'var(--gold-text)' }}>Settings</Link>
      </div>
      <div className="pad"><NotifyPrompt /></div>
      <div className="pad" style={{ paddingTop: 22, display: 'flex', flexDirection: 'column' }}>
        <div className="label">Today</div>
        {todayList.length === 0 && <div style={{ padding: '16px 0', fontSize: 14, color: 'var(--muted-2)' }}>Nothing yet today.</div>}
        {todayList.map((n, i) => row(n, i === todayList.length - 1 && earlier.length === 0))}
        {earlier.map((n, i) => row(n, i === earlier.length - 1))}
      </div>
      {preview && (
        <div className="pad" style={{ paddingTop: 28 }}>
          <div className="label" style={{ marginBottom: 14 }}>On the lock screen</div>
          <div style={{ borderRadius: 22, padding: '16px 17px', background: 'var(--ink)', color: 'var(--paper)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <svg width="18" height="18" viewBox="0 0 36 36" aria-hidden="true"><rect width="36" height="36" rx="11" fill="#C79A4A" /><path d="M18 9c3.9 4 6.8 7.3 6.8 11.3A6.8 6.8 0 0 1 18 27a6.8 6.8 0 0 1-6.8-6.7c0-4 2.9-7.3 6.8-11.3Z" fill="#231A08" /></svg>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--glyph-close)', letterSpacing: '.04em' }}>AURELIO · now</div>
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 800, marginTop: 9 }}>{preview.title}</div>
            <div style={{ fontSize: 13, color: 'var(--glyph-close)', marginTop: 3, lineHeight: 1.45 }}>{preview.body}</div>
          </div>
        </div>
      )}
    </main>
  )
}

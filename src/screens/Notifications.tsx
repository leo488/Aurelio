import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { NotifyPrompt } from '../components/NotifyPrompt'
import { flash } from '../components/Toast'
import { useMe } from '../data/session'
import { routinesOn, routineTime, tasksOn } from '../data/select'
import { useData } from '../data/store'
import type { AppNotification } from '../data/types'
import { clock, dt, hhmm, logicalToday, minutesOf, nowMinutes, relativeDay } from '../lib/date'
import { stepsOn } from '../lib/streak'

const DOT: Record<AppNotification['kind'], string> = { routine: 'var(--gold)', task: 'var(--gold)', deadline: 'var(--clay)', partner: 'var(--gold)', nudge: 'var(--iris)', catchup: 'var(--gold)' }

export function Notifications() {
  const data = useData()
  const { me } = useMe()
  const navigate = useNavigate()
  const today = logicalToday()
  const now = new Date().toISOString()
  const inbox = data.notifications.filter((n) => n.status !== 'scheduled' || n.scheduledFor <= now)
  const markAllRead = data.markAllRead

  // Everything counts as read once you've left the inbox.
  useEffect(() => () => markAllRead(), [markAllRead])

  const when = (n: AppNotification) => {
    const d = new Date(n.scheduledFor)
    const day = logicalToday(d)
    return day === today ? clock(d) : `${relativeDay(day, today)} ${clock(d)}`
  }
  const todayList = inbox.filter((n) => logicalToday(new Date(n.scheduledFor)) === today)
  const earlier = inbox.filter((n) => logicalToday(new Date(n.scheduledFor)) !== today)

  const snooze = (n: AppNotification) => {
    const until = new Date(Date.now() + 2 * 3600000)
    if (n.refId) data.updateTask(n.refId, { reminderAt: dt(logicalToday(until), hhmm(until.getHours() * 60 + until.getMinutes())) })
    data.setNotificationStatus(n.id, 'read')
    flash(`Snoozed until ${clock(until)}`)
  }

  const open = (n: AppNotification) => {
    data.setNotificationStatus(n.id, 'read')
    if (n.refType === 'routine' && n.refId) navigate(`/routines/${n.refId}`)
    else if (n.refType === 'task' && n.refId) navigate(`/tasks/${n.refId}`)
    else if (n.kind === 'partner' || n.kind === 'nudge') navigate('/together')
  }

  const row = (n: AppNotification, last: boolean) => {
    const read = n.status === 'read'
    return (
      <div key={n.id} style={{ display: 'flex', gap: 13, padding: '16px 0', borderBottom: last ? undefined : '1px solid var(--divider)', opacity: read ? 0.6 : 1 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: read ? 'var(--dot-read)' : DOT[n.kind], marginTop: 6, flex: '0 0 auto' }} />
        <button type="button" style={{ flex: 1, textAlign: 'left' }} onClick={() => open(n)}>
          <div style={{ fontSize: 14.5, fontWeight: 700 }}>{n.title}</div>
          <div style={{ fontSize: 12.5, color: read ? 'var(--muted-3)' : 'var(--muted-2)', marginTop: 3 }}>{[when(n), n.body].filter(Boolean).join(' · ')}</div>
        </button>
        {(n.kind === 'deadline' || n.kind === 'task') && !read && n.refId && (
          <button type="button" className="chip soft" style={{ fontSize: 12, padding: '8px 13px', alignSelf: 'center' }} onClick={() => snooze(n)}>Snooze 2h</button>
        )}
      </div>
    )
  }

  // Lock-screen preview: the next reminder, as it would arrive.
  const preview = me.role === 'leo'
    ? (() => {
        const r = routinesOn(data, today).find((x) => x.reminder.enabled && x.scheduledTime && minutesOf(routineTime(x)) > nowMinutes())
        return r ? { title: `${r.name} starts in ${r.reminder.minutesBefore} minutes`, body: stepsOn(r, today).map((s, k) => (k ? s.title.toLowerCase() : s.title)).join(', ') } : null
      })()
    : (() => {
        const t = tasksOn(data, today).find((x) => !x.completed && x.reminderAt && x.reminderAt > dt(today, hhmm(nowMinutes())))
        return t ? { title: t.startTime ? `${t.title} at ${t.startTime}` : t.title, body: t.notes ?? 'Tap to open your day' } : null
      })()

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
        {earlier.length > 0 && <div className="label" style={{ marginTop: 18 }}>Earlier</div>}
        {earlier.map((n, i) => row(n, i === earlier.length - 1))}
      </div>
      {preview && (
        <div className="pad" style={{ paddingTop: 28 }}>
          <div className="label" style={{ marginBottom: 14 }}>Next on the lock screen</div>
          <div style={{ borderRadius: 22, padding: '16px 17px', background: 'var(--ink)', color: 'var(--paper)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <svg width="18" height="18" viewBox="0 0 36 36" aria-hidden="true"><rect width="36" height="36" rx="11" fill="var(--gold)" /><path d="M18 9c3.9 4 6.8 7.3 6.8 11.3A6.8 6.8 0 0 1 18 27a6.8 6.8 0 0 1-6.8-6.7c0-4 2.9-7.3 6.8-11.3Z" fill="var(--on-gold)" /></svg>
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

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppMark } from '../components/AppMark'
import { flash } from '../components/Toast'
import { Label, TaskSheet } from '../components/ui'
import { useMe } from '../data/session'
import { routinesOn, routineTime, tasksOn } from '../data/select'
import { useData } from '../data/store'
import type { AppNotification } from '../data/types'
import { clock, dt, hhmm, logicalToday, minutesOf, nowMinutes, relativeDay } from '../lib/date'
import { stepsOn } from '../lib/streak'

const DOT: Record<AppNotification['kind'], string> = { routine: 'var(--gold)', task: 'var(--gold)', deadline: 'var(--clay)', partner: 'var(--gold-text)', nudge: 'var(--gold-text)', catchup: 'var(--gold)' }
const KIND: Record<AppNotification['kind'], string> = { routine: 'Routine reminder', task: 'Task reminder', deadline: 'Deadline', catchup: 'Streak at risk', partner: '', nudge: '' }

export function Notifications() {
  const data = useData()
  const { me, partnerName } = useMe()
  const navigate = useNavigate()
  const [open, setOpen] = useState<string | null>(null)
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
  const read = (n: AppNotification) => data.setNotificationStatus(n.id, 'read')
  const snooze = (n: AppNotification, minutes: number) => {
    const until = new Date(Date.now() + minutes * 60000)
    if (n.refType === 'task' && n.refId) data.updateTask(n.refId, { reminderAt: dt(logicalToday(until), hhmm(until.getHours() * 60 + until.getMinutes())) })
    read(n)
    flash(`Snoozed until ${clock(until)}`)
  }
  const actions = (n: AppNotification): [string, () => void][] => {
    if (n.status === 'read' || !n.refId) return []
    const task = n.refType === 'task' ? data.tasks.find((t) => t.id === n.refId) : undefined
    if (n.refType === 'routine') return [['Start', () => { read(n); navigate(`/run?r=${n.refId}`) }], ['Snooze 1h', () => snooze(n, 60)]]
    if (task && !task.completed && task.date && task.date < today) return [['Move to today', () => { data.updateTask(task.id, { date: today }); read(n); flash('Moved to today') }]]
    if (task && !task.completed) return [['Open', () => { read(n); setOpen(task.id) }], ['Snooze 30m', () => snooze(n, 30)]]
    return []
  }
  const from = (n: AppNotification) => (n.kind === 'nudge' || n.kind === 'partner' ? `From ${partnerName}` : KIND[n.kind])

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
        <h1 className="display" style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.03em', margin: 0 }}>Notifications</h1>
        <button type="button" onClick={() => navigate('/notifications/settings')} style={{ fontSize: 13, fontWeight: 800, color: 'var(--gold-text)' }}>Settings</button>
      </div>
      <div className="pad" style={{ paddingTop: 16, display: 'flex', flexDirection: 'column' }}>
        {inbox.length === 0 && <div style={{ padding: '16px 0', fontSize: 14, color: 'var(--muted-2)' }}>Nothing yet. Reminders and anything from {partnerName} land here.</div>}
        {inbox.map((n) => {
          const isRead = n.status === 'read'
          const acts = actions(n)
          return (
            <div key={n.id} style={{ display: 'flex', gap: 13, padding: '16px 0', borderBottom: '1px solid var(--divider)', opacity: isRead ? 0.6 : 1 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 6, flex: '0 0 auto', background: isRead ? 'var(--dot-read)' : DOT[n.kind] }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.4 }}>{n.kind === 'nudge' ? `${partnerName} sent a reminder: “${n.title}”` : n.title}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted-2)', marginTop: 3 }}>{[when(n), n.body && n.kind !== 'nudge' ? n.body : from(n)].filter(Boolean).join(' · ')}</div>
                {acts.length > 0 && (
                  <div style={{ display: 'flex', gap: 7, marginTop: 11 }}>
                    {acts.map(([label, run]) => (
                      <button key={label} type="button" onClick={run} style={{ padding: '8px 13px', borderRadius: 99, background: 'var(--chip-alt)', fontSize: 12, fontWeight: 700, color: 'var(--chip-suggest-text)' }}>{label}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {preview && (
        <div className="pad" style={{ paddingTop: 28 }}>
          <Label style={{ marginBottom: 14 }}>On the lock screen</Label>
          <div style={{ borderRadius: 14, padding: '16px 17px', background: 'var(--ink)', color: 'var(--paper)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <AppMark size={18} />
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--glyph-close)', letterSpacing: '.04em' }}>AURELIO · now</div>
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 800, marginTop: 9 }}>{preview.title}</div>
            <div style={{ fontSize: 13, color: 'var(--glyph-close)', marginTop: 3, lineHeight: 1.45 }}>{preview.body}</div>
          </div>
        </div>
      )}
      <TaskSheet taskId={open} onClose={() => setOpen(null)} />
    </main>
  )
}

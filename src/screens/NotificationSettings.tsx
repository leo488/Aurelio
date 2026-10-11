import { useNavigate } from 'react-router-dom'
import { BackButton, Row, Toggle } from '../components/controls'
import { NotifyPrompt } from '../components/NotifyPrompt'
import { useMe } from '../data/session'
import { useData } from '../data/store'
import type { Settings } from '../data/types'
import { looseTime } from '../lib/date'
import { notificationsSupported } from '../lib/reminders'

export function NotificationSettings() {
  const data = useData()
  const { me, partnerName } = useMe()
  const navigate = useNavigate()
  const s = data.settings!
  const week = data.notifications.filter((n) => n.status !== 'scheduled' && Date.now() - Date.parse(n.scheduledFor) < 7 * 86400000)
  const opened = week.filter((n) => n.status === 'read').length
  const set = (notif: Partial<Settings['notif']>) => data.updateSettings({ notif: { ...s.notif, ...notif } })
  const q = s.notif.quiet
  const supported = notificationsSupported()

  return (
    <main className="screen">
      <div className="pad top-12" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <BackButton onClick={() => navigate('/notifications')} />
        <div style={{ fontSize: 15, fontWeight: 800 }}>Notifications</div>
      </div>
      <div className="pad" style={{ paddingTop: 26 }}>
        <div className="label">This week</div>
        <div className="display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.028em', marginTop: 8 }}>{week.length} sent · {opened} opened</div>
        <div style={{ fontSize: 13, color: 'var(--muted-1)', marginTop: 8, lineHeight: 1.6 }}>
          {supported ? 'Reminders arrive while Aurelio is open or recently used. Everything also lands in your inbox.' : 'This browser can’t show notifications, so reminders appear in your inbox instead.'}
        </div>
        <NotifyPrompt />
      </div>
      <div className="pad" style={{ paddingTop: 26, display: 'flex', flexDirection: 'column' }}>
        <div className="label" style={{ marginBottom: 6 }}>Types</div>
        {me.role === 'leo'
          ? <Row title="Routine reminders" sub="Before each routine starts, set per routine" right={<Toggle label="Routine reminders" on={s.notif.reminders} onChange={(v) => set({ reminders: v })} />} />
          : <Row title="Task reminders" sub="At the time you set on each task" right={<Toggle label="Task reminders" on={s.notif.reminders} onChange={(v) => set({ reminders: v })} />} />}
        <Row title="Deadlines" sub="2 days before, then the morning of" right={<Toggle label="Deadlines" on={s.notif.deadlines} onChange={(v) => set({ deadlines: v })} />} />
        <Row title={`From ${partnerName}`} sub="Reminders and encouragement" right={<Toggle label={`From ${partnerName}`} on={s.notif.partner} onChange={(v) => set({ partner: v })} />} />
        <Row
          title="Quiet hours"
          sub={
            <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
              <label style={{ position: 'relative' }}>{looseTime(q.from)}<input type="time" aria-label="Quiet from" value={q.from} onChange={(e) => e.target.value && set({ quiet: { ...q, from: e.target.value } })} style={{ position: 'absolute', inset: 0, opacity: 0 }} /></label>
              →
              <label style={{ position: 'relative' }}>{looseTime(q.to)}<input type="time" aria-label="Quiet until" value={q.to} onChange={(e) => e.target.value && set({ quiet: { ...q, to: e.target.value } })} style={{ position: 'absolute', inset: 0, opacity: 0 }} /></label>
            </span>
          }
          right={<Toggle label="Quiet hours" on={q.on} onChange={(v) => set({ quiet: { ...q, on: v } })} />}
        />
        <div style={{ fontSize: 12.5, color: 'var(--muted-2)', lineHeight: 1.6, marginTop: 16 }}>
          Nothing pops up in the quiet window. Deadline warnings wait for the morning rather than being dropped.
        </div>
      </div>
    </main>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Toggle } from '../components/controls'
import { flash } from '../components/Toast'
import { useMe } from '../data/session'
import { useData } from '../data/store'
import type { Settings } from '../data/types'
import { isIOS, isStandalone } from '../lib/install'
import { notificationsSupported } from '../lib/reminders'

type Perm = 'default' | 'granted' | 'denied'
const NOT_NOW = 'aurelio-notify-not-now'

/** Reminder settings: the device permission first, then what each person gets reminded about. */
export function NotificationSettings() {
  const data = useData()
  const { me, partnerName } = useMe()
  const navigate = useNavigate()
  const s = data.settings!
  const set = (notif: Partial<Settings['notif']>) => data.updateSettings({ notif: { ...s.notif, ...notif } })
  const q = s.notif.quiet
  const supported = notificationsSupported() && !(isIOS() && !isStandalone())
  const [perm, setPerm] = useState<Perm>(() => {
    if (!supported) return 'denied'
    if (Notification.permission !== 'default') return Notification.permission as Perm
    try { return sessionStorage.getItem(NOT_NOW) ? 'denied' : 'default' } catch { return 'default' }
  })

  const allow = async () => {
    const p = (await Notification.requestPermission()) as Perm
    setPerm(p)
    if (p === 'granted') flash('Notifications on')
  }
  const notNow = () => {
    try { sessionStorage.setItem(NOT_NOW, '1') } catch { /* fine */ }
    setPerm('denied')
  }
  const tryAgain = () => {
    try { sessionStorage.removeItem(NOT_NOW) } catch { /* fine */ }
    setPerm(supported ? (Notification.permission as Perm) : 'denied')
    if (!supported || Notification.permission === 'denied') flash(isIOS() && !isStandalone() ? 'Add Aurelio to your Home Screen first' : 'Allow notifications for this site in your browser settings')
  }

  const rows: [string, string, boolean, (v: boolean) => void][] = me.role === 'leo'
    ? [
        ['Routine start', 'Before each routine, as set on the routine', s.notif.reminders, (v) => set({ reminders: v })],
        ['Streak at risk', 'Once, at 20:00, if a routine is still open', s.notif.deadlines, (v) => set({ deadlines: v })],
        [`From ${partnerName}`, 'Reminders and cheers', s.notif.partner, (v) => set({ partner: v })],
      ]
    : [
        ['Task reminders', 'At the time you set on each task', s.notif.reminders, (v) => set({ reminders: v })],
        ['Morning summary', '08:00 · today’s plan and anything overdue', s.notif.summary !== false, (v) => set({ summary: v })],
        ['Overdue tasks', 'Once a day, never repeated', s.notif.deadlines, (v) => set({ deadlines: v })],
        [`From ${partnerName}`, 'Reminders and cheers', s.notif.partner, (v) => set({ partner: v })],
      ]

  return (
    <main className="screen">
      <div className="pad top-12" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button type="button" aria-label="Back" onClick={() => navigate('/profile')} style={{ fontSize: 20, lineHeight: 1, color: 'var(--ink)' }}>‹</button>
        <div style={{ fontSize: 15, fontWeight: 800 }}>Reminder settings</div>
      </div>
      <div className="pad" style={{ paddingTop: 22 }}>
        {perm === 'default' && (
          <div style={{ padding: 18, borderRadius: 20, background: 'var(--chip-alt-2)' }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Turn on notifications</div>
            <div style={{ fontSize: 13, color: 'var(--chip-text)', lineHeight: 1.55, marginTop: 5 }}>Your phone asks once. Reminders still show in the inbox if you say no.</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button type="button" onClick={() => void allow()} style={{ background: 'var(--ink)', color: 'var(--paper)', fontSize: 13, fontWeight: 800, padding: '10px 16px', borderRadius: 14 }}>Allow</button>
              <button type="button" onClick={notNow} style={{ background: 'var(--white)', color: 'var(--chip-suggest-text)', fontSize: 13, fontWeight: 800, padding: '10px 16px', borderRadius: 14 }}>Not now</button>
            </div>
          </div>
        )}
        {perm === 'granted' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 18, background: 'var(--ok-soft)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--olive)' }} />
            <div style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: 'var(--ok-text)' }}>Notifications are on for this device</div>
          </div>
        )}
        {perm === 'denied' && (
          <div style={{ padding: '16px 18px', borderRadius: 20, background: 'var(--clay-badge)' }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--clay-strong)' }}>Notifications are off</div>
            <div style={{ fontSize: 13, color: 'var(--clay-strong)', lineHeight: 1.55, marginTop: 5 }}>Blocked or not supported in this browser. Reminders still appear in your inbox. On iPhone, add Aurelio to your Home Screen first.</div>
            <button type="button" onClick={tryAgain} style={{ marginTop: 12, background: 'var(--white)', color: 'var(--clay-strong)', fontSize: 12.5, fontWeight: 800, padding: '9px 14px', borderRadius: 12 }}>Try again</button>
          </div>
        )}
      </div>
      <div className="pad" style={{ paddingTop: 20, display: 'flex', flexDirection: 'column' }}>
        {rows.map(([title, meta, on, change]) => (
          <div key={title} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: '15px 0', borderBottom: '1px solid var(--divider)' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
              <div style={{ fontSize: 12, color: 'var(--muted-2)', marginTop: 2 }}>{meta}</div>
            </div>
            <Toggle label={title} on={on} onChange={change} />
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: '15px 0', borderBottom: '1px solid var(--divider)' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Quiet hours</div>
            <div style={{ fontSize: 12, color: 'var(--muted-2)', marginTop: 2, display: 'flex', gap: 4, alignItems: 'center' }}>
              <label style={{ position: 'relative' }}>{q.from}<input type="time" aria-label="Quiet from" value={q.from} onChange={(e) => e.target.value && set({ quiet: { ...q, from: e.target.value } })} style={{ position: 'absolute', inset: 0, opacity: 0 }} /></label>
              →
              <label style={{ position: 'relative' }}>{q.to}<input type="time" aria-label="Quiet until" value={q.to} onChange={(e) => e.target.value && set({ quiet: { ...q, to: e.target.value } })} style={{ position: 'absolute', inset: 0, opacity: 0 }} /></label>
            </div>
          </div>
          <Toggle label="Quiet hours" on={q.on} onChange={(v) => set({ quiet: { ...q, on: v } })} />
        </div>
      </div>
    </main>
  )
}

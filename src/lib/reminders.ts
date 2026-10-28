import { useEffect } from 'react'
import { useData } from '../data/store'
import type { AppNotification, User } from '../data/types'
import { addDays, logicalToday, minutesOf, nowMinutes, toDate } from './date'
import { promptFor } from './journalPrompts'
import { checkedSet, dayScore } from './track'

// Reminders are worked out from the records themselves (a routine's reminder settings, a task's
// reminder time), so editing or deleting the record is all it takes to change them. When one is
// due it is written to the notifications collection, then shown with the Notifications API if the
// browser has it and permission was given. Without that, the in-app inbox still has it.

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window

const inQuiet = (mins: number, from: string, to: string) => {
  const a = minutesOf(from)
  const b = minutesOf(to)
  return a <= b ? mins >= a && mins < b : mins >= a || mins < b
}

async function show(title: string, body: string | undefined, tag: string) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) await reg.showNotification(title, { body, tag, icon: `${import.meta.env.BASE_URL}icons/icon-192.png`, badge: `${import.meta.env.BASE_URL}icons/icon-192.png` })
    else new Notification(title, { body, tag, icon: `${import.meta.env.BASE_URL}icons/icon-192.png` })
  } catch {
    /* the inbox still has it */
  }
}

export function checkReminders(user: User, now = new Date()) {
  const s = useData.getState()
  const settings = s.settings
  if (!settings || s.me?.id !== user.id) return
  const today = logicalToday(now)
  const mins = nowMinutes(now)
  const quiet = settings.notif.quiet.on && inQuiet(mins, settings.notif.quiet.from, settings.notif.quiet.to)

  const fire = (key: string, n: Omit<AppNotification, 'id' | 'userId' | 'status' | 'createdAt' | 'scheduledFor'>) => {
    const id = `${user.id}|${key}`
    const st = useData.getState()
    if (st.sent[id] || st.notifications.some((x) => x.id === id)) return
    st.markSent(id)
    st.notify({ ...n, id })
    void show(n.title, n.body, id)
  }

  // Nudges and encouragement the other person sent, once their time comes.
  for (const n of s.notifications) {
    if (n.status !== 'scheduled' || new Date(n.scheduledFor) > now) continue
    s.setNotificationStatus(n.id, 'sent')
    if (settings.notif.partner && !quiet) void show(n.title, n.body, `${n.id}|partner`)
  }

  if (quiet) return

  if (user.role === 'leo') {
    // The evening check-in, once at 20:00, while today's list is still open; then today's question.
    const day = dayScore(s.trackItems, checkedSet(Object.values(s.trackChecks)), today)
    const left = day.total - day.done
    if (settings.notif.deadlines && mins >= 20 * 60 && left > 0) {
      fire(`catchup|${today}`, { kind: 'catchup', title: `${left} left on today’s list`, body: `${user.name}, any tick counts.` })
    }
    if (settings.notif.reminders && mins >= 21 * 60 + 30 && !s.journal.some((e) => e.date === today && e.body.trim())) {
      fire(`journal|${today}`, { kind: 'catchup', title: 'Today’s question', body: promptFor(today) })
    }
  }

  // Soniya's morning summary: today's plan and anything overdue.
  if (user.role === 'sonia' && settings.notif.summary !== false && mins >= 8 * 60 && mins < 12 * 60) {
    const planned = s.tasks.filter((t) => t.date === today && !t.completed).length
    const overdue = s.tasks.filter((t) => !t.completed && t.date && t.date < today).length
    if (planned || overdue) {
      fire(`summary|${today}`, {
        kind: 'task', title: planned ? `${planned} task${planned === 1 ? '' : 's'} planned today` : 'Nothing planned today yet',
        body: overdue ? `${overdue} overdue · Morning summary` : 'Morning summary',
      })
    }
  }

  // Task reminders and deadline warnings (anyone with tasks; in practice Soniya).
  for (const t of s.tasks) {
    if (t.completed) continue
    if (settings.notif.reminders && t.reminderAt && t.reminderAt.slice(0, 10) <= today && toDate(t.reminderAt) <= now && t.reminderAt.slice(0, 10) >= addDays(today, -1)) {
      fire(`task|${t.id}|${t.reminderAt}`, {
        kind: 'task', title: t.startTime && t.date === today ? `${t.title} at ${t.startTime}` : t.title,
        body: t.notes ?? 'Tap to open your day', refType: 'task', refId: t.id,
      })
    }
    if (settings.notif.deadlines && t.date && t.date < today && mins >= 8 * 60) {
      fire(`overdue|${t.id}|${t.date}`, { kind: 'deadline', title: `${t.title} is overdue`, body: 'Morning summary', refType: 'task', refId: t.id })
    }
    if (settings.notif.deadlines && t.deadline && t.date && mins >= 9 * 60) {
      for (const [d, label] of [[addDays(t.date, -2), 'is due in two days'], [t.date, 'is due today']] as const) {
        if (d === today) fire(`deadline|${t.id}|${d}`, { kind: 'deadline', title: `${t.title} ${label}`, refType: 'task', refId: t.id })
      }
    }
  }
}

export function useReminders(user: User | null) {
  useEffect(() => {
    if (!user) return
    const tick = () => {
      void useData.getState().refreshShared().then(() => checkReminders(user))
    }
    checkReminders(user)
    const t = setInterval(tick, 60000)
    const onVisible = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [user])
}

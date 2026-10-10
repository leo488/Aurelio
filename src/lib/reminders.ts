import { useEffect } from 'react'
import { displayName } from '../data/session'
import { dayProgress, myTasks, routinesOn } from '../data/select'
import { useData } from '../data/store'
import type { NoticeKind, User } from '../data/types'
import { addDays, logicalToday, minutesOf, nowMinutes, timeOf } from './date'
import { itemsOn } from './streak'

const inQuiet = (mins: number, from: string, to: string) => {
  const a = minutesOf(from)
  const b = minutesOf(to)
  return a <= b ? mins >= a && mins < b : mins >= a || mins < b
}

async function show(title: string, body: string, tag: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) await reg.showNotification(title, { body, tag, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' })
    else new Notification(title, { body, tag, icon: '/icons/icon-192.png' })
  } catch {
    /* the inbox still has it */
  }
}

/**
 * While the app is open (or kept alive by the OS), check once a minute for routine starts,
 * deadline warnings and the evening catch-up. Each one is sent once, logged to the inbox,
 * and held back during quiet hours (deadline warnings wait for the morning instead).
 */
export function checkReminders(user: User, now = new Date()) {
  const s = useData.getState()
  const settings = s.settings[user]
  const today = logicalToday(now)
  const mins = nowMinutes(now)
  const quiet = settings.notif.quiet.on && inQuiet(mins, settings.notif.quiet.from, settings.notif.quiet.to)
  if (quiet) return

  const send = (key: string, kind: NoticeKind, title: string, meta: string, body: string, taskId?: string) => {
    const k = `${user}|${key}`
    if (useData.getState().sent[k]) return
    useData.getState().markSent(k)
    useData.getState().pushNotice(user, { kind, title, meta, taskId })
    void show(title, body, k)
  }

  if (settings.notif.routineStart) {
    for (const r of routinesOn(s, user, today)) {
      if (!r.remind || r.owner !== user) continue
      const start = minutesOf(r.time)
      if (mins >= start - 10 && mins < start) {
        send(`routine|${r.id}|${today}`, 'routine', `${r.name} starts in ${start - mins} minutes`, 'Routine reminder', itemsOn(r, today).map((i) => i.name).join(', '))
      }
    }
  }

  if (settings.notif.deadlines) {
    for (const t of myTasks(s, user)) {
      if (t.done || !t.due) continue
      const due = t.due.slice(0, 10)
      if (t.isDeadline) {
        // Two days out, then the morning of, both at 9:00 (or the first non-quiet minute after).
        for (const [d, label] of [[addDays(due, -2), 'is due in two days'], [due, 'is due tonight']] as const) {
          if (d === today && mins >= 9 * 60) send(`deadline|${t.id}|${d}`, 'deadline', `${t.title} ${label}`, 'Deadline warning', `Due ${timeOf(t.due) ?? 'today'}`, t.id)
        }
      }
      if (t.remindAt && t.remindAt.slice(0, 10) === today && mins >= minutesOf(timeOf(t.remindAt) ?? '09:00')) {
        send(`remind|${t.id}|${t.remindAt}`, 'deadline', t.title, 'Reminder', t.notes ?? 'Tap to open your tasks', t.id)
      }
    }
  }

  // Evening catch-up at 20:00 when routine items are still open.
  const p = dayProgress(s, user, today)
  const left = p.total - p.done
  if (mins >= 20 * 60 && left > 0 && left <= 6) {
    send(`catchup|${today}`, 'catchup', `${left} item${left === 1 ? '' : 's'} left before bed`, 'Catch-up', `${displayName[user]}, there’s still time.`)
  }
}

export function useReminders(user: User | null) {
  useEffect(() => {
    if (!user) return
    checkReminders(user)
    const t = setInterval(() => checkReminders(user), 60000)
    return () => clearInterval(t)
  }, [user])
}

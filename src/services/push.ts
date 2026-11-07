import { useEffect } from 'react'
import { useSupabase } from '../config'
import { useData } from '../data/store'
import type { User } from '../data/types'
import { plannedPushes } from '../lib/pushSchedule'

// Push notifications that arrive while the app is closed (database mode only). This device's push
// subscription is saved for the signed-in person, and the next week of their reminders is kept in
// scheduled_pushes; the server sends each one when it is due.

const supabase = async () => (useSupabase ? (await import('./supabase/supabaseBackend')).getSupabase() : null)

export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && useSupabase

const urlBase64ToUint8Array = (b64: string) => {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}

/** Subscribe this device (once permission is granted) and store the subscription. Safe to call often. */
export async function registerPush(user: User): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== 'granted') return false
  const sb = await supabase()
  if (!sb) return false
  try {
    const { data } = await sb.from('app_config').select('value').eq('key', 'vapid_public_key').maybeSingle()
    const key = data?.value as string | undefined
    if (!key) return false
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    // A subscription made with an older server key can't receive pushes; replace it.
    const current = sub?.options.applicationServerKey
    if (sub && current && btoa(String.fromCharCode(...new Uint8Array(current))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') !== key.replace(/=+$/, '')) {
      await sub.unsubscribe()
      sub = null
    }
    sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) })
    const j = sub.toJSON()
    if (!j.endpoint || !j.keys?.p256dh || !j.keys.auth) return false
    const { error } = await sb.from('push_subscriptions').upsert({ endpoint: j.endpoint, user_id: user.id, p256dh: j.keys.p256dh, auth: j.keys.auth })
    return !error
  } catch {
    return false
  }
}

/** Replace this person's upcoming (unsent) reminders with the current plan. */
export async function syncPushes(user: User) {
  const sb = await supabase()
  if (!sb) return
  const s = useData.getState()
  if (s.me?.id !== user.id) return
  const rows = plannedPushes(s, user).map((p) => ({
    user_id: user.id, key: p.key, fire_at: p.fireAt.toISOString(), title: p.title, body: p.body ?? null, url: p.url,
  }))
  // Nudges from the other person (keys ending in |partner) are queued by the database; leave them.
  const del = await sb.from('scheduled_pushes').delete().eq('user_id', user.id).is('sent_at', null).not('key', 'like', '%|partner')
  if (del.error) return
  if (rows.length) await sb.from('scheduled_pushes').upsert(rows, { onConflict: 'user_id,key', ignoreDuplicates: true })
}

/** Keeps the push schedule in step with the data: on sign-in and a moment after anything changes. */
export function usePushSync(user: User | null) {
  const trackItems = useData((s) => s.trackItems)
  const trackChecks = useData((s) => s.trackChecks)
  const journal = useData((s) => s.journal)
  const tasks = useData((s) => s.tasks)
  const settings = useData((s) => s.settings)
  const ready = useData((s) => s.status === 'ready')
  useEffect(() => {
    if (!user || !ready || !useSupabase) return
    void registerPush(user)
  }, [user, ready])
  useEffect(() => {
    if (!user || !ready || !useSupabase) return
    const t = setTimeout(() => void syncPushes(user), 1500)
    return () => clearTimeout(t)
  }, [user, ready, trackItems, trackChecks, journal, tasks, settings])
}

// Sends the reminders that are due. Called every minute by pg_cron (see the deploy workflow) with
// the x-cron-secret header; nothing else can trigger it.
import webpush from 'npm:web-push@3.6.7'
import { admin, json } from '../_shared/common.ts'

const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:aurelio@example.com'

/** Reminders older than this are dropped rather than sent late. */
const STALE_MS = 2 * 3600_000

Deno.serve(async (req) => {
  if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) return json({ error: 'forbidden' }, 403)
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return json({ error: 'not-configured' }, 500)
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

  const db = admin()
  const now = Date.now()
  const { data: due, error } = await db.from('scheduled_pushes').select('user_id, key, fire_at, title, body, url')
    .is('sent_at', null).lte('fire_at', new Date(now).toISOString()).order('fire_at').limit(200)
  if (error) return json({ error: error.message }, 500)
  if (!due?.length) return json({ sent: 0 })

  const users = [...new Set(due.map((d) => d.user_id as string))]
  const { data: subs } = await db.from('push_subscriptions').select('endpoint, user_id, p256dh, auth').in('user_id', users)

  let sent = 0
  const gone: string[] = []
  for (const d of due) {
    const fresh = now - new Date(d.fire_at as string).getTime() < STALE_MS
    if (fresh) {
      // Same tag as the in-app reminder, so an open app and a push never show it twice.
      const key = d.key as string
      const tag = key.endsWith('|partner') ? key : `${d.user_id}|${key}`
      const payload = JSON.stringify({ title: d.title, body: d.body ?? undefined, tag, url: d.url ?? 'today' })
      for (const s of (subs ?? []).filter((x) => x.user_id === d.user_id)) {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint as string, keys: { p256dh: s.p256dh as string, auth: s.auth as string } }, payload, { TTL: 3600, urgency: 'high' })
          sent++
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode
          if (code === 404 || code === 410) gone.push(s.endpoint as string)
        }
      }
    }
    await db.from('scheduled_pushes').update({ sent_at: new Date().toISOString() }).eq('user_id', d.user_id).eq('key', d.key)
  }
  if (gone.length) await db.from('push_subscriptions').delete().in('endpoint', gone)
  return json({ sent, due: due.length, removed: gone.length })
})

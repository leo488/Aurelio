// Loaded into the generated service worker (see vite.config.ts).
// Tapping a reminder focuses the open app (or opens it) on the screen it is about.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const tag = event.notification.tag || ''
  const path = tag.includes('|partner') ? 'profile' : tag.includes('|task|') || tag.includes('|deadline|') || tag.includes('|routine|') || tag.includes('|catchup|') ? 'today' : 'notifications'
  // Relative to the scope, so it works under a sub-path such as GitHub Pages.
  const url = new URL((event.notification.data && event.notification.data.url) || path, self.registration.scope).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})

// Reminders pushed by the server while the app is closed. The tag matches the in-app reminder's,
// so the same reminder never shows twice. data.url is the screen to open, relative to the scope.
self.addEventListener('push', (event) => {
  let p = {}
  try {
    p = event.data ? event.data.json() : {}
  } catch {
    p = { title: event.data ? event.data.text() : 'Aurelio' }
  }
  const base = new URL('./', self.registration.scope).href
  event.waitUntil(
    self.registration.showNotification(p.title || 'Aurelio', {
      body: p.body,
      tag: p.tag,
      icon: `${base}icons/icon-192.png`,
      badge: `${base}icons/icon-192.png`,
      data: { url: p.url || 'today' },
    }),
  )
})

// Loaded into the generated service worker (see vite.config.ts).
// Tapping a reminder focuses the open app (or opens it) on the screen it is about.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const tag = event.notification.tag || ''
  const url = tag.includes('|partner') ? '/together' : tag.includes('|task|') || tag.includes('|deadline|') || tag.includes('|routine|') || tag.includes('|catchup|') ? '/today' : '/notifications'
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

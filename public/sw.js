// Service Worker for FetchDieto Web Push Notifications
// Handles push events from the server — works even when phone is locked

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// ── Push event: fired by server → shows OS notification ──────────────
self.addEventListener('push', (event) => {
  let data = { title: 'FetchDieto Reminder 🔔', body: 'Time for your reminder!', tag: 'reminder' }
  try { if (event.data) data = { ...data, ...event.data.json() } } catch {}

  const options = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag,
    renotify: true,
    requireInteraction: true,          // stays on screen until user dismisses
    vibrate: [300, 100, 300, 100, 600], // buzz pattern: short-short-long
    data: { url: '/dashboard/reminders' },
    actions: [
      { action: 'dismiss', title: '✕ Dismiss' },
      { action: 'view',    title: '→ Open App' },
    ],
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

// ── Notification click: open the app ─────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url.includes('/dashboard') && 'focus' in client) return client.focus()
        }
        // Otherwise open a new window
        return self.clients.openWindow(event.notification.data?.url || '/dashboard/reminders')
      })
    )
  }
})

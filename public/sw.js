// ═══════════════════════════════════════════════════════════════
//  NutriTrack Service Worker — Local Alarm Scheduler
//  Works fully OFFLINE, fires on lock screen, no server needed.
// ═══════════════════════════════════════════════════════════════

const SW_VERSION = 'v3-alarm'
const ALARM_CHECK_INTERVAL = 60 * 1000 // 1 minute

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// ── Helper: get stored reminders ──────────────────────────────
async function getReminders() {
  try {
    const cache = await caches.open('alarm-data')
    const res = await cache.match('reminders')
    if (!res) return []
    return await res.json()
  } catch { return [] }
}

// ── Helper: store reminders from page ────────────────────────
async function saveReminders(reminders) {
  try {
    const cache = await caches.open('alarm-data')
    await cache.put('reminders', new Response(JSON.stringify(reminders), {
      headers: { 'Content-Type': 'application/json' }
    }))
  } catch { /* ignore */ }
}

// ── Helper: check if a reminder should fire RIGHT NOW ─────────
function shouldFire(reminder) {
  if (!reminder.is_enabled) return false
  const now = new Date()
  const [h, m] = reminder.reminder_time.split(':').map(Number)
  return now.getHours() === h && now.getMinutes() === m
}

// ── Alarm check: runs every minute via setInterval ────────────
let alarmInterval = null

function startAlarmLoop() {
  if (alarmInterval) return
  alarmInterval = setInterval(async () => {
    const reminders = await getReminders()
    const fired = []
    for (const r of reminders) {
      if (shouldFire(r)) fired.push(r)
    }
    for (const r of fired) {
      // Show a rich OS notification (works on lock screen)
      const tag = `alarm-${r.id}`
      await self.registration.showNotification(`⏰ ${r.title}`, {
        body: 'Tap to open your alarm',
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag,
        renotify: true,
        requireInteraction: true,        // stays on screen until dismissed
        vibrate: [500, 200, 500, 200, 1000, 300, 500], // strong vibrate pattern
        silent: false,
        data: {
          url: `/alarm?id=${r.id}&title=${encodeURIComponent(r.title)}`,
          reminderId: r.id,
          reminderTitle: r.title,
        },
        actions: [
          { action: 'open',    title: '🔔 Open Alarm' },
          { action: 'snooze',  title: '😴 Snooze 5 min' },
          { action: 'dismiss', title: '✕ Dismiss' },
        ],
      })

      // Also message any open clients so they show the alarm UI
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clients) {
        client.postMessage({ type: 'ALARM_FIRE', reminderId: r.id, reminderTitle: r.title })
      }
    }
  }, ALARM_CHECK_INTERVAL)
}

// Start the loop immediately
startAlarmLoop()

// ── Message from page: sync reminders into SW cache ──────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SYNC_REMINDERS') {
    saveReminders(event.data.reminders)
    // Immediately restart loop after sync
    clearInterval(alarmInterval)
    alarmInterval = null
    startAlarmLoop()
  }
  if (event.data?.type === 'PING') {
    event.source?.postMessage({ type: 'PONG', version: SW_VERSION })
  }
})

// ── Notification click handler ────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  const targetUrl = data.url || '/dashboard/reminders'

  if (event.action === 'dismiss') return

  if (event.action === 'snooze') {
    // Snooze: re-fire after 5 minutes using a one-shot timeout
    setTimeout(async () => {
      await self.registration.showNotification(`⏰ ${data.reminderTitle || 'Reminder'} (Snoozed)`, {
        body: 'Your snoozed alarm is ringing!',
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag: `snooze-${data.reminderId}`,
        requireInteraction: true,
        vibrate: [500, 200, 500, 200, 1000],
        silent: false,
        data,
      })
    }, 5 * 60 * 1000)
    return
  }

  // Default / 'open': open the alarm page
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          client.postMessage({ type: 'ALARM_FIRE', reminderId: data.reminderId, reminderTitle: data.reminderTitle })
          return
        }
      }
      return self.clients.openWindow(targetUrl)
    })
  )
})

// ── Server Push: fired by the cron job even when app is fully closed ──
self.addEventListener('push', (event) => {
  let d = { title: '⏰ Reminder', body: 'Time for your reminder!', tag: 'reminder', reminderId: '', reminderTitle: '' }
  try { if (event.data) d = { ...d, ...event.data.json() } } catch {}

  const reminderTitle = d.body || d.reminderTitle || 'Reminder'
  const alarmUrl = `/alarm?title=${encodeURIComponent(reminderTitle)}`

  event.waitUntil(
    self.registration.showNotification(`⏰ ${reminderTitle}`, {
      body: 'Tap to open your alarm',
      icon: '/favicon.png',
      badge: '/favicon.png',
      tag: d.tag,
      renotify: true,
      requireInteraction: true,           // stays on screen — don't auto-dismiss
      vibrate: [600, 200, 600, 200, 1200, 400, 600],
      silent: false,
      data: { url: alarmUrl, reminderTitle },
      actions: [
        { action: 'open',    title: '🔔 Open Alarm' },
        { action: 'snooze',  title: '😴 Snooze 5 min' },
        { action: 'dismiss', title: '✕ Dismiss' },
      ],
    })
  )
})

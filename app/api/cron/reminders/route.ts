// GET|POST /api/cron/reminders
// Called every minute by Netlify Cron (netlify.toml) or cron-job.org in production.
// For each push subscription, computes the user's LOCAL time from their stored tz_offset_mins,
// then checks reminders matching that local time and sends Web Push to their device.
// Works even when phone is locked or app is closed.

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export async function GET(request: Request) {
  // Secret check so random people can't spam-trigger this endpoint
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret') ?? request.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const nowUtc = new Date()

  try {
    // Fetch all enabled reminders with their user's push subscriptions
    const reminders = await prisma.reminder.findMany({
      where: { is_enabled: true },
      include: {
        user: { include: { push_subscriptions: true } },
      },
    })

    const sends: Promise<void>[] = []
    let pushesSent = 0

    for (const reminder of reminders) {
      for (const sub of reminder.user.push_subscriptions) {
        // ── Convert server UTC time to this device's local time ──────────
        // getTimezoneOffset() returns minutes BEHIND UTC (e.g. IST = -330)
        // So local time = UTC - tzOffsetMins
        const localMs = nowUtc.getTime() - sub.tz_offset_mins * 60 * 1000
        const localDate = new Date(localMs)
        const localMinuteKey =
          `${String(localDate.getUTCHours()).padStart(2, '0')}:${String(localDate.getUTCMinutes()).padStart(2, '0')}`

        // Only send if this reminder's time matches the device's current local minute
        if (!reminder.reminder_time.startsWith(localMinuteKey)) continue

        const payload = JSON.stringify({
          title: 'FetchDieto Reminder 🔔',
          body: reminder.title,
          tag: reminder.id,
        })

        const pushSub = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        }

        pushesSent++
        sends.push(
          webpush.sendNotification(pushSub, payload)
            .then(() => {})
            .catch(async (err) => {
              // 410 Gone = subscription expired / user revoked permission → clean it up
              if (err.statusCode === 410) {
                await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } })
              }
            })
        )
      }
    }

    await Promise.all(sends)

    return NextResponse.json({
      ok: true,
      server_utc: nowUtc.toISOString(),
      pushes_sent: pushesSent,
    })
  } catch (e) {
    console.error('[cron/reminders]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// Some cron services use POST
export { GET as POST }

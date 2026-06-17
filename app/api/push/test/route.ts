// POST /api/push/test — sends an immediate test push to all subscriptions for a userId
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import webpush from 'web-push'

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

    const vapidEmail      = process.env.VAPID_EMAIL
    const vapidPublicKey  = process.env.NEXT_PUBLIC_VAPID_KEY
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
    if (!vapidEmail || !vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json({ error: 'VAPID env vars not configured' }, { status: 500 })
    }

    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)

    const subscriptions = await prisma.pushSubscription.findMany({ where: { user_id: userId } })

    if (subscriptions.length === 0) {
      return NextResponse.json({ error: 'No push subscriptions found. Click "Enable" on the Reminders page first.' }, { status: 404 })
    }

    const payload = JSON.stringify({
      title: 'FetchDieto Test 🔔',
      body: '✅ Push notifications are working! You will receive alarms even on the lock screen.',
      tag: 'test-push',
    })

    let sent = 0
    const errors: string[] = []

    await Promise.all(subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        sent++
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string }
        if (e.statusCode === 410) {
          // Expired subscription — clean it up
          await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } })
          errors.push('Expired subscription removed')
        } else {
          errors.push(e.message ?? 'Unknown error')
        }
      }
    }))

    return NextResponse.json({ ok: true, sent, errors })
  } catch (e) {
    console.error('[push/test]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

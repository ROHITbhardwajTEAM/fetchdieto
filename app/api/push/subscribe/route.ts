// POST /api/push/subscribe  — save a device's push subscription + its timezone offset
// DELETE /api/push/subscribe — remove it (on permission revoke)
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { userId, subscription, tzOffsetMins } = await request.json()
    if (!userId || !subscription?.endpoint) {
      return NextResponse.json({ error: 'Missing userId or subscription' }, { status: 400 })
    }

    const { endpoint, keys } = subscription
    const { p256dh, auth } = keys ?? {}

    // Upsert: if same endpoint exists (re-subscribe after permission prompt), update keys & tz
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { user_id: userId, p256dh, auth, tz_offset_mins: tzOffsetMins ?? 0 },
      create: { user_id: userId, endpoint, p256dh, auth, tz_offset_mins: tzOffsetMins ?? 0 },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[push/subscribe]', e)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { endpoint } = await request.json()
    if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })
    await prisma.pushSubscription.deleteMany({ where: { endpoint } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}

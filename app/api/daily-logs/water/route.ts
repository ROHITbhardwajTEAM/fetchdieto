import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const { userId, date, water_ml } = body

  if (!userId || !date) {
    return NextResponse.json({ error: 'userId and date required' }, { status: 400 })
  }

  const waterInt = Math.round(Number(water_ml) || 0)

  try {
    // Ensure user row exists before creating a daily_log (FK constraint)
    const userExists = await prisma.user.findUnique({ where: { id: userId } })
    if (!userExists) {
      return NextResponse.json(
        { error: 'User profile not found. Please complete your profile setup first.' },
        { status: 404 }
      )
    }

    // Safe findFirst + update/create (no compound unique key dependency)
    const existing = await prisma.dailyLog.findFirst({ where: { user_id: userId, date } })

    let log
    if (existing) {
      log = await prisma.dailyLog.update({
        where: { id: existing.id },
        data: { water_ml: waterInt },
      })
    } else {
      log = await prisma.dailyLog.create({
        data: {
          user_id:  userId,
          date,
          water_ml: waterInt,
          calories: 0,
          protein:  0,
          carbs:    0,
          fat:      0,
        },
      })
    }

    return NextResponse.json(log)
  } catch (e) {
    console.error('[WATER] DB error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}

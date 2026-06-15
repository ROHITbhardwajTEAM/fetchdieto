import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const EMPTY_LOG = { calories: 0, protein: 0, carbs: 0, fat: 0, water_ml: 0 }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const date   = searchParams.get('date') || new Date().toISOString().split('T')[0]

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  try {
    // Use findFirst instead of findUnique to avoid compound-key dependency
    const log = await prisma.dailyLog.findFirst({ where: { user_id: userId, date } })
    return NextResponse.json(log ?? EMPTY_LOG)
  } catch (e) {
    console.error('[DAILY-LOG GET] error:', e)
    return NextResponse.json(EMPTY_LOG)
  }
}

export async function POST(request: Request) {
  const body = await request.json()
  const { userId, date, ...data } = body

  try {
    const existing = await prisma.dailyLog.findFirst({ where: { user_id: userId, date } })

    let log
    if (existing) {
      log = await prisma.dailyLog.update({ where: { id: existing.id }, data })
    } else {
      log = await prisma.dailyLog.create({ data: { user_id: userId, date, ...data } })
    }

    return NextResponse.json(log)
  } catch (e) {
    console.error('[DAILY-LOG POST] error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

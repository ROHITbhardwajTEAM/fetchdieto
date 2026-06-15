import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json([])
  try {
    const reminders = await prisma.reminder.findMany({
      where: { user_id: userId },
      orderBy: { reminder_time: 'asc' },
    })
    return NextResponse.json(reminders)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  const body = await request.json()
  try {
    const reminder = await prisma.reminder.create({ data: body })
    return NextResponse.json(reminder)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  if (!userId) return NextResponse.json([])

  try {
    const meals = await prisma.meal.findMany({
      where: { user_id: userId, date },
      orderBy: { created_at: 'asc' },
    })
    return NextResponse.json(meals)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  const body = await request.json()
  try {
    // Create the meal (NOT completed by default, so daily_log is NOT updated yet)
    const meal = await prisma.meal.create({ data: { ...body, is_completed: false } })
    return NextResponse.json(meal)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// Helper: recalculate daily log from completed meals using safe findFirst + update/create
async function syncDailyLog(userId: string, date: string) {
  const completedMeals = await prisma.meal.findMany({
    where: { user_id: userId, date, is_completed: true },
  })

  type Totals = { calories: number; protein: number; carbs: number; fat: number }

  const totals = completedMeals.reduce<Totals>(
    (acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      protein:  acc.protein  + (m.protein  || 0),
      carbs:    acc.carbs    + (m.carbs    || 0),
      fat:      acc.fat      + (m.fat      || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const existing = await prisma.dailyLog.findFirst({ where: { user_id: userId, date } })

  if (existing) {
    await prisma.dailyLog.update({
      where: { id: existing.id },
      data: totals, // preserves water_ml untouched
    })
  } else {
    await prisma.dailyLog.create({
      data: { user_id: userId, date, ...totals, water_ml: 0 },
    })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()

  try {
    const meal = await prisma.meal.update({ where: { id }, data: body })

    if (typeof body.is_completed === 'boolean') {
      await syncDailyLog(meal.user_id, meal.date)
    }

    return NextResponse.json(meal)
  } catch (e) {
    console.error('[MEAL PATCH] error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const meal = await prisma.meal.delete({ where: { id } })
    await syncDailyLog(meal.user_id, meal.date)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[MEAL DELETE] error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const { userId, email, name, weight, height, age, gender, activity_level, goal, calories, protein, carbs, fat } = body

  try {
    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email,
        name,
        weight: parseFloat(weight) || null,
        height: parseFloat(height) || null,
        age: parseInt(age) || null,
        gender,
        activity_level,
        goal,
        calorie_target: calories,
        protein_target: protein,
        carb_target: carbs,
        fat_target: fat,
      },
    })
    return NextResponse.json({ user })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}

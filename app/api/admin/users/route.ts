import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Fetch all users with their related data
    const users = await prisma.user.findMany({
      include: {
        meals: {
          orderBy: { created_at: 'asc' },
        },
        daily_logs: {
          orderBy: { date: 'asc' },
        },
        reminders: {
          orderBy: { created_at: 'asc' },
        },
        push_subscriptions: true,
      },
      orderBy: { created_at: 'desc' },
    })

    // Build enriched user report
    const report = users.map((user) => {
      const totalMeals = user.meals.length
      const completedMeals = user.meals.filter((m) => m.is_completed).length
      const totalCaloriesLogged = user.meals.reduce((sum, m) => sum + (m.calories || 0), 0)
      const totalProteinLogged = user.meals.reduce((sum, m) => sum + (m.protein || 0), 0)
      const totalCarbsLogged = user.meals.reduce((sum, m) => sum + (m.carbs || 0), 0)
      const totalFatLogged = user.meals.reduce((sum, m) => sum + (m.fat || 0), 0)

      // Group meals by date for daily activity
      const mealsByDate: Record<string, typeof user.meals> = {}
      for (const meal of user.meals) {
        if (!mealsByDate[meal.date]) mealsByDate[meal.date] = []
        mealsByDate[meal.date].push(meal)
      }

      const activeDays = Object.keys(mealsByDate).length
      const totalDailyLogs = user.daily_logs.length
      const avgCaloriesPerDay =
        totalDailyLogs > 0
          ? Math.round(user.daily_logs.reduce((s, d) => s + d.calories, 0) / totalDailyLogs)
          : 0
      const avgWaterPerDay =
        totalDailyLogs > 0
          ? Math.round(user.daily_logs.reduce((s, d) => s + d.water_ml, 0) / totalDailyLogs)
          : 0

      const profileComplete = !!(
        user.name &&
        user.weight &&
        user.height &&
        user.age &&
        user.gender &&
        user.activity_level &&
        user.goal
      )

      return {
        id: user.id,
        name: user.name || 'Unnamed User',
        email: user.email,
        joined: user.created_at,
        lastUpdated: user.updated_at,
        profile: {
          weight: user.weight,
          height: user.height,
          age: user.age,
          gender: user.gender,
          activity_level: user.activity_level,
          goal: user.goal,
          calorie_target: user.calorie_target,
          protein_target: user.protein_target,
          carb_target: user.carb_target,
          fat_target: user.fat_target,
          isComplete: profileComplete,
        },
        stats: {
          totalMeals,
          completedMeals,
          pendingMeals: totalMeals - completedMeals,
          activeDays,
          totalDailyLogs,
          totalCaloriesLogged,
          totalProteinLogged: Math.round(totalProteinLogged),
          totalCarbsLogged: Math.round(totalCarbsLogged),
          totalFatLogged: Math.round(totalFatLogged),
          avgCaloriesPerDay,
          avgWaterPerDay,
          remindersCount: user.reminders.length,
          activeReminders: user.reminders.filter((r) => r.is_enabled).length,
          hasPushNotifications: user.push_subscriptions.length > 0,
        },
        meals: user.meals.map((m) => ({
          id: m.id,
          meal_name: m.meal_name,
          date: m.date,
          time: m.time,
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
          is_completed: m.is_completed,
          created_at: m.created_at,
        })),
        daily_logs: user.daily_logs.map((d) => ({
          id: d.id,
          date: d.date,
          calories: d.calories,
          protein: d.protein,
          carbs: d.carbs,
          fat: d.fat,
          water_ml: d.water_ml,
        })),
        reminders: user.reminders.map((r) => ({
          id: r.id,
          title: r.title,
          reminder_time: r.reminder_time,
          is_enabled: r.is_enabled,
          created_at: r.created_at,
        })),
      }
    })

    return NextResponse.json({ users: report, totalUsers: report.length })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to fetch admin data' }, { status: 500 })
  }
}

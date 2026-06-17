'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Droplets, Plus, Check, Flame, Target, TrendingUp, Dumbbell } from 'lucide-react'
import toast from 'react-hot-toast'

interface UserProfile {
  name: string
  calorie_target: number
  protein_target: number
  carb_target: number
  fat_target: number
}

interface DailyLog {
  calories: number
  protein: number
  carbs: number
  fat: number
  water_ml: number
}

interface Meal {
  id: string
  meal_name: string
  time: string
  calories: number
  protein: number
  carbs: number
  fat: number
  is_completed: boolean
}

function CalorieRing({ consumed, target }: { consumed: number; target: number }) {
  const pct = Math.min(consumed / target, 1)
  const radius = 80
  const stroke = 10
  const norm = radius - stroke / 2
  const circ = Math.PI * norm // semicircle
  const offset = circ - pct * circ

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 200, height: 110, margin: '0 auto' }}>
      <svg width="100%" viewBox="0 0 200 110">
        {/* Track */}
        <path d={`M ${stroke / 2} 100 A ${norm} ${norm} 0 0 1 ${200 - stroke / 2} 100`}
          fill="none" stroke="#f0f1f5" strokeWidth={stroke} strokeLinecap="round" />
        {/* Fill */}
        <path d={`M ${stroke / 2} 100 A ${norm} ${norm} 0 0 1 ${200 - stroke / 2} 100`}
          fill="none"
          stroke="url(#calGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.34,1.56,0.64,1)' }}
        />
        <defs>
          <linearGradient id="calGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E8742A" />
            <stop offset="100%" stopColor="#F5A623" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
        <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: '#2D3561' }}>{consumed}</div>
        <div style={{ fontSize: 11, color: '#A0A4BF', marginTop: 4 }}>of {target} kcal</div>
      </div>
    </div>
  )
}

function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e1f2e' }}>{label}</span>
        <span style={{ fontSize: 12, color: '#6b7280' }}>{value}g / {target}g</span>
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [log, setLog] = useState<DailyLog>({ calories: 0, protein: 0, carbs: 0, fat: 0, water_ml: 0 })
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const loadData = useCallback(async (uid: string) => {
    const [profileRes, logRes, mealsRes] = await Promise.all([
      fetch(`/api/users/${uid}`),
      fetch(`/api/daily-logs?userId=${uid}&date=${today}`),
      fetch(`/api/meals?userId=${uid}&date=${today}`),
    ])
    if (profileRes.ok) setUser(await profileRes.json())
    if (logRes.ok) {
      const logData = await logRes.json()
      // Only use log for water_ml — calories/macros are computed from completed meals
      setLog(prev => ({ ...prev, water_ml: logData.water_ml ?? 0 }))
    }
    if (mealsRes.ok) setMeals(await mealsRes.json())
    setLoading(false)
  }, [today])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
        loadData(data.user.id)
      }
    })
  }, [supabase, loadData])

  const toggleMeal = async (meal: Meal) => {
    const updated = !meal.is_completed
    await fetch(`/api/meals/${meal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_completed: updated }),
    })
    // Update meals state — calorie/macro totals auto-recompute from this
    setMeals(prev => prev.map(m => m.id === meal.id ? { ...m, is_completed: updated } : m))
    if (updated) toast.success(`✅ ${meal.meal_name} completed!`)
    else toast(`↩️ ${meal.meal_name} unchecked`)
  }

  const addWater = async (amount: number) => {
    if (!userId) return
    const newWater = log.water_ml + amount
    try {
      const res = await fetch('/api/daily-logs/water', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date: today, water_ml: newWater }),
      })
      if (res.ok) {
        const saved = await res.json()
        // Use confirmed server value — never trust local-only state for persistence
        setLog(prev => ({ ...prev, water_ml: saved.water_ml ?? newWater }))
        toast.success(`💧 +${amount}ml water logged!`)
      } else {
        const errData = await res.json().catch(() => ({}))
        const msg = errData?.error || 'Failed to save water.'
        // If user profile missing, auto-create it first then retry
        if (res.status === 404 && msg.includes('User profile')) {
          toast.error('⚠️ Please save your Profile first, then log water.')
        } else {
          toast.error(`❌ ${msg}`)
        }
      }
    } catch {
      toast.error('Network error saving water.')
    }
  }

  // ── Derive calorie + macro totals from COMPLETED meals only ──────────
  const completedMeals = meals.filter(m => m.is_completed)
  const consumedCalories = completedMeals.reduce((s, m) => s + (m.calories || 0), 0)
  const consumedProtein = completedMeals.reduce((s, m) => s + (m.protein || 0), 0)
  const consumedCarbs = completedMeals.reduce((s, m) => s + (m.carbs || 0), 0)
  const consumedFat = completedMeals.reduce((s, m) => s + (m.fat || 0), 0)

  const calorieTarget = user?.calorie_target || 2000
  const remaining = calorieTarget - consumedCalories

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48,
            border: '3px solid rgba(99,102,241,0.20)',
            borderTop: '3px solid #6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#6b7280' }}>Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900 }}>
      {/* ── Header ─────────────────────────────────── */}
      <div className="animate-fade-in" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 800, marginBottom: 4, color: '#1e1f2e' }}>
          {greeting()}, <span className="gradient-text">{user?.name?.split(' ')[0] || 'there'}</span> 👋
        </h1>
        <p style={{ color: '#6b7280', fontSize: 'clamp(13px, 3vw, 15px)' }}>
          {new Date().toLocaleDateString('en-IN', { cycleday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* ── Top stats grid ──────────────────────────── */}
      <div className="stat-grid animate-fade-in animate-fade-in-delay-1" style={{ marginBottom: 16 }}>
        {[
          { label: 'Calories Left', value: remaining > 0 ? remaining : 0, unit: 'kcal', icon: <Flame size={18} color="#E8742A" />, color: '#E8742A', glow: 'rgba(232,116,42,0.10)' },
          { label: 'Total Calories', value: consumedCalories, unit: 'consumed', icon: <Target size={18} color="#2D3561" />, color: '#2D3561', glow: 'rgba(45,53,97,0.08)' },
          { label: 'Daily Goal', value: calorieTarget, unit: 'kcal target', icon: <TrendingUp size={18} color="#27AE60" />, color: '#27AE60', glow: 'rgba(39,174,96,0.10)' },
          { label: 'Water', value: `${(log.water_ml / 1000).toFixed(1)}`, unit: 'L today', icon: <Droplets size={18} color="#2980B9" />, color: '#2980B9', glow: 'rgba(41,128,185,0.10)' },
        ].map(stat => (
          <div key={stat.label} className="glass-card" style={{ padding: '14px 16px' }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: stat.glow,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 10,
            }}>
              {stat.icon}
            </div>
            <div style={{ fontSize: 'clamp(16px, 4vw, 24px)', fontWeight: 800, color: stat.color, marginBottom: 2 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 10, color: '#9ca3af' }}>{stat.unit}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, fontWeight: 500 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── Calorie ring + Macros ────────────────────── */}
      <div className="dash-grid-halves animate-fade-in animate-fade-in-delay-2">
        {/* Calorie Ring */}
        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#1e1f2e' }}>Calorie Progress</h3>
          <CalorieRing consumed={consumedCalories} target={calorieTarget} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
            <div style={{ textAlign: 'center', padding: '10px', background: '#f9faff', borderRadius: 10, border: '1px solid #e8eaf0' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#27AE60' }}>{consumedCalories}</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>Consumed</div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px', background: '#f9faff', borderRadius: 10, border: '1px solid #e8eaf0' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: remaining > 0 ? '#6366f1' : '#ef4444' }}>
                {Math.abs(remaining)}
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{remaining > 0 ? 'Remaining' : 'Over'}</div>
            </div>
          </div>
        </div>

        {/* Macros */}
        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#1e1f2e' }}>Macronutrients</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <MacroBar label="Protein" value={consumedProtein} target={user?.protein_target || 150} color="linear-gradient(90deg, #9B59B6, #B47CC8)" />
            <MacroBar label="Carbohydrates" value={consumedCarbs} target={user?.carb_target || 250} color="linear-gradient(90deg, #F5A623, #F8C46A)" />
            <MacroBar label="Fat" value={consumedFat} target={user?.fat_target || 65} color="linear-gradient(90deg, #E8742A, #F59653)" />
          </div>
          <div style={{ marginTop: 20, padding: 12, background: '#f9faff', borderRadius: 10, border: '1px solid #e8eaf0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Dumbbell size={14} color="#9ca3af" />
              <span style={{ fontSize: 12, color: '#6b7280' }}>
                {Math.round(((consumedProtein * 4 + consumedCarbs * 4 + consumedFat * 9) / (consumedCalories || 1)) * 100)}% of calories from macros tracked
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Meals + Water ────────────────────────────── */}
      <div className="dash-grid-main animate-fade-in animate-fade-in-delay-3">
        {/* Meals checklist */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e1f2e' }}>Today&apos;s Meals</h3>
            <a href="/dashboard/meals" style={{ fontSize: 13, color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
              + Add meal
            </a>
          </div>

          {meals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
              <UtensilsCrossed size={36} style={{ marginBottom: 12, opacity: 0.35 }} />
              <p style={{ fontSize: 14, color: '#6b7280' }}>No meals logged today</p>
              <a href="/dashboard/meals" style={{ fontSize: 13, color: '#6366f1', textDecoration: 'none', display: 'block', marginTop: 8 }}>
                Add your first meal →
              </a>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {meals.map(meal => (
                <div key={meal.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: 12,
                  background: meal.is_completed ? 'rgba(16,185,129,0.06)' : '#fafafa',
                  border: `1px solid ${meal.is_completed ? 'rgba(16,185,129,0.25)' : '#e8eaf0'}`,
                  transition: 'all 0.2s', cursor: 'pointer',
                }} onClick={() => toggleMeal(meal)}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: meal.is_completed ? '#10b981' : '#ffffff',
                    border: `2px solid ${meal.is_completed ? '#10b981' : '#d1d5db'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                    boxShadow: meal.is_completed ? '0 2px 8px rgba(16,185,129,0.25)' : '0 1px 3px rgba(0,0,0,0.06)',
                  }}>
                    {meal.is_completed && <Check size={14} color="white" strokeWidth={3} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 600,
                      textDecoration: meal.is_completed ? 'line-through' : 'none',
                      color: meal.is_completed ? '#9ca3af' : '#1e1f2e',
                    }}>
                      {meal.meal_name}
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{meal.time} • {meal.calories || 0} kcal</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Water tracker */}
        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 2, color: '#1e1f2e' }}>Water</h3>
          <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14 }}>Goal: 2,500ml</p>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            {/* Water bottle */}
            <div style={{
              position: 'relative', width: 72, height: 96,
              border: '2px solid rgba(59,130,246,0.25)',
              borderRadius: 12, overflow: 'hidden',
              background: '#f0f7ff',
            }}>
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: `${Math.min((log.water_ml / 2500) * 100, 100)}%`,
                background: 'linear-gradient(to top, #3b82f6, #93c5fd)',
                transition: 'height 0.6s cubic-bezier(0.34,1.56,0.64,1)',
              }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Droplets size={22} color={log.water_ml > 0 ? 'white' : 'rgba(59,130,246,0.45)'} />
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#3b82f6' }}>{log.water_ml}</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>ml consumed</div>
            </div>

            {/* Water buttons */}
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              {[250, 500].map(amt => (
                <button key={amt} id={`btn-add-water-${amt}`} onClick={() => addWater(amt)}
                  style={{
                    flex: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    padding: '11px 8px', borderRadius: 10,
                    border: '1.5px solid rgba(59,130,246,0.25)',
                    background: '#f0f7ff', color: '#3b82f6',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
                    WebkitTapHighlightColor: 'transparent',
                    boxShadow: '0 1px 4px rgba(59,130,246,0.08)',
                  }}
                  onMouseOver={e => {
                    const el = e.currentTarget as HTMLButtonElement
                    el.style.background = 'rgba(59,130,246,0.15)'
                    el.style.borderColor = 'rgba(59,130,246,0.45)'
                    el.style.transform = 'translateY(-1px)'
                  }}
                  onMouseOut={e => {
                    const el = e.currentTarget as HTMLButtonElement
                    el.style.background = '#f0f7ff'
                    el.style.borderColor = 'rgba(59,130,246,0.25)'
                    el.style.transform = 'translateY(0)'
                  }}
                >
                  <Plus size={13} /> +{amt}ml
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function UtensilsCrossed({ size, style }: { size: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8" />
      <path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7" />
      <path d="m2.1 21.8 6.4-6.3" />
      <path d="m19 5-7 7" />
    </svg>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Check, Clock, Flame, Dumbbell } from 'lucide-react'
import toast from 'react-hot-toast'

interface Meal {
  id: string
  meal_name: string
  time: string
  calories: number
  protein: number
  carbs: number
  fat: number
  is_completed: boolean
  date: string
}

const MEAL_PRESETS = [
  { name: 'Breakfast', time: '08:00', emoji: '🌅' },
  { name: 'Lunch', time: '13:00', emoji: '☀️' },
  { name: 'Dinner', time: '19:00', emoji: '🌙' },
  { name: 'Protein Shake', time: '10:00', emoji: '💪' },
  { name: 'Snack', time: '16:00', emoji: '🍎' },
]

export default function MealsPage() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ meal_name: '', time: '', calories: '', protein: '', carbs: '', fat: '' })
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const loadMeals = useCallback(async (uid: string) => {
    const res = await fetch(`/api/meals?userId=${uid}&date=${today}`)
    if (res.ok) setMeals(await res.json())
    setLoading(false)
  }, [today])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) { setUserId(data.user.id); loadMeals(data.user.id) }
    })
  }, [supabase, loadMeals])

  const addMeal = async () => {
    if (!userId || !form.meal_name) return toast.error('Meal name required')
    const res = await fetch('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId, date: today,
        meal_name: form.meal_name,
        time: form.time,
        calories: parseInt(form.calories) || 0,
        protein: parseFloat(form.protein) || 0,
        carbs: parseFloat(form.carbs) || 0,
        fat: parseFloat(form.fat) || 0,
      }),
    })
    if (res.ok) {
      const meal = await res.json()
      setMeals(prev => [...prev, meal])
      setForm({ meal_name: '', time: '', calories: '', protein: '', carbs: '', fat: '' })
      setShowModal(false)
      toast.success('Meal added! 🍽️')
    }
  }

  const toggleMeal = async (meal: Meal) => {
    await fetch(`/api/meals/${meal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_completed: !meal.is_completed }),
    })
    setMeals(prev => prev.map(m => m.id === meal.id ? { ...m, is_completed: !m.is_completed } : m))
  }

  const deleteMeal = async (id: string, name: string) => {
    await fetch(`/api/meals/${id}`, { method: 'DELETE' })
    setMeals(prev => prev.filter(m => m.id !== id))
    toast.success(`${name} removed`)
  }

  const totalCals = meals.reduce((s, m) => s + (m.calories || 0), 0)
  const totalProtein = meals.reduce((s, m) => s + (m.protein || 0), 0)
  const completed = meals.filter(m => m.is_completed).length

  return (
    <div style={{ width: '100%' }}>
      {/* Header — CSS Grid: title left, button right */}
      <div className="page-header animate-fade-in">
        <div className="page-header-text">
          <h1>Meals</h1>
          <p>{new Date().toLocaleDateString('en-IN', { cycleday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <button id="btn-add-meal" className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> Add Meal
        </button>
      </div>

      {/* Summary — 3 compact horizontal cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Calories', value: totalCals, unit: 'kcal', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
          { label: 'Protein', value: `${totalProtein}g`, unit: 'total', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
          { label: 'Done', value: `${completed}/${meals.length}`, unit: 'meals', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
        ].map(s => (
          <div key={s.label} className="glass-card animate-fade-in animate-fade-in-delay-1"
            style={{ padding: '12px 10px', textAlign: 'center', background: s.bg, border: `1px solid ${s.color}22` }}>
            <div style={{ fontSize: 'clamp(16px,4vw,22px)', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{s.unit}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Meals list */}
      <div className="glass-card animate-fade-in animate-fade-in-delay-2" style={{ padding: 'clamp(14px,4vw,24px)' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Today&apos;s Meals</h2>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>Loading...</div>
        ) : meals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🍽️</div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 14, fontSize: 14 }}>No meals logged for today</p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button className="btn-primary" onClick={() => setShowModal(true)}>
                <Plus size={15} /> Add your first meal
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {meals.map(meal => (
              <div key={meal.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                borderRadius: 12,
                border: `1px solid ${meal.is_completed ? 'rgba(16,185,129,0.28)' : '#e2e4ec'}`,
                background: meal.is_completed ? 'rgba(16,185,129,0.06)' : '#ffffff',
                transition: 'all 0.2s',
                boxShadow: meal.is_completed ? 'none' : '0 1px 4px rgba(0,0,0,0.04)',
              }}>
                {/* Check button */}
                <button onClick={() => toggleMeal(meal)} style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: meal.is_completed ? '#10b981' : '#ffffff',
                  border: `2px solid ${meal.is_completed ? '#10b981' : '#d1d5db'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.2s', WebkitTapHighlightColor: 'transparent',
                  boxShadow: meal.is_completed ? '0 2px 8px rgba(16,185,129,0.25)' : '0 1px 3px rgba(0,0,0,0.06)',
                }}>
                  {meal.is_completed && <Check size={14} color="white" strokeWidth={3} />}
                </button>

                {/* Content — compact inline macros */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 600, fontSize: 14,
                    textDecoration: meal.is_completed ? 'line-through' : 'none',
                    color: meal.is_completed ? '#9ca3af' : '#1e1f2e',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {meal.meal_name}
                  </div>
                  {/* Row 1: time + calories */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                    {meal.time && <span style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Clock size={10} />{meal.time}
                    </span>}
                    {meal.calories > 0 && <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>🔥 {meal.calories} kcal</span>}
                  </div>
                  {/* Row 2: macros inline */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                    {meal.protein > 0 && <span style={{ fontSize: 11, color: '#818cf8' }}>💪 {meal.protein}g</span>}
                    {meal.carbs > 0 && <span style={{ fontSize: 11, color: '#f59e0b' }}>🌾 {meal.carbs}g</span>}
                    {meal.fat > 0 && <span style={{ fontSize: 11, color: '#f87171' }}>🥑 {meal.fat}g</span>}
                  </div>
                </div>

                {/* Delete */}
                <button onClick={() => deleteMeal(meal.id, meal.meal_name)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 8, borderRadius: 8, transition: 'all 0.2s', flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}
                  onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#ef4444' }}
                  onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Meal Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal-content" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Add Meal</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>Log what you ate or plan to eat</p>

            {/* Presets */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {MEAL_PRESETS.map(p => (
                <button key={p.name} onClick={() => setForm(f => ({ ...f, meal_name: p.name, time: p.time }))}
                  style={{
                    padding: '5px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: form.meal_name === p.name ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${form.meal_name === p.name ? 'rgba(124,58,237,0.5)' : 'var(--border)'}`,
                    color: form.meal_name === p.name ? 'var(--purple-light)' : 'var(--text-secondary)',
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
                    WebkitTapHighlightColor: 'transparent',
                  }}>{p.emoji} {p.name}</button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="input-label">Meal Name *</label>
                <input id="meal-name" className="input-field" placeholder="e.g. Chicken Rice Bowl"
                  value={form.meal_name} onChange={e => setForm(f => ({ ...f, meal_name: e.target.value }))} />
              </div>
              <div>
                <label className="input-label">Time</label>
                <input id="meal-time" type="time" className="input-field"
                  value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
              </div>

              {/* Macro grid — 2 col */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="input-label">Calories (kcal)</label>
                  <input id="meal-calories" type="number" inputMode="numeric" className="input-field" placeholder="0"
                    value={form.calories} onChange={e => setForm(f => ({ ...f, calories: e.target.value }))} />
                </div>
                <div>
                  <label className="input-label">Protein (g)</label>
                  <input id="meal-protein" type="number" inputMode="decimal" className="input-field" placeholder="0"
                    value={form.protein} onChange={e => setForm(f => ({ ...f, protein: e.target.value }))} />
                </div>
                <div>
                  <label className="input-label">Carbs (g)</label>
                  <input id="meal-carbs" type="number" inputMode="decimal" className="input-field" placeholder="0"
                    value={form.carbs} onChange={e => setForm(f => ({ ...f, carbs: e.target.value }))} />
                </div>
                <div>
                  <label className="input-label">Fat (g)</label>
                  <input id="meal-fat" type="number" inputMode="decimal" className="input-field" placeholder="0"
                    value={form.fat} onChange={e => setForm(f => ({ ...f, fat: e.target.value }))} />
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button id="btn-confirm-add-meal" className="btn-primary" onClick={addMeal}>Add Meal</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

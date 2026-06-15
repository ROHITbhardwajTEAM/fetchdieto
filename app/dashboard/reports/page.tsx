'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface DayLog {
  date: string
  calories: number
  protein: number
  carbs: number
  fat: number
  water_ml: number
}

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#ffffff', border: '1px solid #EDE4D8', borderRadius: 12, padding: '12px 16px', boxShadow: '0 4px 20px rgba(45,53,97,0.10)' }}>
        <p style={{ fontSize: 12, color: '#A0A4BF', marginBottom: 8, fontWeight: 600 }}>{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ fontSize: 13, color: p.color, fontWeight: 700 }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function ReportsPage() {
  const [logs, setLogs] = useState<DayLog[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [userTargets, setUserTargets] = useState({ calorie_target: 2000, protein_target: 150 })
  const supabase = createClient()

  const loadLogs = useCallback(async (uid: string) => {
    const days = getLast7Days()
    const results = await Promise.all(
      days.map(async date => {
        const res = await fetch(`/api/daily-logs?userId=${uid}&date=${date}`)
        const data = res.ok ? await res.json() : {}
        return { date: new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }), calories: data.calories || 0, protein: data.protein || 0, carbs: data.carbs || 0, fat: data.fat || 0, water_ml: data.water_ml || 0 }
      })
    )
    setLogs(results)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
        loadLogs(data.user.id)
        fetch(`/api/users/${data.user.id}`).then(r => r.json()).then(u => {
          if (u.calorie_target) setUserTargets({ calorie_target: u.calorie_target, protein_target: u.protein_target || 150 })
        })
      }
    })
  }, [supabase, loadLogs])

  const avgCalories = logs.length ? Math.round(logs.reduce((s, l) => s + l.calories, 0) / logs.filter(l => l.calories > 0).length || 0) : 0
  const avgProtein = logs.length ? Math.round(logs.reduce((s, l) => s + l.protein, 0) / logs.filter(l => l.protein > 0).length || 0) : 0
  const totalWater = logs.reduce((s, l) => s + l.water_ml, 0)
  const bestDay = logs.reduce((best, l) => l.calories > (best?.calories || 0) ? l : best, logs[0])

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="animate-fade-in" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: 800, marginBottom: 4, color: '#2D3561' }}>Weekly Reports</h1>
        <p style={{ color: '#6B6F8A', fontSize: 14 }}>Your nutrition trends for the past 7 days</p>
      </div>

      {/* Summary cards */}
      <div className="stat-grid animate-fade-in animate-fade-in-delay-1" style={{ marginBottom: 20 }}>
        {[
          { label: 'Avg Daily Calories', value: avgCalories,                    unit: 'kcal/day',    color: '#E8742A', bg: 'rgba(232,116,42,0.08)'  },
          { label: 'Avg Daily Protein',  value: `${avgProtein}g`,               unit: 'protein/day', color: '#9B59B6', bg: 'rgba(155,89,182,0.08)'  },
          { label: 'Total Water',        value: `${(totalWater/1000).toFixed(1)}L`, unit: 'this week', color: '#2980B9', bg: 'rgba(41,128,185,0.08)' },
          { label: 'Best Day',           value: bestDay?.date || '—',           unit: `${bestDay?.calories || 0} kcal`, color: '#27AE60', bg: 'rgba(39,174,96,0.08)' },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ padding: '12px 14px', background: s.bg, border: `1px solid ${s.color}33` }}>
            <div style={{ fontSize: 'clamp(16px,4vw,22px)', fontWeight: 800, color: s.color, lineHeight: 1, marginBottom: 3 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: '#A0A4BF' }}>{s.unit}</div>
            <div style={{ fontSize: 11, color: '#6B6F8A', marginTop: 2, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Calorie trend line chart */}
      <div className="glass-card animate-fade-in animate-fade-in-delay-2" style={{ padding: 'clamp(16px,4vw,28px)', marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: '#2D3561' }}>Calorie Trend</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={logs}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(45,53,97,0.08)" />
            <XAxis dataKey="date" tick={{ fill: '#A0A4BF', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#A0A4BF', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            {/* Main calorie line — orange */}
            <Line type="monotone" dataKey="calories" name="Calories" stroke="#E8742A" strokeWidth={3} dot={{ fill: '#E8742A', r: 5 }} activeDot={{ r: 8, fill: '#F5A623' }} />
            {/* Target reference line — dashed gold */}
            <Line type="monotone" dataKey="calories" name={`Target (${userTargets.calorie_target})`} stroke="rgba(245,166,35,0.35)" strokeWidth={2} strokeDasharray="6 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Macro breakdown + Hydration */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <div className="glass-card animate-fade-in animate-fade-in-delay-3" style={{ padding: 'clamp(14px,4vw,24px)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#2D3561' }}>Macro Breakdown</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={logs}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(45,53,97,0.08)" />
              <XAxis dataKey="date" tick={{ fill: '#A0A4BF', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#A0A4BF', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#6B6F8A' }} />
              {/* Protein = purple, Carbs = gold, Fat = orange */}
              <Bar dataKey="protein" name="Protein (g)" fill="#9B59B6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="carbs"   name="Carbs (g)"   fill="#F5A623" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fat"     name="Fat (g)"     fill="#E8742A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card animate-fade-in animate-fade-in-delay-3" style={{ padding: 'clamp(14px,4vw,24px)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#2D3561' }}>Hydration Trend</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={logs}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(45,53,97,0.08)" />
              <XAxis dataKey="date" tick={{ fill: '#A0A4BF', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#A0A4BF', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<CustomTooltip />} />
              {/* Water = navy blue (only place blue is intentional — water colour) */}
              <Bar dataKey="water_ml" name="Water (ml)" fill="#2980B9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

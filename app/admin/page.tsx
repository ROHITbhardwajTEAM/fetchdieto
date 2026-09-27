'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  Users, Flame, Dumbbell, Droplets, Bell, ChevronDown, ChevronUp,
  TrendingUp, Calendar, Activity, Target, CheckCircle2, Clock,
  Search, Download, RefreshCw, BarChart3, User, Utensils
} from 'lucide-react'

/* ─── Types ──────────────────────────────────────────────── */
interface UserReport {
  id: string
  name: string
  email: string
  joined: string
  lastUpdated: string
  profile: {
    weight: number | null
    height: number | null
    age: number | null
    gender: string | null
    activity_level: string | null
    goal: string | null
    calorie_target: number | null
    protein_target: number | null
    carb_target: number | null
    fat_target: number | null
    isComplete: boolean
  }
  stats: {
    totalMeals: number
    completedMeals: number
    pendingMeals: number
    activeDays: number
    totalDailyLogs: number
    totalCaloriesLogged: number
    totalProteinLogged: number
    totalCarbsLogged: number
    totalFatLogged: number
    avgCaloriesPerDay: number
    avgWaterPerDay: number
    remindersCount: number
    activeReminders: number
    hasPushNotifications: boolean
  }
  meals: Array<{
    id: string
    meal_name: string
    date: string
    time: string | null
    calories: number | null
    protein: number | null
    carbs: number | null
    fat: number | null
    is_completed: boolean
    created_at: string
  }>
  daily_logs: Array<{
    id: string
    date: string
    calories: number
    protein: number
    carbs: number
    fat: number
    water_ml: number
  }>
  reminders: Array<{
    id: string
    title: string
    reminder_time: string
    is_enabled: boolean
    created_at: string
  }>
}

/* ─── Helpers ─────────────────────────────────────────────── */
function fmt(n: number | null | undefined, unit = '') {
  if (n == null) return '—'
  return `${n.toLocaleString()}${unit}`
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}
function avatarColor(email: string) {
  const colors = [
    '#E8742A', '#9B59B6', '#2980B9', '#27AE60', '#F5A623',
    '#E74C3C', '#1ABC9C', '#3498DB', '#E67E22', '#8E44AD'
  ]
  let hash = 0
  for (const c of email) hash = (hash * 31 + c.charCodeAt(0)) % colors.length
  return colors[hash]
}
function goalLabel(g: string | null) {
  if (!g) return '—'
  return g.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/* ─── StatChip ─────────────────────────────────────────────── */
function StatChip({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string | number; color: string
}) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #EDE4D8', borderRadius: 12,
      padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 1px 4px rgba(45,53,97,0.05)'
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#2D3561', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: '#6B6F8A', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  )
}

/* ─── Mini progress bar ────────────────────────────────────── */
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
      <div style={{ flex: 1, background: '#EDE4D8', borderRadius: 4, height: 6, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 4, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: 11, color: '#6B6F8A', minWidth: 28, textAlign: 'right' }}>{pct}%</span>
    </div>
  )
}

/* ─── UserRow ──────────────────────────────────────────────── */
function UserRow({ user }: { user: UserReport }) {
  const [expanded, setExpanded] = useState(false)
  const [tab, setTab] = useState<'overview' | 'meals' | 'logs' | 'reminders'>('overview')
  const color = avatarColor(user.email)
  const s = user.stats
  const p = user.profile

  return (
    <div style={{
      background: '#fff', border: '1px solid #EDE4D8', borderRadius: 16,
      overflow: 'hidden', boxShadow: '0 1px 4px rgba(45,53,97,0.05)',
      transition: 'box-shadow 0.2s ease'
    }}>
      {/* Header row */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto auto auto',
          alignItems: 'center',
          gap: 16,
          padding: '16px 20px',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0
          }}>
            {initials(user.name)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: '#2D3561', fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name}
            </div>
            <div style={{ fontSize: 12, color: '#6B6F8A', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#2D3561' }}>{fmtDate(user.joined)}</div>
          <div style={{ fontSize: 11, color: '#A0A4BF' }}>Joined</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#E8742A' }}>{s.totalMeals}</div>
          <div style={{ fontSize: 11, color: '#A0A4BF' }}>Meals</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#9B59B6' }}>{s.activeDays}</div>
          <div style={{ fontSize: 11, color: '#A0A4BF' }}>Active Days</div>
        </div>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: expanded ? 'rgba(232,116,42,0.1)' : '#f5f5f5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: expanded ? '#E8742A' : '#6B6F8A', transition: 'all 0.2s'
        }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div style={{ borderTop: '1px solid #EDE4D8', padding: '20px 20px 24px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
            {(['overview', 'meals', 'logs', 'reminders'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '7px 16px', borderRadius: 8, border: '1.5px solid',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                background: tab === t ? 'linear-gradient(135deg,#E8742A,#F59653)' : '#fff',
                color: tab === t ? '#fff' : '#6B6F8A',
                borderColor: tab === t ? 'transparent' : '#EDE4D8',
                transition: 'all 0.15s'
              }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {t === 'meals' && <span style={{ marginLeft: 4 }}>({s.totalMeals})</span>}
                {t === 'logs' && <span style={{ marginLeft: 4 }}>({s.totalDailyLogs})</span>}
                {t === 'reminders' && <span style={{ marginLeft: 4 }}>({s.remindersCount})</span>}
              </button>
            ))}
          </div>

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#A0A4BF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Profile Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                  {[
                    { label: 'Weight', value: fmt(p.weight, ' kg') },
                    { label: 'Height', value: fmt(p.height, ' cm') },
                    { label: 'Age', value: fmt(p.age, ' yrs') },
                    { label: 'Gender', value: p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : '—' },
                    { label: 'Activity', value: p.activity_level ? p.activity_level.replace(/_/g, ' ') : '—' },
                    { label: 'Goal', value: goalLabel(p.goal) },
                  ].map(item => (
                    <div key={item.label} style={{ background: '#FAF6F0', border: '1px solid #EDE4D8', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ fontSize: 11, color: '#A0A4BF', marginBottom: 4 }}>{item.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#2D3561' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {(p.calorie_target || p.protein_target) && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#A0A4BF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Daily Targets vs Actual</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                    {[
                      { label: 'Calories', target: p.calorie_target, actual: s.avgCaloriesPerDay, unit: 'kcal', color: '#E8742A' },
                      { label: 'Protein', target: p.protein_target, actual: Math.round(s.totalProteinLogged / Math.max(s.activeDays, 1)), unit: 'g', color: '#9B59B6' },
                      { label: 'Carbs', target: p.carb_target, actual: Math.round(s.totalCarbsLogged / Math.max(s.activeDays, 1)), unit: 'g', color: '#F5A623' },
                      { label: 'Fat', target: p.fat_target, actual: Math.round(s.totalFatLogged / Math.max(s.activeDays, 1)), unit: 'g', color: '#2980B9' },
                    ].filter(x => x.target).map(item => (
                      <div key={item.label} style={{ background: '#fff', border: '1px solid #EDE4D8', borderRadius: 10, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#2D3561' }}>{item.label}</span>
                          <span style={{ fontSize: 11, color: '#A0A4BF' }}>Target: {item.target}{item.unit}</span>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: item.color, marginBottom: 6 }}>~{item.actual}{item.unit}/day avg</div>
                        <MiniBar value={item.actual} max={item.target!} color={item.color} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#A0A4BF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Activity Summary</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                  <StatChip icon={<Flame size={16} />} label="Total Calories" value={`${s.totalCaloriesLogged.toLocaleString()} kcal`} color="#E8742A" />
                  <StatChip icon={<Dumbbell size={16} />} label="Total Protein" value={`${s.totalProteinLogged}g`} color="#9B59B6" />
                  <StatChip icon={<Droplets size={16} />} label="Avg Water/Day" value={`${s.avgWaterPerDay}ml`} color="#2980B9" />
                  <StatChip icon={<CheckCircle2 size={16} />} label="Meals Completed" value={`${s.completedMeals}/${s.totalMeals}`} color="#27AE60" />
                  <StatChip icon={<Calendar size={16} />} label="Active Days" value={s.activeDays} color="#F5A623" />
                  <StatChip icon={<Bell size={16} />} label="Active Reminders" value={s.activeReminders} color="#E74C3C" />
                </div>
              </div>
            </div>
          )}

          {/* MEALS */}
          {tab === 'meals' && (
            <div>
              {user.meals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#A0A4BF' }}>
                  <Utensils size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <div>No meals logged yet</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #EDE4D8' }}>
                        {['Date', 'Meal', 'Time', 'Cal', 'Protein', 'Carbs', 'Fat', 'Status', 'Added At'].map(h => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#A0A4BF', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {user.meals.map((m, i) => (
                        <tr key={m.id} style={{ borderBottom: '1px solid #F5EDE0', background: i % 2 === 0 ? '#FDFAF7' : '#fff' }}>
                          <td style={{ padding: '8px 10px', color: '#2D3561', fontWeight: 500, whiteSpace: 'nowrap' }}>{m.date}</td>
                          <td style={{ padding: '8px 10px', color: '#2D3561', fontWeight: 600 }}>{m.meal_name}</td>
                          <td style={{ padding: '8px 10px', color: '#6B6F8A' }}>{m.time || '—'}</td>
                          <td style={{ padding: '8px 10px', color: '#E8742A', fontWeight: 600 }}>{fmt(m.calories)}</td>
                          <td style={{ padding: '8px 10px', color: '#9B59B6' }}>{fmt(m.protein, 'g')}</td>
                          <td style={{ padding: '8px 10px', color: '#F5A623' }}>{fmt(m.carbs, 'g')}</td>
                          <td style={{ padding: '8px 10px', color: '#2980B9' }}>{fmt(m.fat, 'g')}</td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                              background: m.is_completed ? 'rgba(39,174,96,0.1)' : 'rgba(232,116,42,0.1)',
                              color: m.is_completed ? '#27AE60' : '#E8742A',
                              border: `1px solid ${m.is_completed ? 'rgba(39,174,96,0.25)' : 'rgba(232,116,42,0.25)'}`
                            }}>
                              {m.is_completed ? '✓ Done' : '⏳ Pending'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', color: '#A0A4BF', whiteSpace: 'nowrap', fontSize: 12 }}>
                            {new Date(m.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* DAILY LOGS */}
          {tab === 'logs' && (
            <div>
              {user.daily_logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#A0A4BF' }}>
                  <BarChart3 size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <div>No daily logs recorded</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #EDE4D8' }}>
                        {['Date', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Water (ml)'].map(h => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#A0A4BF', fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {user.daily_logs.map((log, i) => (
                        <tr key={log.id} style={{ borderBottom: '1px solid #F5EDE0', background: i % 2 === 0 ? '#FDFAF7' : '#fff' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: '#2D3561' }}>{log.date}</td>
                          <td style={{ padding: '8px 10px', color: '#E8742A', fontWeight: 700 }}>{log.calories.toLocaleString()}</td>
                          <td style={{ padding: '8px 10px', color: '#9B59B6' }}>{Math.round(log.protein)}</td>
                          <td style={{ padding: '8px 10px', color: '#F5A623' }}>{Math.round(log.carbs)}</td>
                          <td style={{ padding: '8px 10px', color: '#2980B9' }}>{Math.round(log.fat)}</td>
                          <td style={{ padding: '8px 10px', color: '#27AE60' }}>{log.water_ml.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid #EDE4D8', background: '#FFF8F2' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: '#2D3561' }}>Avg / Day</td>
                        <td style={{ padding: '8px 10px', color: '#E8742A', fontWeight: 700 }}>{s.avgCaloriesPerDay.toLocaleString()}</td>
                        <td style={{ padding: '8px 10px', color: '#9B59B6' }}>{Math.round(s.totalProteinLogged / Math.max(s.totalDailyLogs, 1))}</td>
                        <td style={{ padding: '8px 10px', color: '#F5A623' }}>{Math.round(s.totalCarbsLogged / Math.max(s.totalDailyLogs, 1))}</td>
                        <td style={{ padding: '8px 10px', color: '#2980B9' }}>{Math.round(s.totalFatLogged / Math.max(s.totalDailyLogs, 1))}</td>
                        <td style={{ padding: '8px 10px', color: '#27AE60' }}>{s.avgWaterPerDay.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* REMINDERS */}
          {tab === 'reminders' && (
            <div>
              {user.reminders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#A0A4BF' }}>
                  <Bell size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <div>No reminders set</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {user.reminders.map(r => (
                    <div key={r.id} style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 16px', border: '1px solid #EDE4D8', borderRadius: 12,
                      background: r.is_enabled ? '#FDFAF7' : '#fafafa'
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: r.is_enabled ? 'rgba(232,116,42,0.12)' : '#f0f0f0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: r.is_enabled ? '#E8742A' : '#A0A4BF', flexShrink: 0
                      }}>
                        <Bell size={16} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#2D3561', fontSize: 14 }}>{r.title}</div>
                        <div style={{ fontSize: 12, color: '#6B6F8A', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} />
                          {r.reminder_time} · Added {fmtDate(r.created_at)}
                        </div>
                      </div>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: r.is_enabled ? 'rgba(39,174,96,0.1)' : 'rgba(160,164,191,0.12)',
                        color: r.is_enabled ? '#27AE60' : '#A0A4BF',
                        border: `1px solid ${r.is_enabled ? 'rgba(39,174,96,0.25)' : '#EDE4D8'}`
                      }}>
                        {r.is_enabled ? '● Active' : '○ Off'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Main Admin Page ─────────────────────────────────────── */
export default function AdminPage() {
  const [users, setUsers] = useState<UserReport[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'joined' | 'meals' | 'activeDays' | 'calories'>('joined')
  const [refreshing, setRefreshing] = useState(false)

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    let list = users.filter(u =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    )
    list = [...list].sort((a, b) => {
      if (sortBy === 'joined') return new Date(b.joined).getTime() - new Date(a.joined).getTime()
      if (sortBy === 'meals') return b.stats.totalMeals - a.stats.totalMeals
      if (sortBy === 'activeDays') return b.stats.activeDays - a.stats.activeDays
      if (sortBy === 'calories') return b.stats.totalCaloriesLogged - a.stats.totalCaloriesLogged
      return 0
    })
    return list
  }, [users, search, sortBy])

  const totalMeals = users.reduce((s, u) => s + u.stats.totalMeals, 0)
  const totalLogs = users.reduce((s, u) => s + u.stats.totalDailyLogs, 0)
  const totalCalories = users.reduce((s, u) => s + u.stats.totalCaloriesLogged, 0)
  const profileComplete = users.filter(u => u.profile.isComplete).length
  const pushEnabled = users.filter(u => u.stats.hasPushNotifications).length

  const exportCSV = () => {
    const rows = [
      ['Name', 'Email', 'Joined', 'Weight', 'Height', 'Age', 'Gender', 'Goal',
       'Calorie Target', 'Total Meals', 'Completed Meals', 'Active Days',
       'Total Calories', 'Total Protein (g)', 'Total Carbs (g)', 'Total Fat (g)',
       'Avg Cal/Day', 'Avg Water/Day (ml)', 'Reminders', 'Push Notifications'],
      ...users.map(u => [
        u.name, u.email, fmtDate(u.joined),
        u.profile.weight ?? '', u.profile.height ?? '', u.profile.age ?? '',
        u.profile.gender ?? '', u.profile.goal ?? '',
        u.profile.calorie_target ?? '',
        u.stats.totalMeals, u.stats.completedMeals, u.stats.activeDays,
        u.stats.totalCaloriesLogged, u.stats.totalProteinLogged,
        u.stats.totalCarbsLogged, u.stats.totalFatLogged,
        u.stats.avgCaloriesPerDay, u.stats.avgWaterPerDay,
        u.stats.remindersCount, u.stats.hasPushNotifications ? 'Yes' : 'No'
      ])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nutritrack-users-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, border: '3px solid #EDE4D8', borderTopColor: '#E8742A',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
          }} />
          <div style={{ color: '#6B6F8A', fontWeight: 500 }}>Loading admin data…</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF6F0' }}>
      {/* TOP HEADER BAR */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #EDE4D8',
        padding: '16px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
        boxShadow: '0 2px 12px rgba(45,53,97,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg,#E8742A,#F59653)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <BarChart3 size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#2D3561', margin: 0 }}>Admin Analytics</h1>
            <p style={{ fontSize: 12, color: '#6B6F8A', margin: 0 }}>NutriTrack · All Users Report</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => load(true)} disabled={refreshing} className="btn-secondary" style={{ gap: 6, padding: '8px 14px', fontSize: 13 }}>
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button onClick={exportCSV} className="btn-primary" style={{ gap: 6, padding: '8px 14px', fontSize: 13 }}>
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: 1300, margin: '0 auto' }}>
        {/* GLOBAL STAT CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Total Users', value: users.length, icon: <Users size={18} />, color: '#E8742A' },
            { label: 'Profile Complete', value: profileComplete, icon: <User size={18} />, color: '#27AE60' },
            { label: 'Total Meals Logged', value: totalMeals.toLocaleString(), icon: <Utensils size={18} />, color: '#9B59B6' },
            { label: 'Daily Log Entries', value: totalLogs.toLocaleString(), icon: <BarChart3 size={18} />, color: '#F5A623' },
            { label: 'Total Calories', value: `${(totalCalories / 1000).toFixed(1)}k kcal`, icon: <Flame size={18} />, color: '#E74C3C' },
            { label: 'Push Enabled', value: pushEnabled, icon: <Bell size={18} />, color: '#2980B9' },
          ].map(card => (
            <div key={card.label} style={{
              background: '#fff', border: '1px solid #EDE4D8', borderRadius: 16,
              padding: '18px 20px', boxShadow: '0 1px 4px rgba(45,53,97,0.05)',
              display: 'flex', flexDirection: 'column', gap: 10
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: `${card.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: card.color
              }}>
                {card.icon}
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#2D3561', lineHeight: 1 }}>{card.value}</div>
                <div style={{ fontSize: 12, color: '#6B6F8A', marginTop: 4 }}>{card.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* SEARCH + SORT BAR */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#A0A4BF', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…" className="input-field" style={{ paddingLeft: 36 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 13, color: '#6B6F8A', fontWeight: 500 }}>Sort:</span>
            {([
              { key: 'joined', label: 'Newest' },
              { key: 'meals', label: 'Most Meals' },
              { key: 'activeDays', label: 'Most Active' },
              { key: 'calories', label: 'Most Calories' },
            ] as const).map(opt => (
              <button key={opt.key} onClick={() => setSortBy(opt.key)} style={{
                padding: '6px 12px', borderRadius: 8, border: '1.5px solid',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                background: sortBy === opt.key ? 'rgba(232,116,42,0.1)' : '#fff',
                color: sortBy === opt.key ? '#E8742A' : '#6B6F8A',
                borderColor: sortBy === opt.key ? 'rgba(232,116,42,0.35)' : '#EDE4D8',
                transition: 'all 0.15s'
              }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* USER COUNT */}
        <div style={{ marginBottom: 14, fontSize: 13, color: '#6B6F8A' }}>
          Showing <strong style={{ color: '#2D3561' }}>{filtered.length}</strong> of {users.length} users
          {search && ` matching "${search}"`}
        </div>

        {/* USER LIST */}
        {filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 0',
            background: '#fff', border: '1px solid #EDE4D8', borderRadius: 16, color: '#A0A4BF'
          }}>
            <Users size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <div style={{ fontSize: 16, fontWeight: 600 }}>No users found</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Try a different search term</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(user => <UserRow key={user.id} user={user} />)}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

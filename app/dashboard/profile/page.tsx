'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Save, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { CustomSelect } from '@/components/CustomSelect'

interface UserProfile {
  id: string
  name: string
  email: string
  weight: number
  height: number
  age: number
  gender: string
  activity_level: string
  goal: string
  calorie_target: number
  protein_target: number
  carb_target: number
  fat_target: number
}

function calcMacros(data: Partial<UserProfile>) {
  const w = data.weight || 70
  const h = data.height || 170
  const a = data.age || 25
  const isMale = data.gender === 'male'
  const bmr = isMale ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161
  const activityMap: Record<string, number> = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
  }
  const tdee = bmr * (activityMap[data.activity_level || 'moderate'] || 1.375)
  let calories = tdee
  if (data.goal === 'lose') calories = tdee - 500
  if (data.goal === 'gain') calories = tdee + 300
  return {
    calorie_target: Math.round(calories),
    protein_target: Math.round((calories * 0.3) / 4),
    carb_target: Math.round((calories * 0.45) / 4),
    fat_target: Math.round((calories * 0.25) / 9),
  }
}

const GENDER_OPTIONS    = [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]
const ACTIVITY_OPTIONS  = [
  { value: 'sedentary',  label: 'Sedentary'  },
  { value: 'light',      label: 'Light'      },
  { value: 'moderate',   label: 'Moderate'   },
  { value: 'active',     label: 'Active'     },
  { value: 'very_active',label: 'Very Active'},
]
const GOAL_OPTIONS      = [
  { value: 'lose',     label: 'Lose Weight'  },
  { value: 'maintain', label: 'Maintain'     },
  { value: 'gain',     label: 'Gain Muscle'  },
]

export default function ProfilePage() {
  const [profile, setProfile] = useState<Partial<UserProfile>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const loadProfile = useCallback(async (uid: string) => {
    const res = await fetch(`/api/users/${uid}`)
    if (res.ok) setProfile(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) loadProfile(data.user.id)
    })
  }, [supabase, loadProfile])

  const update = (field: keyof UserProfile, value: string | number) =>
    setProfile(prev => ({ ...prev, [field]: value }))

  const recalculate = () => {
    const macros = calcMacros(profile)
    setProfile(prev => ({ ...prev, ...macros }))
    toast.success('Macros recalculated! 📊')
  }

  const save = async () => {
    if (!profile.id) return
    setSaving(true)
    const res = await fetch(`/api/users/${profile.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
    if (res.ok) toast.success('Profile updated! ✅')
    else toast.error('Failed to save')
    setSaving(false)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{
          width: 48, height: 48,
          border: '3px solid rgba(232,116,42,0.20)',
          borderTop: '3px solid #E8742A',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Header */}
      <div className="animate-fade-in" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 'clamp(20px,5vw,26px)', fontWeight: 800, marginBottom: 4, color: '#2D3561' }}>
          Profile &amp; Settings
        </h1>
        <p style={{ color: '#6B6F8A', fontSize: 14 }}>Manage your account and recalculate targets</p>
      </div>

      {/* Avatar card */}
      <div className="glass-card animate-fade-in animate-fade-in-delay-1"
        style={{ padding: 24, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'linear-gradient(135deg, #E8742A, #F5A623)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, boxShadow: '0 4px 20px rgba(232,116,42,0.30)',
        }}>
          <User size={28} color="white" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#2D3561' }}>{profile.name || 'User'}</div>
          <div style={{ color: '#6B6F8A', fontSize: 14 }}>{profile.email}</div>
          <div className="badge badge-orange" style={{ marginTop: 8 }}>
            {profile.goal === 'lose' ? '🔥 Losing Weight' : profile.goal === 'gain' ? '💪 Gaining Muscle' : '⚖️ Maintaining'}
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <div className="glass-card animate-fade-in animate-fade-in-delay-2"
        style={{ padding: 'clamp(16px,4vw,28px)', marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#1e1f2e' }}>
          Personal Information
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>

          {/* Full Name — full width */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="input-label">Full Name</label>
            <input
              id="profile-name"
              className="input-field"
              value={profile.name || ''}
              onChange={e => update('name', e.target.value)}
            />
          </div>

          {/* Weight */}
          <div>
            <label className="input-label">Weight (kg)</label>
            <input
              id="profile-weight" type="number" className="input-field"
              value={profile.weight || ''}
              onChange={e => update('weight', parseFloat(e.target.value))}
            />
          </div>

          {/* Height */}
          <div>
            <label className="input-label">Height (cm)</label>
            <input
              id="profile-height" type="number" className="input-field"
              value={profile.height || ''}
              onChange={e => update('height', parseFloat(e.target.value))}
            />
          </div>

          {/* Age */}
          <div>
            <label className="input-label">Age</label>
            <input
              id="profile-age" type="number" className="input-field"
              value={profile.age || ''}
              onChange={e => update('age', parseInt(e.target.value))}
            />
          </div>

          {/* ── Custom dropdowns ── */}
          <div>
            <label className="input-label">Gender</label>
            <CustomSelect
              id="profile-gender"
              value={profile.gender || 'male'}
              onChange={v => update('gender', v)}
              options={GENDER_OPTIONS}
            />
          </div>

          <div>
            <label className="input-label">Activity Level</label>
            <CustomSelect
              id="profile-activity"
              value={profile.activity_level || 'moderate'}
              onChange={v => update('activity_level', v)}
              options={ACTIVITY_OPTIONS}
            />
          </div>

          <div>
            <label className="input-label">Goal</label>
            <CustomSelect
              id="profile-goal"
              value={profile.goal || 'maintain'}
              onChange={v => update('goal', v)}
              options={GOAL_OPTIONS}
            />
          </div>

        </div>
      </div>

      {/* Daily Targets */}
      <div className="glass-card animate-fade-in animate-fade-in-delay-3"
        style={{ padding: 'clamp(16px,4vw,28px)', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e1f2e' }}>Daily Targets</h2>
          <button
            id="btn-recalculate"
            onClick={recalculate}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 10,
              background: 'rgba(99,102,241,0.10)',
              border: '1px solid rgba(99,102,241,0.25)',
              color: '#6366f1', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}
          >
            <RefreshCw size={13} /> Recalculate
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {[
            { label: 'Calories', field: 'calorie_target' as keyof UserProfile, unit: 'kcal', color: '#f59e0b' },
            { label: 'Protein',  field: 'protein_target' as keyof UserProfile, unit: 'g',    color: '#818cf8' },
            { label: 'Carbs',    field: 'carb_target'    as keyof UserProfile, unit: 'g',    color: '#f59e0b' },
            { label: 'Fat',      field: 'fat_target'     as keyof UserProfile, unit: 'g',    color: '#f87171' },
          ].map(t => (
            <div key={t.field} style={{ textAlign: 'center' }}>
              <label className="input-label" style={{ textAlign: 'center' }}>{t.label}</label>
              <input
                id={`target-${t.field}`}
                type="number"
                className="input-field"
                style={{ textAlign: 'center', color: t.color, fontWeight: 700, fontSize: 18 }}
                value={profile[t.field] as number || 0}
                onChange={e => update(t.field, parseInt(e.target.value))}
              />
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{t.unit}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Save button */}
      <div className="animate-fade-in animate-fade-in-delay-4">
        <button
          id="btn-save-profile"
          className="btn-primary"
          onClick={save}
          disabled={saving}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, opacity: saving ? 0.7 : 1, minHeight: 44,
          }}
        >
          <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

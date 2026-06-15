'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { Mail, Lock, User, ChevronRight, ChevronLeft, Eye, EyeOff } from 'lucide-react'

type Step = 1 | 2 | 3

interface FormData {
  email: string
  password: string
  name: string
  weight: string
  height: string
  age: string
  gender: string
  activity_level: string
  goal: string
}

function calcMacros(data: FormData) {
  const w = parseFloat(data.weight) || 70
  const h = parseFloat(data.height) || 170
  const a = parseInt(data.age) || 25
  const isMale = data.gender === 'male'
  const bmr = isMale
    ? 10 * w + 6.25 * h - 5 * a + 5
    : 10 * w + 6.25 * h - 5 * a - 161

  const activityMap: Record<string, number> = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
  }
  const tdee = bmr * (activityMap[data.activity_level] || 1.375)
  let calories = tdee
  if (data.goal === 'lose') calories = tdee - 500
  if (data.goal === 'gain') calories = tdee + 300

  const protein = Math.round((calories * 0.3) / 4)
  const fat = Math.round((calories * 0.25) / 9)
  const carbs = Math.round((calories * 0.45) / 4)
  return { calories: Math.round(calories), protein, fat, carbs }
}

export default function RegisterPage() {
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [form, setForm] = useState<FormData>({
    email: '', password: '', name: '', weight: '', height: '',
    age: '', gender: 'male', activity_level: 'moderate', goal: 'maintain',
  })
  const router = useRouter()
  const supabase = createClient()

  const update = (field: keyof FormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const macros = calcMacros(form)

  const handleRegister = async () => {
    setLoading(true)

    // Step 1: Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { name: form.name } },
    })

    if (error) {
      // Handle "User already registered" gracefully
      if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists')) {
        toast.error('An account with this email already exists. Try logging in.')
      } else {
        toast.error(error.message)
      }
      setLoading(false)
      return
    }

    const userId = data.user?.id
    if (!userId) {
      toast.error('Signup failed — please try again.')
      setLoading(false)
      return
    }

    // Step 2: Save profile to our DB
    try {
      await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ...macros, userId }),
      })
    } catch {
      // Non-fatal — profile can be set up later
    }

    // Step 3: Check if email confirmation is required
    // If data.session is null → Supabase requires email confirmation
    if (!data.session) {
      // Email confirmation is ON in Supabase
      setEmailSent(true)
      setLoading(false)
      return
    }

    // Email confirmation is OFF — auto-login worked
    toast.success('Account created! Welcome to FetchDieto 🎉')
    router.push('/dashboard')
    router.refresh()
    setLoading(false)
  }

  const stepTitles = ['Account', 'Body Stats', 'Your Goal']
  const stepDescriptions = [
    'Create your login credentials',
    'Help us personalize your experience',
    "We'll calculate your daily targets",
  ]

  // ─── EMAIL SENT STATE ─────────────────────────────────────
  if (emailSent) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: '24px 16px',
      }}>
        <div className="auth-bg" />
        <div style={{ width: '100%', maxWidth: 440, textAlign: 'center' }} className="animate-fade-in">
          <div style={{
            width: 72, height: 72,
            background: 'linear-gradient(135deg, #059669, #10b981)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 8px 32px rgba(16, 185, 129, 0.4)',
            fontSize: 32,
          }}>
            ✉️
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }} className="gradient-text">
            Check your email!
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 8 }}>
            We sent a confirmation link to:
          </p>
          <p style={{ color: '#E8742A', fontSize: 15, fontWeight: 600, marginBottom: 24 }}>
            {form.email}
          </p>

          <div className="glass-card" style={{ padding: 20, textAlign: 'left', marginBottom: 20 }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>
              1. Open your email inbox<br />
              2. Click the <strong style={{ color: 'var(--text-primary)' }}>Confirm your email</strong> link<br />
              3. You&apos;ll be automatically signed in ✓
            </p>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            Didn&apos;t receive it? Check your spam folder.
          </p>

          <Link href="/login" style={{
            display: 'inline-block',
            padding: '11px 24px',
            background: 'rgba(232,116,42,0.12)',
            border: '1px solid rgba(232,116,42,0.35)',
            borderRadius: 12,
            color: '#E8742A',
            fontWeight: 600,
            fontSize: 14,
            textDecoration: 'none',
          }}>
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  // ─── REGISTRATION FORM ────────────────────────────────────
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      position: 'relative',
      padding: '20px 16px 40px',
      overflowY: 'auto',
    }}>
      <div className="auth-bg" />

      <div style={{ width: '100%', maxWidth: 480 }} className="animate-fade-in">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '0 auto 10px' }}>
            <Image src="/logo.png" alt="FetchDieto" width={90} height={90}
              style={{ borderRadius: 16, boxShadow: '0 6px 24px rgba(232,116,42,0.20)' }}
              priority
            />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }} className="gradient-text">
            FetchDieto
          </h1>
          <p style={{ color: '#6B6F8A', fontSize: 13 }}>Start your health journey today</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, justifyContent: 'center' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: s <= step ? 'linear-gradient(135deg, #E8742A, #F5A623)' : '#F0EBE3',
                border: s === step ? '2px solid #E8742A' : '1px solid #EDE4D8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                color: s <= step ? 'white' : '#A0A4BF',
                transition: 'all 0.3s',
                flexShrink: 0,
              }}>{s}</div>
              {s < 3 && <div style={{
                width: 32, height: 2,
                background: s < step ? '#E8742A' : '#EDE4D8',
                borderRadius: 2, transition: 'all 0.3s',
              }} />}
            </div>
          ))}
        </div>

        <div className="glass-card" style={{ padding: 'clamp(16px, 5vw, 24px)' }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 2 }}>{stepTitles[step - 1]}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 18 }}>{stepDescriptions[step - 1]}</p>

          {/* ── STEP 1: Account ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="input-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input
                    id="reg-name" type="text" autoComplete="name" className="input-field"
                    style={{ paddingLeft: 40 }} placeholder="Rohit Bhardwaj"
                    value={form.name} onChange={e => update('name', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="input-label">Email address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input
                    id="reg-email" type="email" inputMode="email" autoComplete="email" className="input-field"
                    style={{ paddingLeft: 40 }} placeholder="you@example.com"
                    value={form.email} onChange={e => update('email', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="input-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input
                    id="reg-password" type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password" className="input-field"
                    style={{ paddingLeft: 40, paddingRight: 48 }} placeholder="Min 6 characters"
                    value={form.password} onChange={e => update('password', e.target.value)}
                  />
                  <button
                    type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button
                id="btn-next-step1"
                className="btn-primary"
                style={{ marginTop: 4, width: '100%' }}
                onClick={() => {
                  if (!form.name.trim()) { toast.error('Please enter your name'); return }
                  if (!form.email.trim()) { toast.error('Please enter your email'); return }
                  if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
                  setStep(2)
                }}
              >
                Continue <ChevronRight size={16} style={{ display: 'inline', marginLeft: 4 }} />
              </button>
            </div>
          )}

          {/* ── STEP 2: Body Stats ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
                <div>
                  <label className="input-label">Weight (kg)</label>
                  <input id="reg-weight" type="number" inputMode="decimal" className="input-field" placeholder="70"
                    value={form.weight} onChange={e => update('weight', e.target.value)} />
                </div>
                <div>
                  <label className="input-label">Height (cm)</label>
                  <input id="reg-height" type="number" inputMode="decimal" className="input-field" placeholder="170"
                    value={form.height} onChange={e => update('height', e.target.value)} />
                </div>
                <div>
                  <label className="input-label">Age</label>
                  <input id="reg-age" type="number" inputMode="numeric" className="input-field" placeholder="25"
                    value={form.age} onChange={e => update('age', e.target.value)} />
                </div>
                <div>
                  <label className="input-label">Gender</label>
                  <select id="reg-gender" className="input-field" value={form.gender}
                    onChange={e => update('gender', e.target.value)} style={{ cursor: 'pointer' }}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="input-label">Activity Level</label>
                <select id="reg-activity" className="input-field" value={form.activity_level}
                  onChange={e => update('activity_level', e.target.value)} style={{ cursor: 'pointer' }}>
                  <option value="sedentary">Sedentary (desk job)</option>
                  <option value="light">Light (1-3x/week)</option>
                  <option value="moderate">Moderate (3-5x/week)</option>
                  <option value="active">Active (6-7x/week)</option>
                  <option value="very_active">Very Active (2x/day)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setStep(1)}>
                  <ChevronLeft size={15} style={{ display: 'inline', marginRight: 4 }} /> Back
                </button>
                <button id="btn-next-step2" className="btn-primary" style={{ flex: 2 }} onClick={() => setStep(3)}>
                  Continue <ChevronRight size={15} style={{ display: 'inline', marginLeft: 4 }} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Goal ── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="input-label" style={{ marginBottom: 10 }}>Your Goal</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { value: 'lose', label: '🔥 Lose Weight', desc: 'Calorie deficit to burn fat' },
                    { value: 'maintain', label: '⚖️ Maintain Weight', desc: 'Stay at current weight' },
                    { value: 'gain', label: '💪 Gain Muscle', desc: 'Calorie surplus to build mass' },
                  ].map(opt => (
                    <div
                      key={opt.value}
                      id={`goal-${opt.value}`}
                      onClick={() => update('goal', opt.value)}
                      style={{
                        padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                        border: `1px solid ${form.goal === opt.value ? 'rgba(232,116,42,0.45)' : '#EDE4D8'}`,
                        background: form.goal === opt.value ? 'rgba(232,116,42,0.08)' : '#ffffff',
                        transition: 'all 0.2s',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{opt.label}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{opt.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Macro preview */}
              <div style={{ background: 'rgba(232,116,42,0.06)', border: '1px solid rgba(232,116,42,0.18)', borderRadius: 12, padding: 14 }}>
                <p style={{ fontSize: 11, color: '#E8742A', fontWeight: 600, marginBottom: 10, letterSpacing: '0.5px' }}>📊 YOUR DAILY TARGETS</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                  {[
                    { label: 'Calories', value: macros.calories, unit: 'kcal' },
                    { label: 'Protein', value: macros.protein, unit: 'g' },
                    { label: 'Carbs', value: macros.carbs, unit: 'g' },
                    { label: 'Fat', value: macros.fat, unit: 'g' },
                  ].map(m => (
                    <div key={m.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#E8742A' }}>{m.value}</div>
                      <div style={{ fontSize: 9, color: '#A0A4BF', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{m.unit}</div>
                      <div style={{ fontSize: 10, color: '#6B6F8A', marginTop: 1 }}>{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setStep(2)}>
                  <ChevronLeft size={15} style={{ display: 'inline', marginRight: 4 }} /> Back
                </button>
                <button
                  id="btn-create-account"
                  className="btn-primary"
                  style={{ flex: 2, opacity: loading ? 0.7 : 1 }}
                  onClick={handleRegister}
                  disabled={loading}
                >
                  {loading ? 'Creating...' : '🚀 Start Journey'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 16, color: 'var(--text-secondary)', fontSize: 14, paddingBottom: 8 }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#E8742A', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

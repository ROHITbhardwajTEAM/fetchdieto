'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notConfirmed, setNotConfirmed] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setNotConfirmed(false)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
        setNotConfirmed(true)
      } else if (msg.includes('invalid login') || msg.includes('invalid credentials') || msg.includes('wrong')) {
        toast.error('Incorrect email or password')
      } else {
        toast.error(error.message)
      }
    } else {
      toast.success('Welcome back!')
      router.push('/dashboard')
      router.refresh()
    }
    setLoading(false)
  }

  const handleResend = async () => {
    if (!email) { toast.error('Please enter your email first'); return }
    setResendLoading(true)
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Confirmation email sent! Check your inbox 📧')
    }
    setResendLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      padding: '24px 16px',
      overflowY: 'auto',
    }}>
      <div className="auth-bg" />

      <div style={{ width: '100%', maxWidth: 420 }} className="animate-fade-in">
        {/* Logo — large FetchDieto cat */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ margin: '0 auto 14px', display: 'flex', justifyContent: 'center' }}>
            <Image
              src="/logo.png"
              alt="FetchDieto"
              width={140}
              height={140}
              style={{
                borderRadius: 20,
                boxShadow: '0 8px 32px rgba(232,116,42,0.20)',
              }}
              priority
            />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }} className="gradient-text">
            Welcome
          </h1>
          <p style={{ color: '#6B6F8A', fontSize: 14 }}>
            Sign in to continue your health journey
          </p>
        </div>

        {/* Card */}
        <div className="glass-card" style={{ padding: 'clamp(18px, 5vw, 28px)' }}>

          {/* ── Email not confirmed banner ── */}
          {notConfirmed && (
            <div style={{
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.3)',
              borderRadius: 12,
              padding: '14px 16px',
              marginBottom: 18,
            }}>
              <p style={{ color: '#fbbf24', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                ✉️ Email not confirmed
              </p>
              <p style={{ color: 'rgba(251,191,36,0.75)', fontSize: 13, marginBottom: 10, lineHeight: 1.5 }}>
                Click the link in your email inbox to confirm your account, then try logging in again.
              </p>
              <button
                id="btn-resend-email"
                onClick={handleResend}
                disabled={resendLoading}
                style={{
                  background: 'rgba(251,191,36,0.15)',
                  border: '1px solid rgba(251,191,36,0.35)',
                  borderRadius: 8,
                  color: '#fbbf24',
                  fontSize: 13, fontWeight: 600,
                  padding: '8px 14px',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  opacity: resendLoading ? 0.6 : 1,
                  WebkitTapHighlightColor: 'transparent',
                  width: '100%',
                }}
              >
                {resendLoading ? 'Sending...' : 'Resend confirmation email'}
              </button>
            </div>
          )}

          {/* ── Login Form ── */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="input-label">Email address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  id="input-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className="input-field"
                  style={{ paddingLeft: 40 }}
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="input-label" style={{ margin: 0 }}>Password</label>
                <Link href="/forgot-password" style={{ fontSize: 13, color: '#E8742A', textDecoration: 'none', fontWeight: 500 }}>
                  Forgot?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  id="input-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input-field"
                  style={{ paddingLeft: 40, paddingRight: 48 }}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                    padding: 6, display: 'flex', alignItems: 'center',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              id="btn-email-login"
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: 4, opacity: loading ? 0.7 : 1, width: '100%' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-secondary)', fontSize: 14 }}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={{ color: '#E8742A', fontWeight: 600, textDecoration: 'none' }}>
            Create one free
          </Link>
        </p>
      </div>
    </div>
  )
}

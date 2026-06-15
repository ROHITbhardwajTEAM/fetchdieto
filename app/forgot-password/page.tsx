'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Mail, Zap, ArrowLeft, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      toast.error(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <div className="auth-bg" />

      <div style={{ width: '100%', maxWidth: 440, padding: '0 24px' }} className="animate-fade-in">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 56, height: 56,
            background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 32px rgba(124, 58, 237, 0.4)',
          }}>
            <Zap size={28} color="white" fill="white" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }} className="gradient-text">
            Forgot Password?
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
            No worries, we&apos;ll send you a reset link
          </p>
        </div>

        <div className="glass-card" style={{ padding: 32 }}>
          {sent ? (
            /* Success state */
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: 64, height: 64,
                background: 'rgba(34, 197, 94, 0.15)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                border: '1px solid rgba(34, 197, 94, 0.3)',
              }}>
                <CheckCircle size={32} color="#22c55e" />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Check your email!</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                We sent a password reset link to<br />
                <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                Didn&apos;t receive it? Check your spam folder or{' '}
                <button
                  onClick={() => setSent(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--purple-light)', cursor: 'pointer', fontWeight: 600, fontSize: 13, padding: 0 }}
                >
                  try again
                </button>
              </p>
            </div>
          ) : (
            /* Form state */
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="input-label">Email address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="input-forgot-email"
                    type="email"
                    className="input-field"
                    style={{ paddingLeft: 42 }}
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button
                id="btn-send-reset"
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{ marginTop: 8, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-secondary)', fontSize: 14 }}>
          <Link href="/login" style={{ color: 'var(--purple-light)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}

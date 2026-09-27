'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, User, Eye, EyeOff, BarChart3, ShieldCheck } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password) {
      setError('Please enter both username and password.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        router.push('/admin')
        router.refresh()
      } else {
        setError(data.error || 'Login failed. Check your credentials.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 30% 40%, rgba(232,116,42,0.10) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(245,166,35,0.08) 0%, transparent 60%), #FAF6F0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px', fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'linear-gradient(135deg, #E8742A, #F59653)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(232,116,42,0.30)'
          }}>
            <BarChart3 size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#2D3561', margin: '0 0 6px' }}>
            Admin Panel
          </h1>
          <p style={{ fontSize: 14, color: '#6B6F8A', margin: 0 }}>
            NutriTrack · Secure Admin Access
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          background: '#fff', border: '1px solid #EDE4D8', borderRadius: 20,
          padding: '32px 28px', boxShadow: '0 8px 40px rgba(45,53,97,0.10)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <ShieldCheck size={18} color="#E8742A" />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#2D3561' }}>Sign in to continue</span>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Username */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6B6F8A', marginBottom: 6 }}>
                Username
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: '#A0A4BF', pointerEvents: 'none'
                }} />
                <input
                  id="admin-username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoComplete="username"
                  className="input-field"
                  style={{ paddingLeft: 36 }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6B6F8A', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: '#A0A4BF', pointerEvents: 'none'
                }} />
                <input
                  id="admin-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  className="input-field"
                  style={{ paddingLeft: 36, paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#A0A4BF',
                    padding: 4, display: 'flex', alignItems: 'center'
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.25)',
                borderRadius: 10, padding: '10px 14px',
                color: '#E74C3C', fontSize: 13, fontWeight: 500
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="admin-login-btn"
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: 15, marginTop: 4 }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <span style={{
                    width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    display: 'inline-block', animation: 'spin 0.7s linear infinite'
                  }} />
                  Signing in…
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                  <ShieldCheck size={16} /> Sign In
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', fontSize: 12, color: '#A0A4BF', marginTop: 20 }}>
          🔒 This panel is restricted to administrators only.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

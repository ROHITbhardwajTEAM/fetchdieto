'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, KeyRound, BarChart3, X, Eye, EyeOff } from 'lucide-react'

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ current: '', newPw: '', confirm: '' })
  const [showCur, setShowCur] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (form.newPw !== form.confirm) {
      setMsg({ type: 'err', text: 'New passwords do not match.' })
      return
    }
    if (form.newPw.length < 6) {
      setMsg({ type: 'err', text: 'Password must be at least 6 characters.' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.newPw }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg({ type: 'ok', text: 'Password changed successfully!' })
        setForm({ current: '', newPw: '', confirm: '' })
        setTimeout(() => onClose(), 1500)
      } else {
        setMsg({ type: 'err', text: data.error || 'Failed to change password.' })
      }
    } catch {
      setMsg({ type: 'err', text: 'Network error. Try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(45,53,97,0.40)',
      backdropFilter: 'blur(4px)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{
        background: '#fff', border: '1px solid #EDE4D8', borderRadius: 20,
        padding: '28px', width: '100%', maxWidth: 420,
        boxShadow: '0 16px 60px rgba(45,53,97,0.14)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <KeyRound size={20} color="#E8742A" />
            <span style={{ fontWeight: 700, fontSize: 17, color: '#2D3561' }}>Change Password</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A0A4BF', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Current Password', key: 'current', show: showCur, toggle: () => setShowCur(v => !v) },
            { label: 'New Password', key: 'newPw', show: showNew, toggle: () => setShowNew(v => !v) },
            { label: 'Confirm New Password', key: 'confirm', show: showNew, toggle: () => setShowNew(v => !v) },
          ].map(field => (
            <div key={field.key}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6B6F8A', marginBottom: 6 }}>
                {field.label}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={field.show ? 'text' : 'password'}
                  value={form[field.key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  className="input-field"
                  style={{ paddingRight: 40 }}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                />
                <button type="button" onClick={field.toggle} style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#A0A4BF', padding: 4
                }}>
                  {field.show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          ))}

          {msg && (
            <div style={{
              background: msg.type === 'ok' ? 'rgba(39,174,96,0.08)' : 'rgba(231,76,60,0.08)',
              border: `1px solid ${msg.type === 'ok' ? 'rgba(39,174,96,0.25)' : 'rgba(231,76,60,0.25)'}`,
              borderRadius: 10, padding: '10px 14px',
              color: msg.type === 'ok' ? '#27AE60' : '#E74C3C', fontSize: 13
            }}>
              {msg.type === 'ok' ? '✅' : '⚠️'} {msg.text}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ width: '100%' }}>Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%' }}>
              {loading ? 'Saving…' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [showChangePw, setShowChangePw] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF6F0' }}>
      {/* Top Admin Navbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: '#ffffff', borderBottom: '1px solid #EDE4D8',
        padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 60, boxShadow: '0 2px 12px rgba(45,53,97,0.05)'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg,#E8742A,#F59653)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <BarChart3 size={17} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#2D3561', lineHeight: 1 }}>NutriTrack Admin</div>
            <div style={{ fontSize: 11, color: '#A0A4BF', lineHeight: 1, marginTop: 2 }}>Analytics Dashboard</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setShowChangePw(true)}
            className="btn-secondary"
            style={{ gap: 6, padding: '7px 14px', fontSize: 13 }}
          >
            <KeyRound size={14} />
            Change Password
          </button>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 10, border: '1.5px solid rgba(231,76,60,0.3)',
              background: 'rgba(231,76,60,0.06)', color: '#E74C3C',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              transition: 'all 0.15s'
            }}
          >
            <LogOut size={14} />
            {loggingOut ? 'Logging out…' : 'Logout'}
          </button>
        </div>
      </div>

      {/* Page Content */}
      {children}

      {/* Change Password Modal */}
      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}
    </div>
  )
}

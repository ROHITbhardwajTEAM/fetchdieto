'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, Plus, Trash2, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

interface Reminder {
  id: string
  title: string
  reminder_time: string
  is_enabled: boolean
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', reminder_time: '' })
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default')
  const supabase = createClient()

  const loadReminders = useCallback(async (uid: string) => {
    const res = await fetch(`/api/reminders?userId=${uid}`)
    if (res.ok) setReminders(await res.json())
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) { setUserId(data.user.id); loadReminders(data.user.id) }
    })
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission)
    }
  }, [supabase, loadReminders])



  const requestNotifications = async () => {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setNotifPermission(perm)
    if (perm === 'granted') {
      toast.success('🔔 Notifications enabled! Alarms will fire even when your phone is locked.')
      // Immediately subscribe this device to Web Push
      if ('serviceWorker' in navigator && 'PushManager' in window && userId) {
        try {
          const reg = await navigator.serviceWorker.ready
          const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY
          if (vapidKey) {
            const existing = await reg.pushManager.getSubscription()
            const padding = '='.repeat((4 - (vapidKey.length % 4)) % 4)
            const b64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/')
            const raw = window.atob(b64)
            const key = new Uint8Array([...raw].map(c => c.charCodeAt(0)))
            const sub = existing ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
            await fetch('/api/push/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                subscription: sub.toJSON(),
                tzOffsetMins: new Date().getTimezoneOffset(), // e.g. IST = -330
              }),
            })
          }
        } catch { /* ignore */ }
      }
    } else {
      toast.error('Notifications blocked. Enable in browser settings.')
    }
  }

  const addReminder = async () => {
    if (!userId || !form.title || !form.reminder_time) return toast.error('Please fill all fields')
    const res = await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, ...form, is_enabled: true }),
    })
    if (res.ok) {
      const reminder = await res.json()
      setReminders(prev => [...prev, reminder])
      setForm({ title: '', reminder_time: '' })
      setShowModal(false)
      toast.success('Reminder set! ⏰')
    }
  }

  const toggleReminder = async (r: Reminder) => {
    await fetch(`/api/reminders/${r.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_enabled: !r.is_enabled }),
    })
    setReminders(prev => prev.map(rem => rem.id === r.id ? { ...rem, is_enabled: !rem.is_enabled } : rem))
  }

  const deleteReminder = async (id: string) => {
    await fetch(`/api/reminders/${id}`, { method: 'DELETE' })
    setReminders(prev => prev.filter(r => r.id !== id))
    toast.success('Reminder deleted')
  }

  const QUICK_REMINDERS = [
    { title: '🌅 Morning Workout', time: '06:30' },
    { title: '🥤 Drink Water', time: '10:00' },
    { title: '🥗 Lunch Time', time: '13:00' },
    { title: '💪 Protein Shake', time: '16:00' },
    { title: '🌙 Dinner Prep', time: '18:30' },
    { title: '😴 Sleep Time', time: '22:00' },
  ]

  return (
    <div style={{ width: '100%' }}>
      {/* Header — CSS Grid: title left, button right */}
      <div className="page-header animate-fade-in">
        <div className="page-header-text">
          <h1>Reminders</h1>
          <p>Never miss a meal or workout</p>
        </div>
        <button id="btn-add-reminder" className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Reminder
        </button>
      </div>

      {/* Notification banner */}
      {notifPermission !== 'granted' && (
        <div className="glass-card animate-fade-in animate-fade-in-delay-1"
          style={{ padding: '14px 20px', marginBottom: 20, border: '1px solid rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.05)', overflow: 'hidden' }}>
          <div className="notif-banner">
            <Bell size={20} color="#f59e0b" style={{ flexShrink: 0 }} />
            <div className="notif-banner-text">
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, color: '#1e1f2e' }}>Enable push notifications</p>
              <p style={{ color: '#6b7280', fontSize: 12 }}>Get alerted when your reminders fire</p>
            </div>
            <button id="btn-enable-notifications" className="btn-primary" onClick={requestNotifications}
              style={{ fontSize: 13, flexShrink: 0, padding: '8px 16px' }}>
              Enable
            </button>
          </div>
        </div>
      )}

      {/* Reminders list */}
      <div className="glass-card reminders-list-card animate-fade-in animate-fade-in-delay-2" style={{ padding: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#2D3561' }}>
          Active Reminders <span style={{ fontSize: 13, color: '#A0A4BF', fontWeight: 400 }}>({reminders.filter(r => r.is_enabled).length} active)</span>
        </h2>

        {reminders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⏰</div>
            <p style={{ color: '#6b7280', marginBottom: 16 }}>No reminders set yet</p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button className="btn-primary" onClick={() => setShowModal(true)}>
                <Plus size={16} /> Set your first reminder
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reminders.map(r => (
              <div key={r.id} className="reminder-card" style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px',
                borderRadius: 12,
                border: `1px solid ${r.is_enabled ? 'rgba(232,116,42,0.25)' : '#EDE4D8'}`,
                background: r.is_enabled ? 'rgba(232,116,42,0.05)' : '#FDFAF7',
                transition: 'all 0.2s',
              }}>
                <div className="reminder-icon" style={{ width: 42, height: 42, borderRadius: 11, background: r.is_enabled ? 'rgba(232,116,42,0.12)' : '#F0EBE3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={19} color={r.is_enabled ? '#E8742A' : '#A0A4BF'} />
                </div>
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <div className="reminder-title" style={{ fontWeight: 600, fontSize: 14, color: r.is_enabled ? '#2D3561' : '#A0A4BF', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
                  <div className="reminder-sub" style={{ fontSize: 12, color: '#6B6F8A', marginTop: 2 }}>Daily at {r.reminder_time}</div>
                </div>
                <label className="toggle" style={{ flexShrink: 0 }}>
                  <input type="checkbox" checked={r.is_enabled} onChange={() => toggleReminder(r)} />
                  <span className="toggle-slider" />
                </label>
                <button onClick={() => deleteReminder(r.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 8, borderRadius: 8, transition: 'all 0.2s', flexShrink: 0 }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444' }}
                  onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#9ca3af' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal-content">
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>New Reminder</h2>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>Quick picks or custom:</p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {QUICK_REMINDERS.map(q => (
                <button key={q.title} onClick={() => setForm({ title: q.title, reminder_time: q.time })}
                  style={{
                    padding: '5px 11px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                    background: form.title === q.title ? 'rgba(232,116,42,0.12)' : '#FAF4EE',
                    border: `1px solid ${form.title === q.title ? 'rgba(232,116,42,0.40)' : '#EDE4D8'}`,
                    color: form.title === q.title ? '#E8742A' : '#6B6F8A',
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
                  }}>{q.title}</button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="input-label">Reminder Title</label>
                <input id="reminder-title" className="input-field" placeholder="e.g. 💪 Post-workout protein" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="input-label">Time (daily)</label>
                <input id="reminder-time" type="time" className="input-field" value={form.reminder_time} onChange={e => setForm(f => ({ ...f, reminder_time: e.target.value }))} />
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button id="btn-confirm-add-reminder" className="btn-primary" onClick={addReminder}>Set Reminder</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

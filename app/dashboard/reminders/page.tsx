'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Clock, Wifi, WifiOff } from 'lucide-react'
import toast from 'react-hot-toast'

interface Reminder {
  id: string
  title: string
  reminder_time: string
  is_enabled: boolean
}

const ALARM_SOUNDS = [
  { id: 'rising_beeps',  label: '🔔 Rising Beeps',   desc: '4 ascending tones' },
  { id: 'gentle_chime', label: '🎵 Gentle Chime',    desc: 'Soft descending chime' },
  { id: 'alert_buzz',   label: '🚨 Alert Buzz',      desc: 'Triple square buzz' },
  { id: 'melody',       label: '🎶 Melody',           desc: 'Short happy tune' },
  { id: 'water_drop',   label: '💧 Water Drop',      desc: 'Single pluck drop' },
  { id: 'classic_bell', label: '🔊 Classic Bell',    desc: 'Bell with harmonics' },
  { id: 'digital_pulse',label: '⚡ Digital Pulse',   desc: 'Fast sawtooth pulses' },
  { id: 'soft_ping',    label: '🔵 Soft Ping',       desc: 'Two gentle pings' },
]

// ─── Sync reminders to Service Worker ────────────────────────────────────────
function syncToSW(reminders: Reminder[]) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  navigator.serviceWorker.ready.then(reg => {
    reg.active?.postMessage({ type: 'SYNC_REMINDERS', reminders })
  }).catch(() => {})
}

// ─── Register SW ──────────────────────────────────────────────────────────────
async function registerSW(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false
  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    return true
  } catch { return false }
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', reminder_time: '' })
  const [alarmSound, setAlarmSound] = useState<string>('rising_beeps')
  const [isMobile, setIsMobile] = useState<boolean>(false)
  const [swReady, setSwReady] = useState<boolean>(false)
  const [isOnline, setIsOnline] = useState<boolean>(true)
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>('default')
  const supabase = createClient()
  const syncedRef = useRef(false)

  const loadReminders = useCallback(async (uid: string) => {
    const res = await fetch(`/api/reminders?userId=${uid}`)
    if (res.ok) {
      const data = await res.json()
      setReminders(data)
      syncToSW(data)  // sync to SW on load
    }
  }, [])

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Online / offline
  useEffect(() => {
    const online = () => setIsOnline(true)
    const offline = () => setIsOnline(false)
    setIsOnline(navigator.onLine)
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline) }
  }, [])

  // Register SW + request notification permission
  useEffect(() => {
    registerSW().then(ok => {
      setSwReady(ok)
      if (ok && 'Notification' in window) {
        setNotifPerm(Notification.permission)
        // Auto-request if not yet decided
        if (Notification.permission === 'default') {
          Notification.requestPermission().then(p => setNotifPerm(p))
        }
      }
    })

    const saved = localStorage.getItem('fetchdieto_alarm_sound')
    if (saved) setAlarmSound(saved)
  }, [])

  // Load user + reminders
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) { setUserId(data.user.id); loadReminders(data.user.id) }
    })
  }, [supabase, loadReminders])

  // Sync to SW whenever reminders change
  useEffect(() => {
    if (reminders.length > 0 || syncedRef.current) {
      syncToSW(reminders)
      syncedRef.current = true
    }
  }, [reminders])

  // Listen for alarm fires from SW (in case app is open)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'ALARM_FIRE') {
        window.location.href = `/alarm?id=${e.data.reminderId}&title=${encodeURIComponent(e.data.reminderTitle)}`
      }
    }
    navigator.serviceWorker?.addEventListener('message', handler)
    return () => navigator.serviceWorker?.removeEventListener('message', handler)
  }, [])

  const selectAlarmSound = (id: string) => {
    setAlarmSound(id)
    localStorage.setItem('fetchdieto_alarm_sound', id)
  }

  // Preview the alarm sound in-browser
  const previewSound = (soundId: string) => {
    try {
      const AudioCtx = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!
      const ctx = new AudioCtx()
      if (soundId === 'rising_beeps') {
        ;[660, 770, 880, 1100].forEach((freq, i) => {
          const osc = ctx.createOscillator(); const gain = ctx.createGain()
          osc.connect(gain); gain.connect(ctx.destination); osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.38)
          gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.38)
          gain.gain.linearRampToValueAtTime(0.45, ctx.currentTime + i * 0.38 + 0.04)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.38 + 0.28)
          osc.start(ctx.currentTime + i * 0.38); osc.stop(ctx.currentTime + i * 0.38 + 0.30)
        }); setTimeout(() => ctx.close(), 1920)
      } else if (soundId === 'gentle_chime') {
        ;[1046, 880, 784, 659].forEach((freq, i) => {
          const osc = ctx.createOscillator(); const gain = ctx.createGain()
          osc.connect(gain); gain.connect(ctx.destination); osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.45)
          gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.45)
          gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.45 + 0.05)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.45 + 0.40)
          osc.start(ctx.currentTime + i * 0.45); osc.stop(ctx.currentTime + i * 0.45 + 0.42)
        }); setTimeout(() => ctx.close(), 2200)
      } else if (soundId === 'alert_buzz') {
        ;[0, 0.28, 0.56].forEach(t => {
          const osc = ctx.createOscillator(); const gain = ctx.createGain()
          osc.connect(gain); gain.connect(ctx.destination); osc.type = 'square'
          osc.frequency.setValueAtTime(440, ctx.currentTime + t)
          gain.gain.setValueAtTime(0.25, ctx.currentTime + t); gain.gain.setValueAtTime(0, ctx.currentTime + t + 0.18)
          osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + 0.20)
        }); setTimeout(() => ctx.close(), 900)
      } else if (soundId === 'melody') {
        ;[523, 659, 784, 880, 784, 659, 523].forEach((freq, i) => {
          const osc = ctx.createOscillator(); const gain = ctx.createGain()
          osc.connect(gain); gain.connect(ctx.destination); osc.type = 'triangle'
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.18)
          gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18)
          gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + i * 0.18 + 0.03)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.16)
          osc.start(ctx.currentTime + i * 0.18); osc.stop(ctx.currentTime + i * 0.18 + 0.17)
        }); setTimeout(() => ctx.close(), 1600)
      } else if (soundId === 'water_drop') {
        const osc = ctx.createOscillator(); const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination); osc.type = 'sine'
        osc.frequency.setValueAtTime(1200, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.35)
        gain.gain.setValueAtTime(0.5, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.42); setTimeout(() => ctx.close(), 600)
      } else if (soundId === 'classic_bell') {
        ;[[440, 0.5], [880, 0.3], [1320, 0.15]].forEach(([freq, vol]) => {
          const osc = ctx.createOscillator(); const gain = ctx.createGain()
          osc.connect(gain); gain.connect(ctx.destination); osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, ctx.currentTime)
          gain.gain.setValueAtTime(vol as number, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5)
          osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.52)
        }); setTimeout(() => ctx.close(), 1800)
      } else if (soundId === 'digital_pulse') {
        ;[0, 0.15, 0.30, 0.45, 0.60].forEach(t => {
          const osc = ctx.createOscillator(); const gain = ctx.createGain()
          osc.connect(gain); gain.connect(ctx.destination); osc.type = 'sawtooth'
          osc.frequency.setValueAtTime(660, ctx.currentTime + t)
          gain.gain.setValueAtTime(0.2, ctx.currentTime + t); gain.gain.setValueAtTime(0, ctx.currentTime + t + 0.09)
          osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + 0.10)
        }); setTimeout(() => ctx.close(), 900)
      } else if (soundId === 'soft_ping') {
        ;[0, 0.5].forEach((t, i) => {
          const osc = ctx.createOscillator(); const gain = ctx.createGain()
          osc.connect(gain); gain.connect(ctx.destination); osc.type = 'sine'
          osc.frequency.setValueAtTime(i === 0 ? 880 : 1046, ctx.currentTime + t)
          gain.gain.setValueAtTime(0.4, ctx.currentTime + t)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.45)
          osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + 0.47)
        }); setTimeout(() => ctx.close(), 1200)
      }
    } catch { /* ignore */ }
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
      setReminders(prev => {
        const updated = [...prev, reminder]
        syncToSW(updated)
        return updated
      })
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
    setReminders(prev => {
      const updated = prev.map(rem => rem.id === r.id ? { ...rem, is_enabled: !rem.is_enabled } : rem)
      syncToSW(updated)
      return updated
    })
  }

  const deleteReminder = async (id: string) => {
    await fetch(`/api/reminders/${id}`, { method: 'DELETE' })
    setReminders(prev => {
      const updated = prev.filter(r => r.id !== id)
      syncToSW(updated)
      return updated
    })
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

  // Alarm readiness status
  const alarmActive = swReady && notifPerm === 'granted'
  const alarmPartial = swReady && notifPerm !== 'granted'

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div className="page-header animate-fade-in">
        <div className="page-header-text">
          <h1>Reminders</h1>
          <p>Never miss a meal or workout</p>
        </div>
        <button id="btn-add-reminder" className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Reminder
        </button>
      </div>

      {/* ── Alarm Status Card ── */}
      <div className="glass-card animate-fade-in animate-fade-in-delay-1" style={{
        padding: '16px 20px', marginBottom: 20, overflow: 'hidden',
        border: alarmActive
          ? '1px solid rgba(39,174,96,0.3)'
          : alarmPartial
          ? '1px solid rgba(245,158,11,0.3)'
          : '1px solid rgba(239,68,68,0.3)',
        background: alarmActive
          ? 'rgba(39,174,96,0.05)'
          : alarmPartial
          ? 'rgba(245,158,11,0.05)'
          : 'rgba(239,68,68,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: alarmActive ? 'rgba(39,174,96,0.12)' : alarmPartial ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>
            {alarmActive ? '🔔' : alarmPartial ? '⚠️' : '🔕'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: '#1e1f2e', marginBottom: 2 }}>
              {alarmActive
                ? 'Alarms active — rings on lock screen'
                : alarmPartial
                ? 'Allow notifications to ring on lock screen'
                : 'Enable notifications for lock screen alarms'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {isOnline
                ? <><Wifi size={11} color="#27ae60" /><span style={{ color: '#6b7280', fontSize: 11 }}>Online — synced</span></>
                : <><WifiOff size={11} color="#ef4444" /><span style={{ color: '#6b7280', fontSize: 11 }}>Offline — alarms still work</span></>
              }
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {!alarmActive && (
              <button
                onClick={() => Notification.requestPermission().then(p => setNotifPerm(p))}
                style={{
                  fontSize: 12, padding: '7px 14px', borderRadius: 8, border: 'none',
                  background: 'rgba(245,158,11,0.15)', color: '#d97706',
                  cursor: 'pointer', fontWeight: 600, fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap',
                }}
              >
                Allow
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Alarm Sound Selector Card ── */}
      <div className="glass-card animate-fade-in animate-fade-in-delay-1" style={{ padding: 28, marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: '#2D3561' }}>🔊 Alarm Sound</h2>
        <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 18 }}>Choose the sound that plays when a reminder fires.</p>

        {isMobile ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
            <select
              value={alarmSound}
              onChange={e => selectAlarmSound(e.target.value)}
              style={{
                flex: 1, minWidth: 0, padding: '10px 38px 10px 12px', borderRadius: 12, fontSize: 15, fontWeight: 600,
                border: '2px solid rgba(232,116,42,0.4)', background: '#FDFAF7',
                color: '#2D3561', fontFamily: 'Inter, sans-serif', cursor: 'pointer',
                WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23E8742A' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {ALARM_SOUNDS.map(s => (
                <option key={s.id} value={s.id}>{s.label} — {s.desc}</option>
              ))}
            </select>
            <button
              onClick={() => previewSound(alarmSound)}
              title="Preview selected sound"
              style={{
                width: 42, height: 42, minWidth: 42, borderRadius: 12, border: 'none', flexShrink: 0,
                background: 'rgba(232,116,42,0.12)', color: '#E8742A',
                cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700,
              }}
            >▶</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {ALARM_SOUNDS.map(s => (
              <div key={s.id}
                onClick={() => selectAlarmSound(s.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                  borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
                  border: `2px solid ${alarmSound === s.id ? 'rgba(232,116,42,0.6)' : '#EDE4D8'}`,
                  background: alarmSound === s.id ? 'rgba(232,116,42,0.07)' : '#FDFAF7',
                }}
              >
                <button
                  onClick={e => { e.stopPropagation(); previewSound(s.id) }}
                  title="Preview"
                  style={{
                    width: 30, height: 30, borderRadius: 8, border: 'none', flexShrink: 0,
                    background: alarmSound === s.id ? 'rgba(232,116,42,0.15)' : '#F0EBE3',
                    color: alarmSound === s.id ? '#E8742A' : '#9ca3af',
                    cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >▶</button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: alarmSound === s.id ? '#E8742A' : '#2D3561' }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{s.desc}</div>
                </div>
                {alarmSound === s.id && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E8742A', flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

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

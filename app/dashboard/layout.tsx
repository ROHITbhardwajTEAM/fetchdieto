'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, UtensilsCrossed, Bell, BarChart2,
  User, LogOut,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

// Convert base64 VAPID public key to Uint8Array (required by PushManager)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)))
}

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/meals', icon: UtensilsCrossed, label: 'Meals' },
  { href: '/dashboard/reminders', icon: Bell, label: 'Reminders' },
  { href: '/dashboard/reports', icon: BarChart2, label: 'Reports' },
  { href: '/dashboard/profile', icon: User, label: 'Profile' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default')
  const userIdRef = useRef<string | null>(null)
  const firedRef = useRef<Set<string>>(new Set()) // track fired reminders per minute

  // ── Get user, check notification permission & register SW ────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) userIdRef.current = data.user.id
    })
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission)
    }
    // Register the Service Worker (needed for background push)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {/* ignore in dev */})
    }
  }, [supabase])

  // ── Subscribe to Web Push when notification permission is granted ─────
  useEffect(() => {
    if (notifPermission !== 'granted') return
    if (!userIdRef.current) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY
    if (!vapidKey) return

    const subscribe = async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        // Check if already subscribed
        const existing = await reg.pushManager.getSubscription()
        const sub = existing ?? await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
        })
        // Save subscription + timezone to server
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userIdRef.current,
            subscription: sub.toJSON(),
            tzOffsetMins: new Date().getTimezoneOffset(), // e.g. IST = -330
          }),
        })
      } catch { /* ignore — user may have blocked */ }
    }
    subscribe()
  }, [notifPermission])

  // ── Unlock AudioContext on first user gesture ────────
  // Browsers block audio until the user interacts with the page.
  useEffect(() => {
    const unlock = () => {
      try {
        const ctx = new (window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)()
        ctx.resume().then(() => ctx.close())
      } catch { /* ignore */ }
      window.removeEventListener('click', unlock)
      window.removeEventListener('touchstart', unlock)
      window.removeEventListener('keydown', unlock)
    }
    window.addEventListener('click', unlock)
    window.addEventListener('touchstart', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('click', unlock)
      window.removeEventListener('touchstart', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  // ── Alarm sound using Web Audio API ──────────────────
  const playAlarm = () => {
    try {
      const AudioCtx = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!
      const ctx = new AudioCtx()

      // 4 rising beeps: each beep is 0.18s, separated by 0.22s gaps
      const beeps = [660, 770, 880, 1100]
      beeps.forEach((freq, i) => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.38)

        // Envelope: fast attack, smooth decay
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.38)
        gain.gain.linearRampToValueAtTime(0.45, ctx.currentTime + i * 0.38 + 0.04)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.38 + 0.28)

        osc.start(ctx.currentTime + i * 0.38)
        osc.stop(ctx.currentTime + i * 0.38 + 0.30)
      })

      // Close the context after the last beep
      setTimeout(() => ctx.close(), beeps.length * 380 + 400)
    } catch { /* audio not supported */ }
  }

  // ── Global reminder checker (works on every page) ────
  useEffect(() => {
    const checkReminders = async () => {
      if (!userIdRef.current) return
      const now = new Date()
      const minuteKey = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

      // ── Fetch reminders (with offline fallback to localStorage cache) ──
      type ReminderItem = { id: string; title: string; reminder_time: string; is_enabled: boolean }
      const CACHE_KEY = `fetchdieto_reminders_${userIdRef.current}`
      let reminders: ReminderItem[] = []

      try {
        const res = await fetch(`/api/reminders?userId=${userIdRef.current}`)
        if (res.ok) {
          reminders = await res.json()
          // ✅ Online: update the local cache for next offline use
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(reminders)) } catch { /* storage full */ }
        }
      } catch {
        // ❌ Offline: fall back to cached reminders
        try {
          const cached = localStorage.getItem(CACHE_KEY)
          if (cached) reminders = JSON.parse(cached)
        } catch { /* ignore */ }
      }

      if (reminders.length === 0) return

      // Reset fired set every minute
      const currentMinuteId = `${now.toDateString()}-${minuteKey}`
      if (!firedRef.current.has('__minute__' + currentMinuteId)) {
        firedRef.current = new Set(['__minute__' + currentMinuteId])
      }

      const due = reminders
        .filter(r => r.is_enabled && r.reminder_time.startsWith(minuteKey))
        .filter(r => !firedRef.current.has(r.id + currentMinuteId))

      if (due.length === 0) return

      // 🔔 Play alarm sound once for all due reminders
      playAlarm()

      due.forEach(r => {
        firedRef.current.add(r.id + currentMinuteId)

        // In-app toast (stays for 12 s)
        toast(`⏰ ${r.title}`, {
          duration: 12000,
          style: { fontWeight: 600, fontSize: '15px', padding: '14px 18px' },
          icon: '🔔',
        })

        // Browser push notification (shows even if tab is in background)
        if (notifPermission === 'granted') {
          try {
            new Notification('FetchDieto Reminder 🔔', {
              body: r.title,
              icon: '/favicon.ico',
              tag: r.id,
              renotify: true,
            } as NotificationOptions)
          } catch { /* ignore */ }
        }
      })
    }

    // Align first check to the next :00 second of the minute
    const now = new Date()
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 200

    let minuteInterval: ReturnType<typeof setInterval>
    const alignTimeout = setTimeout(() => {
      checkReminders() // fire exactly at the minute boundary
      minuteInterval = setInterval(checkReminders, 60_000)
    }, msToNextMinute)

    return () => {
      clearTimeout(alignTimeout)
      clearInterval(minuteInterval)
    }
  }, [notifPermission])


  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success('Signed out successfully')
    router.push('/login')
    router.refresh()
  }

  return (
    <div>
      {/* ── DESKTOP SIDEBAR ─────────────────────────── */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`} style={{ width: 240 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, padding: '0 8px' }}>
          <Image
            src="/logo.png"
            alt="FetchDieto logo"
            width={38}
            height={38}
            style={{ borderRadius: 10, flexShrink: 0 }}
          />
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1 }} className="gradient-text">FetchDieto</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Diet Dashboard</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}>
                <Icon size={18} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Sign out */}
        <button onClick={handleSignOut}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
            borderRadius: 12, border: 'none', background: 'none',
            color: '#9ca3af', fontSize: 14, fontWeight: 500,
            cursor: 'pointer', width: '100%', transition: 'all 0.2s',
            fontFamily: 'Inter, sans-serif',
          }}
          onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444' }}
          onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#9ca3af' }}
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>

      {/* ── SIDEBAR OVERLAY (mobile) ─────────────────── */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── MOBILE TOP BAR ──────────────────────────── */}
      <div className="mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Image
            src="/logo.png"
            alt="FetchDieto logo"
            width={32}
            height={32}
            style={{ borderRadius: 8 }}
          />
          <span style={{ fontWeight: 800, fontSize: 15 }} className="gradient-text">FetchDieto</span>
        </div>

        {/* Sign out on mobile topbar */}
        <button onClick={handleSignOut}
          style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)',
            borderRadius: 8, color: '#ef4444', padding: '6px 12px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}>
          Sign Out
        </button>
      </div>

      {/* ── MAIN CONTENT ────────────────────────────── */}
      <main className="main-content">
        {children}
      </main>

      {/* ── MOBILE BOTTOM NAV ───────────────────────── */}
      <nav className="mobile-bottom-nav">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-nav-btn ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

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

// Sync reminders to Service Worker cache
function syncRemindersToSW(reminders: { id: string; title: string; reminder_time: string; is_enabled: boolean }[]) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  navigator.serviceWorker.ready.then(reg => {
    reg.active?.postMessage({ type: 'SYNC_REMINDERS', reminders })
  }).catch(() => {})
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
  const userIdRef = useRef<string | null>(null)
  const firedRef = useRef<Set<string>>(new Set())

  // ── Register SW + silently subscribe to Web Push ────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        userIdRef.current = data.user.id
        // Register SW then silently subscribe to push (no UI)
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/sw.js')
            .then(async () => {
              if (!('PushManager' in window)) return
              const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY
              if (!vapidKey) return
              try {
                // Request notification permission silently (first-time only)
                let perm = Notification.permission
                if (perm === 'default') {
                  perm = await Notification.requestPermission()
                }
                if (perm !== 'granted') return

                const reg = await navigator.serviceWorker.ready
                const padding = '='.repeat((4 - (vapidKey.length % 4)) % 4)
                const b64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/')
                const raw = window.atob(b64)
                const key = new Uint8Array([...raw].map(c => c.charCodeAt(0)))

                const existing = await reg.pushManager.getSubscription()
                const sub = existing ?? await reg.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: key,
                })

                // Save to server (timezone so server knows what local time it is)
                await fetch('/api/push/subscribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: data.user.id,
                    subscription: sub.toJSON(),
                    tzOffsetMins: new Date().getTimezoneOffset(),
                  }),
                })
              } catch { /* ignore — permission denied or push not supported */ }
            })
            .catch(() => {})
        }
      }
    })
  }, [supabase])

  // ── Listen for SW alarm fire message → go to alarm page ─────────────
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'ALARM_FIRE') {
        router.push(`/alarm?id=${e.data.reminderId}&title=${encodeURIComponent(e.data.reminderTitle)}`)
      }
    }
    navigator.serviceWorker?.addEventListener('message', handler)
    return () => navigator.serviceWorker?.removeEventListener('message', handler)
  }, [router])



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



  // ── Fallback in-page reminder checker (when app is open/foreground) ──
  useEffect(() => {
    const checkReminders = async () => {
      if (!userIdRef.current) return
      const now = new Date()
      const minuteKey = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

      type ReminderItem = { id: string; title: string; reminder_time: string; is_enabled: boolean }
      const CACHE_KEY = `fetchdieto_reminders_${userIdRef.current}`
      let reminders: ReminderItem[] = []

      try {
        const res = await fetch(`/api/reminders?userId=${userIdRef.current}`)
        if (res.ok) {
          reminders = await res.json()
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(reminders)) } catch {}
          // Sync to SW so it can fire alarms offline
          syncRemindersToSW(reminders)
        }
      } catch {
        try {
          const cached = localStorage.getItem(CACHE_KEY)
          if (cached) reminders = JSON.parse(cached)
        } catch {}
      }

      if (reminders.length === 0) return

      const currentMinuteId = `${now.toDateString()}-${minuteKey}`
      if (!firedRef.current.has('__minute__' + currentMinuteId)) {
        firedRef.current = new Set(['__minute__' + currentMinuteId])
      }

      const due = reminders
        .filter(r => r.is_enabled && r.reminder_time.startsWith(minuteKey))
        .filter(r => !firedRef.current.has(r.id + currentMinuteId))

      if (due.length === 0) return

      due.forEach(r => {
        firedRef.current.add(r.id + currentMinuteId)
        // Navigate to full-screen alarm page
        router.push(`/alarm?id=${r.id}&title=${encodeURIComponent(r.title)}`)
      })
    }

    const now = new Date()
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 200
    let minuteInterval: ReturnType<typeof setInterval>
    const alignTimeout = setTimeout(() => {
      checkReminders()
      minuteInterval = setInterval(checkReminders, 60_000)
    }, msToNextMinute)

    return () => { clearTimeout(alignTimeout); clearInterval(minuteInterval) }
  }, [router])


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

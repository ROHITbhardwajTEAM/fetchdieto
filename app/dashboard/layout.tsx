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
import { useState } from 'react'

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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success('Signed out successfully')
    router.push('/login')
    router.refresh()
  }

  return (
    <div>
      {/* ── DESKTOP SIDEBAR ─────────────────────────── */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
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
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Health Dashboard</div>
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

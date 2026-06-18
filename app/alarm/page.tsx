'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

// ─── Audio Engine ────────────────────────────────────────────────────────────
function buildAlarmSound(ctx: AudioContext, soundId: string) {
  const nodes: OscillatorNode[] = []

  const scheduleLoop = (startAt: number) => {
    const loopDuration = 3.0 // seconds per loop cycle

    if (soundId === 'rising_beeps') {
      ;[660, 770, 880, 1100].forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'sine'
        const t = startAt + i * 0.38
        osc.frequency.setValueAtTime(freq, t)
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.6, t + 0.04)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32)
        osc.start(t); osc.stop(t + 0.34)
        nodes.push(osc)
      })
    } else if (soundId === 'gentle_chime') {
      ;[1046, 880, 784, 659].forEach((freq, i) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination); osc.type = 'sine'
        const t = startAt + i * 0.45
        gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.5, t + 0.05)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.44)
        osc.frequency.setValueAtTime(freq, t); osc.start(t); osc.stop(t + 0.46)
        nodes.push(osc)
      })
    } else if (soundId === 'alert_buzz') {
      ;[0, 0.28, 0.56].forEach(off => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination); osc.type = 'square'
        const t = startAt + off
        osc.frequency.setValueAtTime(440, t)
        gain.gain.setValueAtTime(0.3, t); gain.gain.setValueAtTime(0, t + 0.20)
        osc.start(t); osc.stop(t + 0.22); nodes.push(osc)
      })
    } else if (soundId === 'melody') {
      ;[523, 659, 784, 880, 784, 659, 523].forEach((freq, i) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination); osc.type = 'triangle'
        const t = startAt + i * 0.22
        gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.5, t + 0.04)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.20)
        osc.frequency.setValueAtTime(freq, t); osc.start(t); osc.stop(t + 0.22)
        nodes.push(osc)
      })
    } else if (soundId === 'water_drop') {
      const osc = ctx.createOscillator(); const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination); osc.type = 'sine'
      osc.frequency.setValueAtTime(1200, startAt)
      osc.frequency.exponentialRampToValueAtTime(300, startAt + 0.4)
      gain.gain.setValueAtTime(0.6, startAt)
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.45)
      osc.start(startAt); osc.stop(startAt + 0.47); nodes.push(osc)
    } else if (soundId === 'classic_bell') {
      ;[[440, 0.5], [880, 0.3], [1320, 0.15]].forEach(([freq, vol]) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination); osc.type = 'sine'
        osc.frequency.setValueAtTime(freq as number, startAt)
        gain.gain.setValueAtTime(vol as number, startAt)
        gain.gain.exponentialRampToValueAtTime(0.001, startAt + 1.8)
        osc.start(startAt); osc.stop(startAt + 1.82); nodes.push(osc)
      })
    } else if (soundId === 'digital_pulse') {
      ;[0, 0.15, 0.30, 0.45, 0.60].forEach(off => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination); osc.type = 'sawtooth'
        const t = startAt + off
        osc.frequency.setValueAtTime(660, t)
        gain.gain.setValueAtTime(0.25, t); gain.gain.setValueAtTime(0, t + 0.10)
        osc.start(t); osc.stop(t + 0.11); nodes.push(osc)
      })
    } else { // soft_ping
      ;[0, 0.55].forEach((off, i) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination); osc.type = 'sine'
        const t = startAt + off
        osc.frequency.setValueAtTime(i === 0 ? 880 : 1046, t)
        gain.gain.setValueAtTime(0.5, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
        osc.start(t); osc.stop(t + 0.52); nodes.push(osc)
      })
    }
    return loopDuration
  }

  return { scheduleLoop }
}

// ─── Inner Component (needs Suspense for useSearchParams) ───────────────────
function AlarmInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [ringing, setRinging] = useState(false)
  const [title, setTitle] = useState('')
  const [timeStr, setTimeStr] = useState('')
  const [pulse, setPulse] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const loopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const vibIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const soundId = useRef<string>('rising_beeps')

  // ── Start the alarm ─────────────────────────────────────────
  const startAlarm = useCallback((alarmTitle: string) => {
    if (ringing) return
    setRinging(true)
    setTitle(alarmTitle)
    setTimeStr(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))

    // Load saved sound preference
    const saved = localStorage.getItem('fetchdieto_alarm_sound')
    if (saved) soundId.current = saved

    // Wake Lock: keep screen on
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(lock => {
        wakeLockRef.current = lock
      }).catch(() => {})
    }

    // Vibration pattern (continuous loop every 3s)
    if ('vibrate' in navigator) {
      const vibPattern = [800, 300, 800, 300, 1200, 500]
      navigator.vibrate(vibPattern)
      vibIntervalRef.current = setInterval(() => navigator.vibrate(vibPattern), 4000)
    }

    // Audio loop
    try {
      const AudioCtx = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!
      const ctx = new AudioCtx()
      audioCtxRef.current = ctx
      const engine = buildAlarmSound(ctx, soundId.current)

      const loop = () => {
        if (!audioCtxRef.current) return
        const dur = engine.scheduleLoop(ctx.currentTime)
        loopTimerRef.current = setTimeout(loop, dur * 1000)
      }
      loop()
    } catch { /* audio not available */ }

    // Pulse animation
    const pulseInterval = setInterval(() => setPulse(p => !p), 800)
    return () => clearInterval(pulseInterval)
  }, [ringing])

  // ── Stop everything ─────────────────────────────────────────
  const stopAlarm = useCallback(() => {
    setRinging(false)
    setDismissed(true)

    if (loopTimerRef.current) clearTimeout(loopTimerRef.current)
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null }
    if (vibIntervalRef.current) clearInterval(vibIntervalRef.current)
    if ('vibrate' in navigator) navigator.vibrate(0)
    if (wakeLockRef.current) { wakeLockRef.current.release(); wakeLockRef.current = null }
  }, [])

  const dismissAlarm = useCallback(() => {
    stopAlarm()
    setTimeout(() => router.push('/dashboard/reminders'), 800)
  }, [stopAlarm, router])

  const snoozeAlarm = useCallback(() => {
    stopAlarm()
    // Re-ring after 5 min
    setTimeout(() => {
      setDismissed(false)
      startAlarm(title)
    }, 5 * 60 * 1000)
    setTimeout(() => router.push('/dashboard/reminders'), 800)
  }, [stopAlarm, startAlarm, title, router])

  // ── Listen for SW message ───────────────────────────────────
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'ALARM_FIRE') {
        startAlarm(e.data.reminderTitle || 'Reminder')
      }
    }
    navigator.serviceWorker?.addEventListener('message', handler)
    return () => navigator.serviceWorker?.removeEventListener('message', handler)
  }, [startAlarm])

  // ── Auto-start from URL params ──────────────────────────────
  useEffect(() => {
    const urlTitle = searchParams.get('title')
    if (urlTitle) {
      startAlarm(decodeURIComponent(urlTitle))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Cleanup on unmount ──────────────────────────────────────
  useEffect(() => () => stopAlarm(), [stopAlarm])

  if (dismissed && !ringing) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ fontSize: 64 }}>✅</div>
        <p style={{ color: '#fff', fontSize: 20, marginTop: 16, fontWeight: 600 }}>Alarm dismissed</p>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8 }}>Going back…</p>
      </div>
    )
  }

  if (!ringing) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ fontSize: 56 }}>⏰</div>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, marginTop: 16 }}>Waiting for alarm…</p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 0,
      background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      fontFamily: 'Inter, sans-serif', overflow: 'hidden', position: 'relative',
      padding: '20px',
    }}>
      {/* Animated rings */}
      <div style={{
        position: 'absolute', borderRadius: '50%',
        width: pulse ? 320 : 280, height: pulse ? 320 : 280,
        border: '2px solid rgba(232,116,42,0.15)',
        transition: 'all 0.8s ease', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', borderRadius: '50%',
        width: pulse ? 240 : 210, height: pulse ? 240 : 210,
        border: '2px solid rgba(232,116,42,0.25)',
        transition: 'all 0.8s ease', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)', pointerEvents: 'none',
      }} />

      {/* Bell icon */}
      <div style={{
        width: 120, height: 120, borderRadius: '50%',
        background: 'linear-gradient(135deg, #E8742A, #f59e0b)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 56, marginBottom: 32, zIndex: 1,
        boxShadow: '0 0 60px rgba(232,116,42,0.5)',
        animation: pulse ? undefined : undefined,
        transform: `rotate(${pulse ? -8 : 8}deg)`,
        transition: 'transform 0.4s ease',
      }}>
        🔔
      </div>

      {/* Time */}
      <div style={{
        fontSize: 56, fontWeight: 800, color: '#ffffff',
        letterSpacing: '-2px', zIndex: 1, lineHeight: 1,
        marginBottom: 8,
      }}>
        {timeStr}
      </div>

      {/* Title */}
      <div style={{
        fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.9)',
        marginBottom: 8, zIndex: 1, textAlign: 'center',
      }}>
        {title}
      </div>
      <div style={{
        fontSize: 14, color: 'rgba(255,255,255,0.5)',
        marginBottom: 52, zIndex: 1,
      }}>
        Your reminder is ringing
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 16, zIndex: 1, width: '100%', maxWidth: 340 }}>
        {/* Snooze */}
        <button
          onClick={snoozeAlarm}
          style={{
            flex: 1, padding: '18px 0', borderRadius: 20, border: 'none',
            background: 'rgba(255,255,255,0.12)', color: '#fff',
            fontSize: 16, fontWeight: 600, cursor: 'pointer',
            backdropFilter: 'blur(12px)',
            fontFamily: 'Inter, sans-serif',
            transition: 'all 0.2s',
          }}
        >
          😴 Snooze 5m
        </button>

        {/* Dismiss */}
        <button
          onClick={dismissAlarm}
          style={{
            flex: 1, padding: '18px 0', borderRadius: 20, border: 'none',
            background: 'linear-gradient(135deg, #E8742A, #f59e0b)',
            color: '#fff', fontSize: 16, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            boxShadow: '0 8px 30px rgba(232,116,42,0.4)',
            transition: 'all 0.2s',
          }}
        >
          ✓ Dismiss
        </button>
      </div>
    </div>
  )
}

// ─── Page Export (Suspense boundary for useSearchParams) ─────────────────────
export default function AlarmPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
      }}>
        <div style={{ fontSize: 48 }}>⏰</div>
      </div>
    }>
      <AlarmInner />
    </Suspense>
  )
}

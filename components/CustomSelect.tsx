'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface CustomSelectProps {
  id?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
}

export function CustomSelect({ id, value, onChange, options, placeholder = 'Select…' }: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<React.CSSProperties>({})
  const [mounted, setMounted] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)

  // portal needs document to be ready
  useEffect(() => { setMounted(true) }, [])

  // ── Calculate dropdown position synchronously when button is clicked ──
  // Uses getBoundingClientRect() which is always viewport-accurate.
  // The dropdown is rendered via React Portal into document.body so it is
  // NEVER inside a CSS transform ancestor (which would break position:fixed).
  const openDropdown = () => {
    if (!btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - r.bottom
    const estimatedH = Math.min(options.length * 48, 280)

    if (spaceBelow >= estimatedH || spaceBelow >= r.top) {
      // Open downward
      setPos({ top: r.bottom + 2, left: r.left, width: r.width, maxHeight: Math.max(spaceBelow - 8, 80) })
    } else {
      // Open upward
      const h = Math.min(estimatedH, r.top - 8)
      setPos({ top: r.top - h - 2, left: r.left, width: r.width, maxHeight: h })
    }
    setOpen(true)
  }

  // close when clicking outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (!btnRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // close on scroll (position would be stale)
  useEffect(() => {
    if (!open) return
    const handler = () => setOpen(false)
    window.addEventListener('scroll', handler, true)
    return () => window.removeEventListener('scroll', handler, true)
  }, [open])

  // close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const dropdownPanel = (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        ...pos,
        zIndex: 99999,
        background: '#ffffff',
        border: '1.5px solid #e8eaf0',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.16), 0 2px 8px rgba(99,102,241,0.10)',
        overflowY: 'auto',
        animation: 'csDropdownIn 0.16s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {options.map((opt, idx) => {
        const isSel = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onMouseDown={e => {
              // mousedown fires before the outside-click handler — stop propagation
              e.stopPropagation()
              onChange(opt.value)
              setOpen(false)
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: '11px 14px',
              background: isSel ? '#f0f1ff' : '#ffffff',
              border: 'none',
              borderBottom: idx < options.length - 1 ? '1px solid #f3f4f8' : 'none',
              fontSize: 14,
              fontWeight: isSel ? 600 : 400,
              color: isSel ? '#6366f1' : '#1e1f2e',
              fontFamily: 'Inter, sans-serif',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span>{opt.label}</span>
            {isSel && <Check size={15} color="#6366f1" strokeWidth={2.5} />}
          </button>
        )
      })}

      <style>{`
        @keyframes csDropdownIn {
          from { opacity: 0; transform: translateY(-4px) scaleY(0.97); }
          to   { opacity: 1; transform: translateY(0)   scaleY(1);    }
        }
      `}</style>
    </div>
  )

  return (
    <>
      <button
        ref={btnRef}
        id={id}
        type="button"
        onClick={() => open ? setOpen(false) : openDropdown()}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '10px 14px',
          background: '#ffffff',
          border: `1.5px solid ${open ? '#6366f1' : '#e8eaf0'}`,
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 500,
          color: selected ? '#1e1f2e' : '#9ca3af',
          fontFamily: 'Inter, sans-serif',
          cursor: 'pointer',
          boxShadow: open ? '0 0 0 3px rgba(99,102,241,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
          transition: 'border-color 0.18s, box-shadow 0.18s',
          outline: 'none',
          userSelect: 'none',
        }}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <span style={{
          display: 'flex', alignItems: 'center',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
          color: '#6366f1', flexShrink: 0,
        }}>
          <ChevronDown size={16} strokeWidth={2.5} />
        </span>
      </button>

      {/* Portal: rendered directly into document.body — no overflow/transform ancestors */}
      {mounted && open && createPortal(dropdownPanel, document.body)}
    </>
  )
}

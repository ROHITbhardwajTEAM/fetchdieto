'use client'

import { useEffect, useRef, useState } from 'react'
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
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)

  /* close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* close on Escape */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', userSelect: 'none' }}>
      {/* Trigger */}
      <button
        id={id}
        type="button"
        onClick={() => setOpen(o => !o)}
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
          boxShadow: open
            ? '0 0 0 3px rgba(99,102,241,0.12)'
            : '0 1px 3px rgba(0,0,0,0.04)',
          transition: 'border-color 0.18s, box-shadow 0.18s',
          outline: 'none',
        }}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <span style={{
          display: 'flex', alignItems: 'center',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
          color: '#6366f1',
          flexShrink: 0,
        }}>
          <ChevronDown size={16} strokeWidth={2.5} />
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          zIndex: 200,
          background: '#ffffff',
          border: '1.5px solid #e8eaf0',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(99,102,241,0.08)',
          overflow: 'hidden',
          animation: 'dropdownIn 0.18s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {options.map((opt, idx) => {
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '10px 14px',
                  background: isSelected ? '#f0f1ff' : '#ffffff',
                  border: 'none',
                  borderBottom: idx < options.length - 1 ? '1px solid #f3f4f8' : 'none',
                  fontSize: 14,
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? '#6366f1' : '#1e1f2e',
                  fontFamily: 'Inter, sans-serif',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => {
                  if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = '#f9faff'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = isSelected ? '#f0f1ff' : '#ffffff'
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={15} color="#6366f1" strokeWidth={2.5} />}
              </button>
            )
          })}
        </div>
      )}

      {/* Drop-in animation keyframe injected once */}
      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
    </div>
  )
}

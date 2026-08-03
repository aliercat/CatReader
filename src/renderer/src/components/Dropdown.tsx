import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'

export interface DropdownOption<T extends string> {
  value: T
  label: string
}

export default function Dropdown<T extends string>({
  value,
  options,
  onChange,
  ariaLabel
}: {
  value: T
  options: DropdownOption<T>[]
  onChange: (value: T) => void
  ariaLabel: string
}): JSX.Element {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocMouseDown = (e: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const current = options.find((o) => o.value === value)

  return (
    <div className={`dropdown${open ? ' open' : ''}`} ref={rootRef}>
      <button
        className="dropdown-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{current?.label ?? ''}</span>
        <svg
          viewBox="0 0 10 6"
          width="10"
          height="6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M1 1l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div className="dropdown-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((o) => (
            <button
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`dropdown-item${o.value === value ? ' selected' : ''}`}
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
            >
              <span>{o.label}</span>
              {o.value === value && (
                <svg
                  viewBox="0 0 12 12"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2 6.2l2.6 2.6L10 3.2" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

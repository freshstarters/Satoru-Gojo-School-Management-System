import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type SelectOption = {
  value: string
  label: string
  disabled?: boolean
}

export function Select({
  value,
  options,
  onChange,
  ariaLabel,
  className = '',
  disabled = false,
}: {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  ariaLabel: string
  className?: string
  disabled?: boolean
}) {
  const listId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [box, setBox] = useState({ left: 0, top: 0, width: 0 })
  const selected = options.find((option) => option.value === value)
  const searchable = options.length > 7
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return options
    return options.filter((option) => option.label.toLowerCase().includes(needle))
  }, [options, query])

  useEffect(() => {
    if (!open) return
    function onPointer(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (triggerRef.current?.contains(target)) return
      if (target instanceof Element && target.closest('[data-select-portal="true"]')) return
      setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActive((index) => Math.min(visible.length - 1, index + 1))
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActive((index) => Math.max(0, index - 1))
      }
      if (event.key === 'Enter' && visible[active] && !visible[active].disabled) {
        event.preventDefault()
        onChange(visible[active].value)
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [active, onChange, open, visible])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`custom-select-trigger crm-input w-full px-2.5 py-1.5 ${open ? 'is-open' : ''} ${className}`.trim()}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => {
          const rect = triggerRef.current?.getBoundingClientRect()
          if (!rect) return
          setBox({
            left: Math.max(12, Math.min(rect.left, window.innerWidth - rect.width - 12)),
            top: rect.bottom + 8,
            width: rect.width,
          })
          setQuery('')
          setActive(Math.max(0, options.findIndex((option) => option.value === value)))
          setOpen((current) => !current)
        }}
      >
        <span className="truncate">{selected?.label ?? 'Select'}</span>
        <svg className="custom-select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open
        ? createPortal(
            <div
              id={listId}
              role="listbox"
              data-select-portal="true"
              className="custom-select-portal"
              style={{ left: box.left, top: box.top, width: box.width }}
            >
              {searchable ? (
                <div className="custom-select-search-wrap">
                  <input
                    className="crm-input w-full px-2.5 py-1.5 text-xs"
                    value={query}
                    placeholder="Search"
                    aria-label={`${ariaLabel} search`}
                    onChange={(event) => {
                      setQuery(event.target.value)
                      setActive(0)
                    }}
                  />
                </div>
              ) : null}
              {visible.length === 0 ? <div className="custom-select-empty">No matching options</div> : null}
              {visible.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  disabled={option.disabled}
                  className={`custom-select-option ${option.value === value ? 'is-selected' : ''} ${index === active ? 'is-active' : ''}`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => {
                    if (option.disabled) return
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

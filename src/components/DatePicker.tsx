import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatIsoDate, isoDate, parseIsoDate, todayInMonrovia } from '../utils/datetime.ts'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function DatePicker({
  value,
  onChange,
  ariaLabel,
  className = '',
  disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  className?: string
  disabled?: boolean
}) {
  const panelId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [box, setBox] = useState({ left: 0, top: 0 })
  const parsed = parseIsoDate(value)
  const today = todayInMonrovia()
  const [cursor, setCursor] = useState(() => parsed ?? parseIsoDate(today) ?? { year: 2026, month: 11, day: 1 })

  useEffect(() => {
    if (!open) return
    function onPointer(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (triggerRef.current?.contains(target)) return
      if (target instanceof Element && target.closest('[data-date-portal="true"]')) return
      setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const cells = monthCells(cursor.year, cursor.month)
  const monthLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(cursor.year, cursor.month - 1, 1)))

  function shiftMonth(delta: number) {
    const date = new Date(Date.UTC(cursor.year, cursor.month - 1 + delta, 1))
    setCursor({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: 1 })
  }

  return (
    <div className={`custom-date-wrap ${className}`.trim()}>
      <svg className="custom-date-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className={`custom-select-trigger custom-date-trigger crm-input w-full py-1.5 ${value ? 'has-clear' : ''} ${open ? 'is-open' : ''}`}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (disabled) return
          const rect = triggerRef.current?.getBoundingClientRect()
          if (!rect) return
          setBox({
            left: Math.max(12, Math.min(rect.left, window.innerWidth - 288 - 12)),
            top: rect.bottom + 8,
          })
          const next = parseIsoDate(value) ?? parseIsoDate(today)
          if (next) setCursor(next)
          setOpen((current) => !current)
        }}
      >
        <span className={value ? 'text-main' : 'text-sub'}>{value ? formatIsoDate(value) : 'Select a date'}</span>
      </button>
      {value && !disabled ? (
        <button
          type="button"
          className="custom-date-clear"
          aria-label="Clear date"
          onClick={() => onChange('')}
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="6" y1="18" x2="18" y2="6" />
          </svg>
        </button>
      ) : null}
      {open
        ? createPortal(
            <div
              id={panelId}
              data-date-portal="true"
              className="custom-datepicker-portal"
              style={{ left: box.left, top: box.top }}
            >
              <div className="mb-2 flex items-center justify-between">
                <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => shiftMonth(-1)} aria-label="Previous month">
                  Prev
                </button>
                <span className="text-xs font-semibold text-main">{monthLabel}</span>
                <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => shiftMonth(1)} aria-label="Next month">
                  Next
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {WEEKDAYS.map((day) => (
                  <span key={day} className="text-[11px] text-sub">
                    {day}
                  </span>
                ))}
                {cells.map((cell) => {
                  const selected = cell.iso === value
                  const isToday = cell.iso === today
                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      className={`dp-day-btn ${cell.outside ? 'is-outside' : ''} ${isToday ? 'is-today' : ''} ${selected ? 'is-selected' : ''}`}
                      onClick={() => {
                        onChange(cell.iso)
                        setOpen(false)
                      }}
                    >
                      {cell.day}
                    </button>
                  )
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

function monthCells(year: number, month: number) {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cells: { iso: string; day: number; outside: boolean }[] = []
  for (let index = 0; index < firstWeekday; index += 1) {
    const date = new Date(Date.UTC(year, month - 1, index - firstWeekday + 1))
    cells.push({
      iso: isoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()),
      day: date.getUTCDate(),
      outside: true,
    })
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ iso: isoDate(year, month, day), day, outside: false })
  }
  let extra = 1
  while (cells.length % 7 !== 0) {
    const date = new Date(Date.UTC(year, month, extra))
    cells.push({
      iso: isoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()),
      day: date.getUTCDate(),
      outside: true,
    })
    extra += 1
  }
  return cells
}

import { DatePicker } from './DatePicker.tsx'
import { formatIsoDate, monroviaDateParts, todayInMonrovia } from '../utils/datetime.ts'

export function DateTimePicker({
  value,
  onChange,
  ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  ariaLabel: string
}) {
  const parsed = parseWall(value)
  const date = parsed?.date ?? ''
  const hour = parsed?.hour ?? monroviaDateParts().hour
  const minute = parsed?.minute ?? monroviaDateParts().minute

  function commit(nextDate: string, nextHour: number, nextMinute: number) {
    if (!nextDate) {
      onChange('')
      return
    }
    onChange(`${nextDate}T${pad(nextHour)}:${pad(nextMinute)}`)
  }

  return (
    <div className="space-y-2">
      <DatePicker
        ariaLabel={ariaLabel}
        value={date}
        onChange={(nextDate) => commit(nextDate, hour, minute)}
      />
      <div className="flex items-center gap-2">
        <TimeStep
          label="Hour"
          value={hour}
          max={23}
          onChange={(nextHour) => commit(date || todayInMonrovia(), nextHour, minute)}
        />
        <TimeStep
          label="Minute"
          value={minute}
          max={59}
          onChange={(nextMinute) => commit(date || todayInMonrovia(), hour, nextMinute)}
        />
        <span className="text-[11px] text-sub">Africa/Monrovia</span>
      </div>
      {value ? <p className="text-xs text-sub">{formatWall(value)}</p> : null}
    </div>
  )
}

function TimeStep({
  label,
  value,
  max,
  onChange,
}: {
  label: string
  value: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" className="btn-secondary px-2 py-1 text-xs" aria-label={`Previous ${label}`} onClick={() => onChange(value === 0 ? max : value - 1)}>
        -
      </button>
      <span className="num-tabular w-8 text-center text-xs text-main">{pad(value)}</span>
      <button type="button" className="btn-secondary px-2 py-1 text-xs" aria-label={`Next ${label}`} onClick={() => onChange(value === max ? 0 : value + 1)}>
        +
      </button>
    </div>
  )
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function parseWall(value: string) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  return { date: match[1], hour: Number(match[2]), minute: Number(match[3]) }
}

function formatWall(value: string) {
  const parsed = parseWall(value)
  if (!parsed) return ''
  return `${formatIsoDate(parsed.date)}, ${pad(parsed.hour)}:${pad(parsed.minute)}`
}

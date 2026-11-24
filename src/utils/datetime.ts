export const MONROVIA = 'Africa/Monrovia'

const dateTimeFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: MONROVIA,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const dateFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: MONROVIA,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

export function formatMonroviaDateTime(value: Date | string | number) {
  return dateTimeFormat.format(new Date(value))
}

export function formatMonroviaDate(value: Date | string | number) {
  return dateFormat.format(new Date(value))
}

export function monroviaDateParts(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MONROVIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value)
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return {
    year: Number(read('year')),
    month: Number(read('month')),
    day: Number(read('day')),
    hour: Number(read('hour')),
    minute: Number(read('minute')),
  }
}

export function todayInMonrovia() {
  const parts = monroviaDateParts()
  return isoDate(parts.year, parts.month, parts.day)
}

export function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

export function formatIsoDate(value: string) {
  const parts = parseIsoDate(value)
  if (!parts) return ''
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12)))
}

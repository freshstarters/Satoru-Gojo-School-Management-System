import { firstPane, paneById, panesForRole } from '../navigation.ts'

export function destinationFor(next: string, role: string) {
  const fallback = firstPane(role)
  const fallbackPath = fallback ? `/${fallback.id}` : '/'
  if (!next.startsWith('/') || next.startsWith('//')) return fallbackPath
  const path = next.split('?')[0]?.replace(/^\//, '') ?? ''
  const [paneKey, recordId] = path.split('/')
  const query = next.includes('?') ? `?${next.split('?')[1]}` : ''
  if (paneKey === 'students' && recordId) {
    if (!panesForRole(role).some((item) => item.id === 'students')) return fallbackPath
    return `/students/${recordId}${query}`
  }
  if (paneKey === 'teachers' && recordId) {
    if (!panesForRole(role).some((item) => item.id === 'teachers')) return fallbackPath
    return `/teachers/${recordId}${query}`
  }
  if (paneKey === 'parents' && recordId) {
    if (!panesForRole(role).some((item) => item.id === 'parents')) return fallbackPath
    return `/parents/${recordId}${query}`
  }
  const pane = paneById(paneKey ?? '')
  if (!pane) return fallbackPath
  if (!panesForRole(role).some((item) => item.id === pane.id)) return fallbackPath
  return `/${pane.id}`
}

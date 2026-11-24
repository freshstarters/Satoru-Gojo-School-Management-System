import { firstPane, paneById, panesForRole } from '../navigation.ts'

export function destinationFor(next: string, role: string) {
  const fallback = firstPane(role)
  const fallbackPath = fallback ? `/${fallback.id}` : '/'
  if (!next.startsWith('/') || next.startsWith('//')) return fallbackPath
  const id = next.split('?')[0]?.replace(/^\//, '') ?? ''
  const pane = paneById(id)
  if (!pane) return fallbackPath
  if (!panesForRole(role).some((item) => item.id === pane.id)) return fallbackPath
  return `/${pane.id}`
}

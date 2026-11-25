import { apiRequest } from './apiClient.ts'

export type GuardianChild = {
  id: string
  student_id: string
  student_code: string
  student_name: string
  campus_name: string
  classroom_name: string | null
  division: string | null
  grade: string | null
  relationship: string
  relationship_label: string
  relationship_note: string
  is_primary: boolean
  is_financial_responsible: boolean
  lrd_balance_lrd?: number | null
}

export type GuardianRecord = {
  id: string
  full_name: string
  phone: string
  whatsapp_phone: string
  email: string
  residential_zone: string
  occupation: string
  sms_consent: boolean
  status: string
  status_label: string
  portal_status: string
  user_id: string | null
  children: GuardianChild[]
  linked_children_count: number
  family_balance_lrd?: number | null
  updated_at: string
}

export type GuardianListResponse = {
  count: number
  next: string | null
  previous: string | null
  results: GuardianRecord[]
}

export type GuardianFilters = {
  q?: string
  page?: number
  page_size?: number
}

export type GuardianInput = {
  full_name: string
  phone: string
  whatsapp_phone?: string
  email: string
  residential_zone?: string
  occupation?: string
  sms_consent?: boolean
}

export type ChildLinkInput = {
  student_id: string
  relationship: string
  relationship_note?: string
  is_primary?: boolean
  is_financial_responsible?: boolean
}

function query(filters: GuardianFilters) {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.page_size) params.set('page_size', String(filters.page_size))
  const text = params.toString()
  return text ? `?${text}` : ''
}

export function fetchParents(filters: GuardianFilters = {}) {
  return apiRequest<GuardianListResponse>(`/parents/${query(filters)}`)
}

export function fetchParent(id: string) {
  return apiRequest<GuardianRecord>(`/parents/${id}/`)
}

export function createParent(input: GuardianInput) {
  return apiRequest<GuardianRecord>('/parents/', {
    method: 'POST',
    body: input,
    idempotencyKey: crypto.randomUUID(),
  })
}

export function saveParent(id: string, input: Partial<GuardianInput>) {
  return apiRequest<GuardianRecord>(`/parents/${id}/`, {
    method: 'PATCH',
    body: input,
    idempotencyKey: crypto.randomUUID(),
  })
}

export function sendParentInvite(id: string) {
  return apiRequest<GuardianRecord>(`/parents/${id}/send-invite/`, {
    method: 'POST',
    body: {},
    idempotencyKey: crypto.randomUUID(),
  })
}

export function deactivateParent(id: string) {
  return apiRequest<GuardianRecord>(`/parents/${id}/deactivate/`, {
    method: 'POST',
    body: {},
    idempotencyKey: crypto.randomUUID(),
  })
}

export function reactivateParent(id: string) {
  return apiRequest<GuardianRecord>(`/parents/${id}/reactivate/`, {
    method: 'POST',
    body: {},
    idempotencyKey: crypto.randomUUID(),
  })
}

export function linkChild(parentId: string, input: ChildLinkInput) {
  return apiRequest<GuardianChild>(`/parents/${parentId}/children/`, {
    method: 'POST',
    body: input,
    idempotencyKey: crypto.randomUUID(),
  })
}

export function unlinkChild(parentId: string, linkId: string) {
  return apiRequest<void>(`/parents/${parentId}/children/${linkId}/`, {
    method: 'DELETE',
    idempotencyKey: crypto.randomUUID(),
  })
}

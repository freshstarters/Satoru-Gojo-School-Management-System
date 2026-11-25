import { apiRequest } from './apiClient.ts'

export type StaffHomeroom = {
  id: string
  name: string
  campus_name: string
}

export type StaffSubject = {
  id: string
  subject: string
  classroom: string
  campus_name: string
}

export type StaffRecord = {
  id: string
  staff_code: string
  full_name: string
  role: string
  role_label: string
  job_title: string
  division_id: string | null
  division: string | null
  campus_id: string | null
  campus_name: string | null
  qualifications: string
  phone: string
  email: string
  employment_status: string
  employment_status_label: string
  portal_status: string
  user_id: string | null
  homerooms: StaffHomeroom[]
  subjects: StaffSubject[]
  updated_at: string
}

export type StaffListResponse = {
  count: number
  next: string | null
  previous: string | null
  results: StaffRecord[]
}

export type StaffFilters = {
  q?: string
  campus?: string
  division?: string
  page?: number
  page_size?: number
}

export type StaffInput = {
  full_name: string
  role: string
  job_title?: string
  division_id?: string | null
  campus_id?: string | null
  qualifications?: string
  phone: string
  email: string
}

function query(filters: StaffFilters) {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.campus) params.set('campus', filters.campus)
  if (filters.division) params.set('division', filters.division)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.page_size) params.set('page_size', String(filters.page_size))
  const text = params.toString()
  return text ? `?${text}` : ''
}

export function fetchTeachers(filters: StaffFilters = {}) {
  return apiRequest<StaffListResponse>(`/teachers/${query(filters)}`)
}

export function fetchTeacher(id: string) {
  return apiRequest<StaffRecord>(`/teachers/${id}/`)
}

export function createTeacher(input: StaffInput) {
  return apiRequest<StaffRecord>('/teachers/', {
    method: 'POST',
    body: input,
    idempotencyKey: crypto.randomUUID(),
  })
}

export function saveTeacher(id: string, input: Partial<StaffInput>) {
  return apiRequest<StaffRecord>(`/teachers/${id}/`, {
    method: 'PATCH',
    body: input,
    idempotencyKey: crypto.randomUUID(),
  })
}

export function sendTeacherInvite(id: string) {
  return apiRequest<StaffRecord>(`/teachers/${id}/send-invite/`, {
    method: 'POST',
    body: {},
    idempotencyKey: crypto.randomUUID(),
  })
}

export function deactivateTeacher(id: string) {
  return apiRequest<StaffRecord>(`/teachers/${id}/deactivate/`, {
    method: 'POST',
    body: {},
    idempotencyKey: crypto.randomUUID(),
  })
}

export function reactivateTeacher(id: string) {
  return apiRequest<StaffRecord>(`/teachers/${id}/reactivate/`, {
    method: 'POST',
    body: {},
    idempotencyKey: crypto.randomUUID(),
  })
}

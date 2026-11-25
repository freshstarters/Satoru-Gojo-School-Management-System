import { apiRequest } from './apiClient.ts'

export type StudentSummary = {
  total: number
  at_risk: number
  waec_candidates: number
  honor_roll: number
}

export type StudentRecord = {
  id: string
  student_code: string
  full_name: string
  campus_id: string
  campus_name: string
  classroom_id: string | null
  classroom_name: string | null
  division: string | null
  division_id: string | null
  grade: string | null
  grade_id: string | null
  status: string
  status_label: string
  is_waec_candidate: boolean
  date_of_birth: string
  gender: string
  gender_label: string
  catchment_zone: string
  photo_url: string | null
  primary_guardian: string | null
  attendance_pct: number | null
  yearly_avg_pct: number | null
  exam_clearance: string | null
  lrd_balance_lrd: number | null
  updated_at: string
}

export type StudentListResponse = {
  count: number
  next: string | null
  previous: string | null
  results: StudentRecord[]
  summary: StudentSummary
}

export type StudentFilters = {
  q?: string
  campus?: string
  division?: string
  classroom?: string
  grade?: string
  status?: string
  page?: number
  page_size?: number
}

export type WelfareRecord = {
  student_id: string
  allergies: string
  medical_notes: string
  blood_group: string
  emergency_contact: string
  updated_at: string
}

export type PickupRecord = {
  id: string
  student_id: string
  name: string
  relationship: string
  phone: string
  id_note: string
  updated_at: string
}

export type ConductRecord = {
  id: string
  student_id: string
  note_type: string
  note_type_label: string
  severity: string
  severity_label: string
  description: string
  author_id: string
  author_name: string
  created_at: string
}

export type EnrollInput = {
  full_name: string
  campus_id: string
  classroom_id: string
  date_of_birth: string
  gender: string
  catchment_zone?: string
  photo?: File | null
}

function query(filters: StudentFilters) {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.campus) params.set('campus', filters.campus)
  if (filters.division) params.set('division', filters.division)
  if (filters.classroom) params.set('classroom', filters.classroom)
  if (filters.grade) params.set('grade', filters.grade)
  if (filters.status) params.set('status', filters.status)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.page_size) params.set('page_size', String(filters.page_size))
  const text = params.toString()
  return text ? `?${text}` : ''
}

export function fetchStudents(filters: StudentFilters = {}) {
  return apiRequest<StudentListResponse>(`/students/${query(filters)}`)
}

export function fetchStudent(id: string) {
  return apiRequest<StudentRecord>(`/students/${id}/`)
}

export function enrollStudent(input: EnrollInput) {
  if (input.photo) {
    const body = new FormData()
    body.set('full_name', input.full_name)
    body.set('campus_id', input.campus_id)
    body.set('classroom_id', input.classroom_id)
    body.set('date_of_birth', input.date_of_birth)
    body.set('gender', input.gender)
    if (input.catchment_zone) body.set('catchment_zone', input.catchment_zone)
    body.set('photo', input.photo)
    return apiRequest<StudentRecord>('/students/', {
      method: 'POST',
      body,
      idempotencyKey: crypto.randomUUID(),
    })
  }
  return apiRequest<StudentRecord>('/students/', {
    method: 'POST',
    body: {
      full_name: input.full_name,
      campus_id: input.campus_id,
      classroom_id: input.classroom_id,
      date_of_birth: input.date_of_birth,
      gender: input.gender,
      catchment_zone: input.catchment_zone ?? '',
    },
    idempotencyKey: crypto.randomUUID(),
  })
}

export function saveStudent(
  id: string,
  body: Record<string, unknown> & { photo?: File | null },
) {
  const { photo, ...fields } = body
  if (photo) {
    const form = new FormData()
    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined || value === null) continue
      form.set(key, typeof value === 'boolean' ? String(value) : String(value))
    }
    form.set('photo', photo)
    return apiRequest<StudentRecord>(`/students/${id}/`, {
      method: 'PATCH',
      body: form,
      idempotencyKey: crypto.randomUUID(),
    })
  }
  return apiRequest<StudentRecord>(`/students/${id}/`, {
    method: 'PATCH',
    body: fields,
    idempotencyKey: crypto.randomUUID(),
  })
}

export function withdrawStudent(id: string) {
  return apiRequest<StudentRecord>(`/students/${id}/withdraw/`, {
    method: 'POST',
    body: {},
    idempotencyKey: crypto.randomUUID(),
  })
}

export function fetchWelfare(id: string) {
  return apiRequest<WelfareRecord>(`/students/${id}/welfare/`)
}

export function saveWelfare(id: string, body: Partial<WelfareRecord>) {
  return apiRequest<WelfareRecord>(`/students/${id}/welfare/`, {
    method: 'PUT',
    body,
    idempotencyKey: crypto.randomUUID(),
  })
}

export function fetchPickups(id: string) {
  return apiRequest<PickupRecord[]>(`/students/${id}/pickups/`)
}

export function createPickup(
  id: string,
  body: { name: string; relationship: string; phone: string; id_note?: string },
) {
  return apiRequest<PickupRecord>(`/students/${id}/pickups/`, {
    method: 'POST',
    body,
    idempotencyKey: crypto.randomUUID(),
  })
}

export function deletePickup(studentId: string, pickupId: string) {
  return apiRequest<void>(`/students/${studentId}/pickups/${pickupId}/`, {
    method: 'DELETE',
    idempotencyKey: crypto.randomUUID(),
  })
}

export function fetchConduct(id: string) {
  return apiRequest<ConductRecord[]>(`/students/${id}/conduct/`)
}

export function addConduct(
  id: string,
  body: { note_type: string; severity: string; description: string },
) {
  return apiRequest<ConductRecord>(`/students/${id}/conduct/`, {
    method: 'POST',
    body,
    idempotencyKey: crypto.randomUUID(),
  })
}

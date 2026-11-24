import { apiRequest, type FieldErrors } from './apiClient.ts'

export type SchoolSettings = {
  id: string
  school_name: string
  moe_registration_code: string
  lrd_per_usd: string
  pass_threshold: string
  honor_roll_threshold: string
  marking_period_weight: string
  semester_exam_weight: string
  academic_year_id: string | null
  active_marking_period_id: string | null
  updated_at: string
}

export type GradeLevel = {
  id: string
  name: string
  division: string
}

export type CampusRecord = {
  id: string
  code: string
  name: string
  address: string
  catchment_zone: string
  lead_staff: string
  grades_served: GradeLevel[]
  student_count: number
  teacher_count: number
  updated_at: string
}

export type MarkingPeriod = {
  id: string
  code: string
  label: string
  semester: number
  start_date: string | null
  end_date: string | null
  is_locked: boolean
}

export type AcademicYear = {
  id: string
  label: string
  is_current: boolean
  marking_periods: MarkingPeriod[]
  updated_at: string
}

export type ChannelStatus = 'configured' | 'unconfigured'

export type IntegrationStatus = {
  email_smtp: { status: ChannelStatus }
  sms: { status: ChannelStatus; sender_id: string | null }
  whatsapp: { status: ChannelStatus }
  google: { status: ChannelStatus }
  ai: { status: ChannelStatus; provider: string | null }
  mobile_money: { provider: string; status: ChannelStatus }[]
}

export type CampusInput = {
  name: string
  address: string
  catchment_zone: string
  lead_staff: string
  grade_level_ids: string[]
}

function key() {
  return crypto.randomUUID()
}

export function fetchSettings() {
  return apiRequest<SchoolSettings>('/settings/')
}

export function saveSettings(body: Partial<SchoolSettings>, idempotencyKey = key()) {
  return apiRequest<SchoolSettings>('/settings/', { method: 'PATCH', body, idempotencyKey })
}

export function fetchCampuses() {
  return apiRequest<CampusRecord[]>('/campuses/')
}

export function createCampus(body: CampusInput, idempotencyKey = key()) {
  return apiRequest<CampusRecord>('/campuses/', { method: 'POST', body, idempotencyKey })
}

export function saveCampus(id: string, body: CampusInput, idempotencyKey = key()) {
  return apiRequest<CampusRecord>(`/campuses/${id}/`, { method: 'PATCH', body, idempotencyKey })
}

export function deleteCampus(id: string, idempotencyKey = key()) {
  return apiRequest<void>(`/campuses/${id}/`, { method: 'DELETE', idempotencyKey })
}

export function fetchAcademicYears() {
  return apiRequest<AcademicYear[]>('/academic-years/')
}

export function createAcademicYear(label: string, idempotencyKey = key()) {
  return apiRequest<AcademicYear>('/academic-years/', {
    method: 'POST',
    body: { label },
    idempotencyKey,
  })
}

export function saveAcademicYear(
  id: string,
  body: { label?: string; is_current?: boolean; marking_periods?: Partial<MarkingPeriod>[] },
  idempotencyKey = key(),
) {
  return apiRequest<AcademicYear>(`/academic-years/${id}/`, { method: 'PATCH', body, idempotencyKey })
}

export function deleteAcademicYear(id: string, idempotencyKey = key()) {
  return apiRequest<void>(`/academic-years/${id}/`, { method: 'DELETE', idempotencyKey })
}

export function fetchGradeLevels() {
  return apiRequest<GradeLevel[]>('/grade-levels/')
}

export function fetchIntegrationStatus() {
  return apiRequest<IntegrationStatus>('/integrations/status/')
}

export type { FieldErrors }

import { apiRequest } from './apiClient.ts'

export type TeacherRef = {
  id: string
  display_name: string
}

export type SubjectRecord = {
  id: string
  code: string
  name: string
  division: string | null
  is_core: boolean
  is_waec_lab: boolean
}

export type SubjectAssignment = {
  id: string
  subject: SubjectRecord
  teacher: TeacherRef | null
}

export type ClassroomRecord = {
  id: string
  name: string
  campus_id: string
  campus_name: string
  academic_year_id: string
  academic_year_label: string
  grade_level: { id: string; name: string; division: string }
  section_name: string
  homeroom_teacher: TeacherRef | null
  capacity: number
  room_label: string
  enrolled: number
  subjects: SubjectAssignment[]
  updated_at: string
}

export type TimetableSlot = {
  id: string
  classroom_id: string
  classroom_name: string
  campus_id: string
  day_of_week: string
  period_number: number
  period_label: string
  subject: SubjectRecord
  teacher: TeacherRef | null
  room_label: string
  updated_at: string
}

export type UncoveredSlot = TimetableSlot & {
  date: string
  reason: 'unassigned' | 'absent' | string
}

export type UncoveredResponse = {
  date: string
  count: number
  results: UncoveredSlot[]
}

export type ClassroomInput = {
  campus_id: string
  academic_year_id: string
  grade_level_id: string
  section_name: string
  homeroom_teacher_id?: string | null
  capacity: number
  room_label: string
}

export type SubjectAssignmentInput = {
  subject_id: string
  teacher_id?: string | null
}

export type SlotInput = {
  classroom_id?: string
  day_of_week: string
  period_number: number
  subject_id: string
  teacher_id?: string | null
  room_label?: string
}

function key() {
  return crypto.randomUUID()
}

export function fetchSubjects() {
  return apiRequest<SubjectRecord[]>('/subjects/')
}

export function fetchTeacherOptions(campusId?: string) {
  const query = campusId ? `?campus=${encodeURIComponent(campusId)}` : ''
  return apiRequest<TeacherRef[]>(`/classes/teachers/${query}`)
}

export function fetchClassrooms() {
  return apiRequest<ClassroomRecord[]>('/classes/')
}

export function fetchClassroom(id: string) {
  return apiRequest<ClassroomRecord>(`/classes/${id}/`)
}

export function createClassroom(body: ClassroomInput, idempotencyKey = key()) {
  return apiRequest<ClassroomRecord>('/classes/', { method: 'POST', body, idempotencyKey })
}

export function saveClassroom(id: string, body: Partial<ClassroomInput>, idempotencyKey = key()) {
  return apiRequest<ClassroomRecord>(`/classes/${id}/`, { method: 'PATCH', body, idempotencyKey })
}

export function deleteClassroom(id: string, idempotencyKey = key()) {
  return apiRequest<void>(`/classes/${id}/`, { method: 'DELETE', idempotencyKey })
}

export function replaceClassroomSubjects(
  id: string,
  body: SubjectAssignmentInput[],
  idempotencyKey = key(),
) {
  return apiRequest<ClassroomRecord>(`/classes/${id}/subjects/`, {
    method: 'PUT',
    body,
    idempotencyKey,
  })
}

export function fetchTimetable(params?: { classroom?: string; teacher?: string }) {
  const query = new URLSearchParams()
  if (params?.classroom) query.set('classroom', params.classroom)
  if (params?.teacher) query.set('teacher', params.teacher)
  const suffix = query.toString() ? `?${query}` : ''
  return apiRequest<TimetableSlot[]>(`/timetable/${suffix}`)
}

export function createTimetableSlot(body: SlotInput, idempotencyKey = key()) {
  return apiRequest<TimetableSlot>('/timetable/', { method: 'POST', body, idempotencyKey })
}

export function saveTimetableSlot(id: string, body: Partial<SlotInput>, idempotencyKey = key()) {
  return apiRequest<TimetableSlot>(`/timetable/${id}/`, { method: 'PATCH', body, idempotencyKey })
}

export function deleteTimetableSlot(id: string, idempotencyKey = key()) {
  return apiRequest<void>(`/timetable/${id}/`, { method: 'DELETE', idempotencyKey })
}

export function fetchUncovered(date?: string) {
  const query = date ? `?date=${encodeURIComponent(date)}` : ''
  return apiRequest<UncoveredResponse>(`/timetable/uncovered/${query}`)
}

export function recordAbsence(
  body: { teacher_id: string; date: string; reason?: string },
  idempotencyKey = key(),
) {
  return apiRequest<{
    absence: { id: string; teacher: TeacherRef; date: string; reason: string }
    uncovered: UncoveredSlot[]
    count: number
  }>('/timetable/absences/', { method: 'POST', body, idempotencyKey })
}

export function clearAbsence(params: { id?: string; teacher?: string; date?: string }, idempotencyKey = key()) {
  const query = new URLSearchParams()
  if (params.id) query.set('id', params.id)
  if (params.teacher) query.set('teacher', params.teacher)
  if (params.date) query.set('date', params.date)
  return apiRequest<{ uncovered: UncoveredSlot[]; count: number }>(
    `/timetable/absences/?${query}`,
    { method: 'DELETE', idempotencyKey },
  )
}

export function assignSubstitute(
  body: {
    slot_id: string
    date: string
    substitute_teacher_id: string
    reason?: string
  },
  idempotencyKey = key(),
) {
  return apiRequest<{
    substitution: unknown
    uncovered: UncoveredSlot[]
    count: number
  }>('/timetable/substitutions/', { method: 'POST', body, idempotencyKey })
}

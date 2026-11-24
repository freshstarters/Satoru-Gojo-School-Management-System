import { sampleWorkspace } from './fixtures/sampleWorkspace.ts'

export type PaneId =
  | 'dashboard'
  | 'students'
  | 'admissions'
  | 'fees'
  | 'classes'
  | 'attendance'
  | 'grades'
  | 'teachers'
  | 'parents'
  | 'library'
  | 'transport'
  | 'announcements'
  | 'settings'

export type PaneSection = 'Campus Core' | 'Academics' | 'People & Welfare' | 'Operations'

export type Pane = {
  id: PaneId
  label: string
  tooltip: string
  breadcrumb: string
  section: PaneSection
  count: number | null
  money: number | null
  subtitle: string
}

const counts = sampleWorkspace.counts
const amounts = sampleWorkspace.amounts

export const PANES: Pane[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    tooltip: 'Principal Dashboard',
    breadcrumb: 'Principal Dashboard',
    section: 'Campus Core',
    count: null,
    money: amounts.dashboard,
    subtitle: sampleWorkspace.dashboardSubtitle,
  },
  {
    id: 'students',
    label: 'Students',
    tooltip: 'Students Directory',
    breadcrumb: 'Students Directory',
    section: 'Campus Core',
    count: counts.students,
    money: amounts.students,
    subtitle: 'Student records for Sinkor and Paynesville.',
  },
  {
    id: 'admissions',
    label: 'Admissions',
    tooltip: 'Admissions Pipeline',
    breadcrumb: 'Admissions Pipeline',
    section: 'Campus Core',
    count: counts.admissions,
    money: null,
    subtitle: 'Inquiries through enrolment.',
  },
  {
    id: 'fees',
    label: 'Tuition & Fees',
    tooltip: 'Tuition & LRD Fees',
    breadcrumb: 'Tuition & LRD Fees',
    section: 'Campus Core',
    count: counts.fees,
    money: amounts.fees,
    subtitle: 'Liberian dollar fees and receipts.',
  },
  {
    id: 'classes',
    label: 'Classes & Timetable',
    tooltip: 'Classes & Timetable',
    breadcrumb: 'Classes & Timetable',
    section: 'Academics',
    count: counts.classes,
    money: null,
    subtitle: 'Classes, subjects, and the weekly bell.',
  },
  {
    id: 'attendance',
    label: 'Attendance',
    tooltip: 'Daily Attendance',
    breadcrumb: 'Daily Attendance',
    section: 'Academics',
    count: null,
    money: null,
    subtitle: 'Daily roll call.',
  },
  {
    id: 'grades',
    label: 'Grades & WAEC',
    tooltip: 'Grades, Report Cards & WAEC',
    breadcrumb: 'Grades & WAEC',
    section: 'Academics',
    count: null,
    money: null,
    subtitle: 'Marking periods, report cards, and WAEC.',
  },
  {
    id: 'teachers',
    label: 'Teachers & Staff',
    tooltip: 'Teachers & Staff',
    breadcrumb: 'Teachers & Staff',
    section: 'People & Welfare',
    count: counts.teachers,
    money: null,
    subtitle: 'Teaching and support staff.',
  },
  {
    id: 'parents',
    label: 'Parents & Guardians',
    tooltip: 'Parents & Guardians',
    breadcrumb: 'Parents & Guardians',
    section: 'People & Welfare',
    count: counts.parents,
    money: null,
    subtitle: 'Guardians and pickup contacts.',
  },
  {
    id: 'library',
    label: 'Library & Books',
    tooltip: 'Library & Textbooks',
    breadcrumb: 'Library & Textbooks',
    section: 'Operations',
    count: null,
    money: null,
    subtitle: 'Library catalog and textbooks.',
  },
  {
    id: 'transport',
    label: 'Bus Routes',
    tooltip: 'School Bus Routes',
    breadcrumb: 'School Bus Routes',
    section: 'Operations',
    count: null,
    money: null,
    subtitle: 'Routes, drivers, and student rosters.',
  },
  {
    id: 'announcements',
    label: 'Announcements',
    tooltip: 'Announcements & Parent SMS',
    breadcrumb: 'Announcements & SMS',
    section: 'Operations',
    count: counts.announcements,
    money: null,
    subtitle: 'Notices to parents and staff.',
  },
  {
    id: 'settings',
    label: 'Settings & UI Kit',
    tooltip: 'School Settings & UI Kit',
    breadcrumb: 'School Settings',
    section: 'Operations',
    count: null,
    money: null,
    subtitle: 'Privacy notice and interface primitives.',
  },
]

const KNOWN_ROLES = new Set([
  'principal',
  'registrar',
  'bursar',
  'teacher',
  'support_staff',
  'parent',
  'student',
])

const DENIED: Record<string, PaneId[]> = {
  bursar: ['attendance', 'library', 'transport'],
  teacher: ['admissions', 'fees', 'settings'],
  support_staff: ['admissions', 'fees', 'classes', 'attendance', 'grades', 'settings'],
  parent: ['dashboard', 'admissions', 'teachers', 'settings'],
  student: ['dashboard', 'admissions', 'fees', 'teachers', 'parents', 'settings'],
}

export function dashboardTitle(role: string) {
  switch (role) {
    case 'registrar':
      return 'Academic Dashboard'
    case 'bursar':
      return 'Finance Dashboard'
    case 'teacher':
    case 'support_staff':
      return 'My Dashboard'
    default:
      return 'Principal Dashboard'
  }
}

export function panesForRole(role: string) {
  if (!KNOWN_ROLES.has(role)) return []
  const denied = new Set(DENIED[role] ?? [])
  return PANES.filter((pane) => !denied.has(pane.id))
}

export function firstPane(role: string) {
  return panesForRole(role)[0] ?? null
}

export function paneById(id: string) {
  return PANES.find((pane) => pane.id === id) ?? null
}

export function canSeeAi(role: string) {
  return role === 'principal' || role === 'registrar' || role === 'bursar' || role === 'teacher'
}

export function canSeeAudit(role: string) {
  return role === 'principal' || role === 'registrar' || role === 'bursar'
}

export function canTopUp(role: string) {
  return role === 'principal' || role === 'bursar'
}

export function roleLabel(role: string) {
  switch (role) {
    case 'principal':
      return 'Principal'
    case 'registrar':
      return 'Registrar'
    case 'bursar':
      return 'Bursar'
    case 'teacher':
      return 'Teacher'
    case 'support_staff':
      return 'Support staff'
    case 'parent':
      return 'Parent'
    case 'student':
      return 'Student'
    default:
      return 'No role'
  }
}

export function initials(name: string) {
  const skip = new Set(['dr', 'mr', 'mrs', 'ms', 'prof'])
  const parts = name
    .split(/\s+/)
    .map((part) => part.replace(/\./g, ''))
    .filter((part) => part && !skip.has(part.toLowerCase()))
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '')
  return letters.join('') || 'U'
}

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { Badge } from '../components/Badge.tsx'
import { Button } from '../components/Button.tsx'
import { Card } from '../components/Card.tsx'
import { DatePicker } from '../components/DatePicker.tsx'
import { Drawer } from '../components/Drawer.tsx'
import { EmptyState, ErrorState } from '../components/EmptyState.tsx'
import { Modal } from '../components/Modal.tsx'
import { Select } from '../components/Select.tsx'
import { Subtabs } from '../components/Subtabs.tsx'
import { pushToast } from '../hooks/useToasts.ts'
import { fieldText, isApiError } from '../service/apiClient.ts'
import { fetchParents, type GuardianRecord } from '../service/parents.ts'
import {
  fetchClassrooms,
  type ClassroomRecord,
} from '../service/classes.ts'
import {
  fetchCampuses,
  fetchGradeLevels,
  type CampusRecord,
  type GradeLevel,
} from '../service/settings.ts'
import {
  addConduct,
  createPickup,
  deletePickup,
  enrollStudent,
  fetchConduct,
  fetchPickups,
  fetchStudent,
  fetchStudents,
  fetchWelfare,
  saveStudent,
  saveWelfare,
  withdrawStudent,
  type ConductRecord,
  type PickupRecord,
  type StudentRecord,
  type StudentSummary,
  type WelfareRecord,
} from '../service/students.ts'

const INSPECTOR_TABS = [
  { id: 'profile', label: 'Profile & Academics' },
  { id: 'welfare', label: 'Welfare & Pickup' },
  { id: 'conduct', label: 'Conduct & Notes' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'honor_roll', label: 'Honor Roll' },
  { value: 'at_risk', label: 'At Risk' },
  { value: 'waec_candidate', label: 'WAEC Candidate' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'graduated', label: 'Graduated' },
]

function dash(value: string | number | null | undefined) {
  if (value == null || value === '') return '—'
  return String(value)
}

function guardianOptions(
  guardians: GuardianRecord[],
  current: StudentRecord['primary_guardian'],
) {
  const options = guardians.map((row) => ({
    value: row.id,
    label: `${row.full_name} (${row.phone})`,
  }))
  if (current && !options.some((row) => row.value === current.id)) {
    options.unshift({
      value: current.id,
      label: `${current.full_name} (${current.phone})`,
    })
  }
  return [{ value: '', label: 'No primary guardian' }, ...options]
}

function statusTone(status: string) {
  if (status === 'honor_roll') return 'success' as const
  if (status === 'at_risk') return 'danger' as const
  if (status === 'withdrawn') return 'neutral' as const
  if (status === 'graduated') return 'info' as const
  return 'neutral' as const
}

const INSPECTOR_TAB_IDS = new Set(INSPECTOR_TABS.map((tab) => tab.id))

export function StudentsScreen() {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const role = user?.role ?? ''
  const canEnroll = role === 'principal' || role === 'registrar'
  const canEditProfile = canEnroll

  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [rows, setRows] = useState<StudentRecord[]>([])
  const [summary, setSummary] = useState<StudentSummary | null>(null)
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [campusId, setCampusId] = useState('')
  const [divisionId, setDivisionId] = useState('')
  const [gradeId, setGradeId] = useState('')
  const [classroomId, setClassroomId] = useState('')
  const [status, setStatus] = useState('')
  const [campuses, setCampuses] = useState<CampusRecord[]>([])
  const [grades, setGrades] = useState<GradeLevel[]>([])
  const [classrooms, setClassrooms] = useState<ClassroomRecord[]>([])
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [active, setActive] = useState<StudentRecord | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const rawTab = searchParams.get('tab') || 'profile'
  const inspectorTab = INSPECTOR_TAB_IDS.has(rawTab) ? rawTab : 'profile'

  function setInspectorTab(id: string) {
    const next = new URLSearchParams(searchParams)
    if (id === 'profile') next.delete('tab')
    else next.set('tab', id)
    setSearchParams(next, { replace: true })
  }

  const pageSize = 50
  const pageCount = Math.max(1, Math.ceil(count / pageSize))

  const divisionOptions = useMemo(() => {
    const names = [...new Set(grades.map((grade) => grade.division).filter(Boolean))]
    return [{ value: '', label: 'All Divisions' }, ...names.map((name) => ({ value: name, label: name }))]
  }, [grades])

  const gradeOptions = useMemo(() => {
    const filtered = divisionId
      ? grades.filter((grade) => grade.division === divisionId)
      : grades
    return [
      { value: '', label: 'All Grades' },
      ...filtered.map((grade) => ({ value: grade.id, label: grade.name })),
    ]
  }, [grades, divisionId])

  const classroomOptions = useMemo(() => {
    let list = classrooms
    if (campusId) list = list.filter((row) => row.campus_id === campusId)
    if (gradeId) list = list.filter((row) => row.grade_level.id === gradeId)
    if (divisionId) list = list.filter((row) => row.grade_level.division === divisionId)
    return [
      { value: '', label: 'All Sections' },
      ...list.map((row) => ({ value: row.id, label: row.name })),
    ]
  }, [classrooms, campusId, gradeId, divisionId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [campusRows, gradeRows, classRows] = await Promise.all([
          fetchCampuses(),
          fetchGradeLevels(),
          fetchClassrooms(),
        ])
        if (cancelled) return
        setCampuses(campusRows)
        setGrades(gradeRows)
        setClassrooms(classRows)
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function refreshList() {
    setReady(false)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchStudents({
          q: q.trim() || undefined,
          campus: campusId || undefined,
          division: divisionId || undefined,
          grade: gradeId || undefined,
          classroom: classroomId || undefined,
          status: status || undefined,
          page,
          page_size: pageSize,
        })
        if (cancelled) return
        setRows(data.results)
        setSummary(data.summary)
        setCount(data.count)
        setFailed(false)
        setReady(true)
      } catch {
        if (!cancelled) {
          setFailed(true)
          setReady(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [q, campusId, divisionId, gradeId, classroomId, status, page, reloadKey])

  useEffect(() => {
    if (!studentId) return
    let cancelled = false
    ;(async () => {
      try {
        const row = await fetchStudent(studentId)
        if (!cancelled) setActive(row)
      } catch {
        if (!cancelled) {
          setActive(null)
          pushToast('Student was not found.', 'warn')
          navigate('/students', { replace: true })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [studentId, navigate, reloadKey])

  function openStudent(id: string) {
    navigate(`/students/${id}`)
  }

  function closeInspector() {
    setActive(null)
    navigate('/students')
  }

  useEffect(() => {
    if (!studentId && searchParams.has('tab')) {
      const next = new URLSearchParams(searchParams)
      next.delete('tab')
      setSearchParams(next, { replace: true })
    }
  }, [studentId, searchParams, setSearchParams])

  return (
    <section className="space-y-5 w-full">
      <div className="space-y-3 border-b crm-border pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-main">Students Directory</h1>
            <p className="mt-0.5 text-xs text-sub">
              Nursery through Grade 12 student roster, welfare &amp; pickup authorization, conduct, and exam
              clearance.
            </p>
          </div>
          {canEnroll ? (
            <Button className="shrink-0 px-3 py-1.5 text-xs" onClick={() => setEnrollOpen(true)}>
              + Enroll Student
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={q}
            onChange={(event) => {
              refreshList()
              setPage(1)
              setQ(event.target.value)
            }}
            placeholder="Search students or ID..."
            className="crm-input w-44 px-3 py-1.5 text-xs"
          />
          <div className="w-40">
            <Select
              value={campusId}
              ariaLabel="Campus filter"
              onChange={(value) => {
                refreshList()
                setPage(1)
                setCampusId(value)
              }}
              options={[{ value: '', label: 'All Campuses' }, ...campuses.map((row) => ({ value: row.id, label: row.name }))]}
            />
          </div>
          <div className="w-40">
            <Select
              value={divisionId}
              ariaLabel="Division filter"
              onChange={(value) => {
                refreshList()
                setPage(1)
                setDivisionId(value)
                setGradeId('')
              }}
              options={divisionOptions}
            />
          </div>
          <div className="w-36">
            <Select
              value={gradeId}
              ariaLabel="Grade filter"
              onChange={(value) => {
                refreshList()
                setPage(1)
                setGradeId(value)
              }}
              options={gradeOptions}
            />
          </div>
          <div className="w-36">
            <Select
              value={classroomId}
              ariaLabel="Section filter"
              onChange={(value) => {
                refreshList()
                setPage(1)
                setClassroomId(value)
              }}
              options={classroomOptions}
            />
          </div>
          <div className="w-40">
            <Select
              value={status}
              ariaLabel="Status filter"
              onChange={(value) => {
                refreshList()
                setPage(1)
                setStatus(value)
              }}
              options={STATUS_OPTIONS}
            />
          </div>
        </div>
      </div>

      {failed ? (
        <ErrorState
          onRetry={() => {
            refreshList()
            setReloadKey((value) => value + 1)
          }}
        >
          Could not load students.
        </ErrorState>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          ['Visible Students', ready ? dash(summary?.total) : '—'],
          ['Honor Roll (≥85%)', '—'],
          ['At Risk (<70%)', '—'],
          ['Exam Cleared', ready ? `— / ${dash(summary?.total)}` : '—'],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <div className="text-xs text-sub">{label}</div>
            <div className="num-tabular mt-1 text-xl font-bold text-main">{value}</div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b crm-border text-[11px] font-semibold uppercase text-sub">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Division &amp; Grade</th>
                <th className="px-4 py-3">Guardian</th>
                <th className="px-4 py-3">Attendance</th>
                <th className="px-4 py-3">Yearly Avg</th>
                <th className="px-4 py-3">Exam Clearance</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y crm-border text-xs">
              {!ready ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sub">
                    Loading students.
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sub">
                    No students match this filter.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="crm-hover cursor-pointer"
                    onClick={() => openStudent(row.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-main">{row.full_name}</div>
                      <div className="text-[11px] text-sub">{row.student_code}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-main">{dash(row.classroom_name || row.grade)}</div>
                      <div className="text-[11px] text-sub">{dash(row.division)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-body">{row.primary_guardian?.full_name ?? '—'}</div>
                      {row.primary_guardian?.phone ? (
                        <div className="text-[11px] text-sub">{row.primary_guardian.phone}</div>
                      ) : null}
                    </td>
                    <td className="num-tabular px-4 py-3 text-main">
                      {row.attendance_pct == null ? '—' : `${row.attendance_pct}%`}
                    </td>
                    <td className="num-tabular px-4 py-3 font-semibold text-main">
                      {row.yearly_avg_pct == null ? '—' : `${row.yearly_avg_pct}%`}
                    </td>
                    <td className="px-4 py-3">
                      {row.exam_clearance ? (
                        <Badge tone="success">{row.exam_clearance}</Badge>
                      ) : (
                        <span className="text-sub">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="secondary"
                        className="px-2.5 py-1 text-[11px]"
                        onClick={(event) => {
                          event.stopPropagation()
                          openStudent(row.id)
                        }}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t crm-border px-4 py-3 text-xs">
          <span className="text-sub num-tabular">
            {count} students · page {page} of {pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="px-2.5 py-1 text-[11px]"
              disabled={page <= 1}
              onClick={() => {
                refreshList()
                setPage((value) => Math.max(1, value - 1))
              }}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              className="px-2.5 py-1 text-[11px]"
              disabled={page >= pageCount}
              onClick={() => {
                refreshList()
                setPage((value) => Math.min(pageCount, value + 1))
              }}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {enrollOpen ? (
        <EnrollModal
          key="enroll-open"
          open
          campuses={campuses}
          classrooms={classrooms}
          onClose={() => setEnrollOpen(false)}
          onCreated={() => {
            setEnrollOpen(false)
            refreshList()
            setPage(1)
            setReloadKey((value) => value + 1)
          }}
        />
      ) : null}

      {active && active.id === studentId ? (
        <StudentInspectorDrawer
          key={active.id}
          open={Boolean(studentId)}
          student={active}
          tab={inspectorTab}
          onTab={setInspectorTab}
          canEditProfile={canEditProfile}
          campuses={campuses}
          classrooms={classrooms}
          onClose={closeInspector}
          onSaved={() => {
            refreshList()
            setReloadKey((value) => value + 1)
          }}
        />
      ) : null}
    </section>
  )
}

function EnrollModal({
  open,
  campuses,
  classrooms,
  onClose,
  onCreated,
}: {
  open: boolean
  campuses: CampusRecord[]
  classrooms: ClassroomRecord[]
  onClose: () => void
  onCreated: () => void
}) {
  const [fullName, setFullName] = useState('')
  const [campusId, setCampusId] = useState(campuses[0]?.id ?? '')
  const [classroomId, setClassroomId] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('female')
  const [catchment, setCatchment] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [guardianId, setGuardianId] = useState('')
  const [guardians, setGuardians] = useState<GuardianRecord[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const classroomChoices = classrooms
    .filter((row) => !campusId || row.campus_id === campusId)
    .map((row) => ({ value: row.id, label: `${row.name} · ${row.campus_name}` }))

  useEffect(() => {
    let cancelled = false
    void fetchParents({ page: 1, page_size: 100 }).then(
      (body) => {
        if (!cancelled) setGuardians(body.results)
      },
      () => {
        if (!cancelled) setGuardians([])
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  async function submit() {
    setBusy(true)
    setError('')
    try {
      const created = await enrollStudent({
        full_name: fullName.trim(),
        campus_id: campusId,
        classroom_id: classroomId,
        date_of_birth: dob,
        gender,
        catchment_zone: catchment.trim(),
        photo,
        primary_guardian_id: guardianId || undefined,
      })
      pushToast(`Enrolled ${created.full_name} as ${created.student_code}.`, 'success')
      onCreated()
    } catch (err) {
      setError(
        fieldText(err, 'full_name') ||
          fieldText(err, 'classroom_id') ||
          fieldText(err, 'date_of_birth') ||
          fieldText(err, 'primary_guardian_id') ||
          (isApiError(err) ? err.detail : 'Could not enroll student.'),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Enroll New Student"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" className="px-4 py-1.5 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button className="px-4 py-1.5 text-xs" disabled={busy} onClick={submit}>
            Enroll Student
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-xs">
        <div>
          <label className="mb-1 block font-medium text-body">Student Full Name</label>
          <input
            className="crm-input w-full px-3 py-2"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="e.g. Comfort Kollie"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block font-medium text-body">Campus</label>
            <Select
              ariaLabel="Enroll campus"
              value={campusId}
              onChange={(value) => {
                setCampusId(value)
                setClassroomId('')
              }}
              options={campuses.map((row) => ({ value: row.id, label: row.name }))}
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-body">Classroom</label>
            <Select
              ariaLabel="Enroll classroom"
              value={classroomId}
              onChange={setClassroomId}
              options={[{ value: '', label: 'Select classroom' }, ...classroomChoices]}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block font-medium text-body">Date of Birth</label>
            <DatePicker ariaLabel="Date of birth" value={dob} onChange={setDob} />
          </div>
          <div>
            <label className="mb-1 block font-medium text-body">Gender</label>
            <Select
              ariaLabel="Gender"
              value={gender}
              onChange={setGender}
              options={[
                { value: 'female', label: 'Female' },
                { value: 'male', label: 'Male' },
              ]}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block font-medium text-body">Primary Guardian</label>
          <Select
            ariaLabel="Primary guardian"
            value={guardianId}
            onChange={setGuardianId}
            options={[
              { value: '', label: 'No primary guardian' },
              ...guardians.map((row) => ({
                value: row.id,
                label: `${row.full_name} (${row.phone})`,
              })),
            ]}
          />
        </div>
        <div>
          <label className="mb-1 block font-medium text-body">Photo (optional)</label>
          <input
            type="file"
            accept="image/*"
            className="crm-input w-full px-3 py-2 text-xs"
            onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
          />
        </div>
        <div>
          <label className="mb-1 block font-medium text-body">Catchment zone (optional)</label>
          <input
            className="crm-input w-full px-3 py-2"
            value={catchment}
            onChange={(event) => setCatchment(event.target.value)}
            placeholder="e.g. Sinkor & Central"
          />
        </div>
        {error ? <p className="text-xs text-sub">{error}</p> : null}
      </div>
    </Modal>
  )
}

function StudentInspectorDrawer({
  open,
  student,
  tab,
  onTab,
  canEditProfile,
  campuses,
  classrooms,
  onClose,
  onSaved,
}: {
  open: boolean
  student: StudentRecord
  tab: string
  onTab: (id: string) => void
  canEditProfile: boolean
  campuses: CampusRecord[]
  classrooms: ClassroomRecord[]
  onClose: () => void
  onSaved: () => void
}) {
  const { user } = useAuth()
  const [fullName, setFullName] = useState(student.full_name)
  const [campusId, setCampusId] = useState(student.campus_id)
  const [classroomId, setClassroomId] = useState(student.classroom_id ?? '')
  const [status, setStatus] = useState(student.status)
  const [waec, setWaec] = useState(student.is_waec_candidate)
  const [dob, setDob] = useState(student.date_of_birth)
  const [gender, setGender] = useState(student.gender)
  const [catchment, setCatchment] = useState(student.catchment_zone)
  const [photo, setPhoto] = useState<File | null>(null)
  const [guardianId, setGuardianId] = useState(student.primary_guardian?.id ?? '')
  const [guardians, setGuardians] = useState<GuardianRecord[]>([])
  const [welfare, setWelfare] = useState<WelfareRecord | null>(null)
  const [pickups, setPickups] = useState<PickupRecord[]>([])
  const [notes, setNotes] = useState<ConductRecord[]>([])
  const [pickupName, setPickupName] = useState('')
  const [pickupRelationship, setPickupRelationship] = useState('')
  const [pickupPhone, setPickupPhone] = useState('')
  const [pickupNote, setPickupNote] = useState('')
  const [noteType, setNoteType] = useState('merit')
  const [noteSeverity, setNoteSeverity] = useState('medium')
  const [noteText, setNoteText] = useState('')
  const [error, setError] = useState('')

  const gradeNumber = useMemo(() => {
    const name = student.grade || ''
    const match = name.match(/Grade\s+(\d+)/i)
    return match ? Number(match[1]) : null
  }, [student])

  const showWaec = gradeNumber === 9 || gradeNumber === 12

  useEffect(() => {
    let cancelled = false
    void fetchParents({ page: 1, page_size: 100 }).then(
      (body) => {
        if (!cancelled) setGuardians(body.results)
      },
      () => {
        if (!cancelled) setGuardians([])
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [welfareRow, pickupRows, noteRows] = await Promise.all([
          fetchWelfare(student.id),
          fetchPickups(student.id),
          fetchConduct(student.id),
        ])
        if (cancelled) return
        setWelfare(welfareRow)
        setPickups(pickupRows)
        setNotes(noteRows)
      } catch {
        if (!cancelled) setError('Could not load inspector details.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [student.id])

  const classroomChoices = classrooms
    .filter((row) => !campusId || row.campus_id === campusId)
    .map((row) => ({ value: row.id, label: row.name }))

  async function saveProfile() {
    if (!canEditProfile) return
    try {
      await saveStudent(student.id, {
        full_name: fullName.trim(),
        campus_id: campusId,
        classroom_id: classroomId || null,
        status,
        is_waec_candidate: waec,
        date_of_birth: dob,
        gender,
        catchment_zone: catchment.trim(),
        photo,
        primary_guardian_id: guardianId,
      })
      setPhoto(null)
      pushToast('Student profile saved.', 'success')
      onSaved()
    } catch (err) {
      setError(isApiError(err) ? err.detail : 'Could not save student.')
    }
  }

  async function saveWelfareTab() {
    if (!student || !welfare) return
    try {
      const saved = await saveWelfare(student.id, {
        allergies: welfare.allergies,
        medical_notes: welfare.medical_notes,
        blood_group: welfare.blood_group,
        emergency_contact: welfare.emergency_contact,
      })
      setWelfare(saved)
      pushToast('Welfare saved.', 'success')
    } catch (err) {
      setError(isApiError(err) ? err.detail : 'Could not save welfare.')
    }
  }

  async function addPickupRow() {
    if (!student) return
    try {
      const row = await createPickup(student.id, {
        name: pickupName.trim(),
        relationship: pickupRelationship.trim(),
        phone: pickupPhone.trim(),
        id_note: pickupNote.trim(),
      })
      setPickups((current) => [...current, row])
      setPickupName('')
      setPickupRelationship('')
      setPickupPhone('')
      setPickupNote('')
      pushToast('Pickup person added.', 'success')
    } catch (err) {
      setError(
        fieldText(err, 'phone') || (isApiError(err) ? err.detail : 'Could not add pickup.'),
      )
    }
  }

  async function removePickup(id: string) {
    if (!student) return
    try {
      await deletePickup(student.id, id)
      setPickups((current) => current.filter((row) => row.id !== id))
    } catch (err) {
      setError(isApiError(err) ? err.detail : 'Could not remove pickup.')
    }
  }

  async function logNote() {
    if (!student) return
    try {
      const row = await addConduct(student.id, {
        note_type: noteType,
        severity: noteSeverity,
        description: noteText.trim(),
      })
      setNotes((current) => [row, ...current])
      setNoteText('')
      pushToast('Conduct note logged.', 'success')
    } catch (err) {
      setError(isApiError(err) ? err.detail : 'Could not log note.')
    }
  }

  async function withdraw() {
    if (!student || !canEditProfile) return
    try {
      await withdrawStudent(student.id)
      pushToast('Student withdrawn.', 'success')
      onSaved()
      onClose()
    } catch (err) {
      setError(isApiError(err) ? err.detail : 'Could not withdraw student.')
    }
  }

  return (
    <Drawer open={open} title={student.full_name} onClose={onClose}>
      <div className="space-y-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-sub">{student.student_code}</span>
          {student.division ? <Badge tone="info">{student.division}</Badge> : null}
          <Badge tone={statusTone(student.status)}>{student.status_label}</Badge>
        </div>
        <p className="text-xs text-sub">
          {dash(student.classroom_name)} · {dash(student.campus_name)}
        </p>

        <Subtabs tabs={INSPECTOR_TABS} value={tab} onChange={onTab} />

        {tab === 'profile' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2.5 rounded-lg p-3 text-center crm-subtle">
              <div>
                <div className="text-sub">Attendance</div>
                <div className="num-tabular mt-0.5 text-sm font-bold text-main">
                  {student.attendance_pct == null ? '—' : `${student.attendance_pct}%`}
                </div>
              </div>
              <div>
                <div className="text-sub">Yearly Avg</div>
                <div className="num-tabular mt-0.5 text-sm font-bold text-main">
                  {student.yearly_avg_pct == null ? '—' : `${student.yearly_avg_pct}%`}
                </div>
              </div>
              <div>
                <div className="text-sub">LRD Balance</div>
                <div className="num-tabular mt-0.5 text-sm font-bold text-main">
                  {student.lrd_balance_lrd == null ? '—' : `LRD ${student.lrd_balance_lrd}`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {student.photo_url ? (
                <img
                  src={student.photo_url}
                  alt=""
                  className="h-14 w-14 rounded-md object-cover crm-border border"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-md text-[11px] text-sub crm-subtle">
                  No photo
                </div>
              )}
              {canEditProfile ? (
                <label className="block flex-1 space-y-1">
                  <span className="font-medium text-body">Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="crm-input w-full px-3 py-2 text-xs"
                    onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
                  />
                </label>
              ) : null}
            </div>
            <div>
              <label className="mb-1 block font-medium text-body">Full Name</label>
              <input
                className="crm-input w-full px-3 py-2"
                value={fullName}
                disabled={!canEditProfile}
                onChange={(event) => setFullName(event.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-medium text-body">Campus</label>
                <Select ariaLabel="Select"
                  value={campusId}
                  disabled={!canEditProfile}
                  onChange={(value) => {
                    setCampusId(value)
                    setClassroomId('')
                  }}
                  options={campuses.map((row) => ({ value: row.id, label: row.name }))}
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-body">Classroom</label>
                <Select ariaLabel="Select"
                  value={classroomId}
                  disabled={!canEditProfile}
                  onChange={setClassroomId}
                  options={[{ value: '', label: 'Unassigned' }, ...classroomChoices]}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-medium text-body">Date of Birth</label>
                <DatePicker ariaLabel="Student date of birth" value={dob} onChange={setDob} disabled={!canEditProfile} />
              </div>
              <div>
                <label className="mb-1 block font-medium text-body">Academic Status</label>
                <Select ariaLabel="Select"
                  value={status}
                  disabled={!canEditProfile}
                  onChange={setStatus}
                  options={STATUS_OPTIONS.filter((row) => row.value && row.value !== 'waec_candidate')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-medium text-body">Gender</label>
                <Select ariaLabel="Select"
                  value={gender}
                  disabled={!canEditProfile}
                  onChange={setGender}
                  options={[
                    { value: 'female', label: 'Female' },
                    { value: 'male', label: 'Male' },
                  ]}
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-body">Catchment</label>
                <input
                  className="crm-input w-full px-3 py-2"
                  value={catchment}
                  disabled={!canEditProfile}
                  onChange={(event) => setCatchment(event.target.value)}
                />
              </div>
            </div>
            {showWaec ? (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={waec}
                  disabled={!canEditProfile}
                  onChange={(event) => setWaec(event.target.checked)}
                />
                <span className="font-medium text-body">WAEC candidate</span>
              </label>
            ) : null}
            <div>
              <label className="mb-1 block font-medium text-body">Primary Guardian</label>
              <Select
                ariaLabel="Primary guardian"
                value={guardianId}
                disabled={!canEditProfile}
                onChange={setGuardianId}
                options={guardianOptions(guardians, student.primary_guardian)}
              />
            </div>
            {canEditProfile ? (
              <div className="flex gap-2 pt-1">
                <Button className="px-3 py-1.5 text-xs" onClick={saveProfile}>
                  Save Student
                </Button>
                <Button variant="secondary" className="px-3 py-1.5 text-xs text-rose-600" onClick={withdraw}>
                  Withdraw
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === 'welfare' ? (
          <div className="space-y-3">
            {welfare ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-medium text-body">Blood Group</label>
                    <input
                      className="crm-input w-full px-3 py-2"
                      value={welfare.blood_group}
                      onChange={(event) =>
                        setWelfare({ ...welfare, blood_group: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium text-body">Emergency Phone</label>
                    <input
                      className="crm-input w-full px-3 py-2"
                      value={welfare.emergency_contact}
                      onChange={(event) =>
                        setWelfare({ ...welfare, emergency_contact: event.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block font-medium text-body">Allergies</label>
                  <textarea
                    className="crm-input w-full p-2.5 text-xs"
                    rows={2}
                    value={welfare.allergies}
                    onChange={(event) => setWelfare({ ...welfare, allergies: event.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-body">Medical Notes</label>
                  <textarea
                    className="crm-input w-full p-2.5 text-xs"
                    rows={2}
                    value={welfare.medical_notes}
                    onChange={(event) =>
                      setWelfare({ ...welfare, medical_notes: event.target.value })
                    }
                  />
                </div>
                <Button className="px-3 py-1.5 text-xs" onClick={saveWelfareTab}>
                  Save Welfare
                </Button>
              </>
            ) : (
              <EmptyState>Loading welfare.</EmptyState>
            )}

            <div className="border-t crm-border pt-3 space-y-2">
              <div className="font-semibold text-main">Authorized Pickup Persons</div>
              {pickups.length === 0 ? <EmptyState>No authorized pickups yet.</EmptyState> : null}
              {pickups.map((row) => (
                <div key={row.id} className="flex items-start justify-between gap-2 rounded-lg p-2.5 crm-subtle">
                  <div>
                    <div className="font-medium text-main">{row.name}</div>
                    <div className="text-[11px] text-sub">
                      {row.relationship} · {row.phone}
                      {row.id_note ? ` · ${row.id_note}` : ''}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    className="px-2 py-1 text-[11px]"
                    onClick={() => removePickup(row.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="crm-input px-2.5 py-1.5 text-xs"
                  placeholder="Name"
                  value={pickupName}
                  onChange={(event) => setPickupName(event.target.value)}
                />
                <input
                  className="crm-input px-2.5 py-1.5 text-xs"
                  placeholder="Relationship"
                  value={pickupRelationship}
                  onChange={(event) => setPickupRelationship(event.target.value)}
                />
                <input
                  className="crm-input px-2.5 py-1.5 text-xs"
                  placeholder="+231 phone"
                  value={pickupPhone}
                  onChange={(event) => setPickupPhone(event.target.value)}
                />
                <input
                  className="crm-input px-2.5 py-1.5 text-xs"
                  placeholder="ID note"
                  value={pickupNote}
                  onChange={(event) => setPickupNote(event.target.value)}
                />
              </div>
              <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={addPickupRow}>
                Add Pickup
              </Button>
            </div>
          </div>
        ) : null}

        {tab === 'conduct' ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Select ariaLabel="Select"
                value={noteType}
                onChange={setNoteType}
                options={[
                  { value: 'merit', label: 'Merit' },
                  { value: 'incident', label: 'Incident' },
                  { value: 'homeroom_note', label: 'Homeroom Note' },
                ]}
              />
              <Select ariaLabel="Select"
                value={noteSeverity}
                onChange={setNoteSeverity}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                ]}
              />
              <input
                className="crm-input flex-1 px-3 py-1.5 text-xs"
                placeholder="Log conduct note..."
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
              />
              <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={logNote}>
                Log
              </Button>
            </div>
            {notes.length === 0 ? <EmptyState>No conduct notes yet.</EmptyState> : null}
            <div className="space-y-2">
              {notes.map((row) => (
                <div key={row.id} className="rounded-lg p-2.5 crm-subtle">
                  <div className="flex items-center gap-2">
                    <Badge tone={row.note_type === 'incident' ? 'danger' : 'info'}>
                      {row.note_type_label}
                    </Badge>
                    <span className="text-[11px] text-sub">{row.severity_label}</span>
                  </div>
                  <p className="mt-1 text-main">{row.description}</p>
                  <p className="mt-1 text-[11px] text-sub">
                    {row.author_name} · {new Date(row.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            {user?.role === 'teacher' ? (
              <p className="text-[11px] text-sub">Teachers may log notes only for assigned classes.</p>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="text-xs text-sub">{error}</p> : null}
      </div>
    </Drawer>
  )
}

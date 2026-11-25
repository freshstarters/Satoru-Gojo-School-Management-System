import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { Badge } from '../components/Badge.tsx'
import { Button } from '../components/Button.tsx'
import { Card } from '../components/Card.tsx'
import { DatePicker } from '../components/DatePicker.tsx'
import { Drawer } from '../components/Drawer.tsx'
import { EmptyState, ErrorState, FieldErrors } from '../components/EmptyState.tsx'
import { Modal } from '../components/Modal.tsx'
import { Select } from '../components/Select.tsx'
import { Subtabs } from '../components/Subtabs.tsx'
import { pushToast } from '../hooks/useToasts.ts'
import { fieldText, isApiError } from '../service/apiClient.ts'
import {
  assignSubstitute,
  createClassroom,
  createTimetableSlot,
  deleteTimetableSlot,
  fetchClassrooms,
  fetchClassroom,
  fetchSubjects,
  fetchTeacherOptions,
  fetchTimetable,
  fetchUncovered,
  recordAbsence,
  replaceClassroomSubjects,
  saveClassroom,
  saveTimetableSlot,
  type ClassroomRecord,
  type SubjectAssignmentInput,
  type SubjectRecord,
  type TeacherRef,
  type TimetableSlot,
  type UncoveredSlot,
} from '../service/classes.ts'
import {
  fetchAcademicYears as loadYears,
  fetchCampuses as loadCampuses,
  fetchGradeLevels as loadGrades,
  type AcademicYear,
  type CampusRecord,
  type GradeLevel,
} from '../service/settings.ts'

const TABS = [
  { id: 'roster', label: 'Classrooms' },
  { id: 'timetable', label: 'Weekly Timetable' },
]

const DAYS = [
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
]

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8]

function todayIso() {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Monrovia',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return `${year}-${month}-${day}`
}

const CLASS_TAB_IDS = new Set(TABS.map((tab) => tab.id))

export function ClassesScreen() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const role = user?.role ?? ''
  const canWrite = role === 'principal' || role === 'registrar'
  const rawTab = searchParams.get('tab') || 'roster'
  const tab = CLASS_TAB_IDS.has(rawTab) ? rawTab : 'roster'
  function setTab(id: string) {
    const next = new URLSearchParams(searchParams)
    if (id === 'roster') next.delete('tab')
    else next.set('tab', id)
    setSearchParams(next, { replace: true })
  }
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [classrooms, setClassrooms] = useState<ClassroomRecord[]>([])
  const [subjects, setSubjects] = useState<SubjectRecord[]>([])
  const [teachers, setTeachers] = useState<TeacherRef[]>([])
  const [campuses, setCampuses] = useState<CampusRecord[]>([])
  const [years, setYears] = useState<AcademicYear[]>([])
  const [grades, setGrades] = useState<GradeLevel[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [active, setActive] = useState<ClassroomRecord | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'classroom' | 'teacher'>('classroom')
  const [selectedClassroomId, setSelectedClassroomId] = useState('')
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [slots, setSlots] = useState<TimetableSlot[]>([])
  const [slotsFailed, setSlotsFailed] = useState(false)
  const [slotEdit, setSlotEdit] = useState<{
    day: string
    period: number
    slot: TimetableSlot | null
  } | null>(null)
  const [uncoveredDate, setUncoveredDate] = useState(todayIso())
  const [uncovered, setUncovered] = useState<UncoveredSlot[]>([])
  const [uncoveredCount, setUncoveredCount] = useState(0)
  const [uncoveredFailed, setUncoveredFailed] = useState(false)
  const [absenceTeacherId, setAbsenceTeacherId] = useState('')
  const [absenceReason, setAbsenceReason] = useState('')
  const [subSlotId, setSubSlotId] = useState('')
  const [subTeacherId, setSubTeacherId] = useState('')
  const [subReason, setSubReason] = useState('')

  function loadBase() {
    setFailed(false)
    void Promise.all([
      fetchClassrooms(),
      fetchSubjects(),
      fetchTeacherOptions(),
      loadCampuses(),
      loadYears(),
      loadGrades(),
    ])
      .then(([nextClasses, nextSubjects, nextTeachers, nextCampuses, nextYears, nextGrades]) => {
        setClassrooms(nextClasses)
        setSubjects(nextSubjects)
        setTeachers(nextTeachers)
        setCampuses(nextCampuses)
        setYears(nextYears)
        setGrades(nextGrades)
        if (!selectedClassroomId && nextClasses[0]) setSelectedClassroomId(nextClasses[0].id)
        if (!selectedTeacherId && nextTeachers[0]) setSelectedTeacherId(nextTeachers[0].id)
        setReady(true)
      })
      .catch(() => {
        setFailed(true)
        setReady(true)
      })
  }

  function loadSlots() {
    const params =
      viewMode === 'classroom'
        ? { classroom: selectedClassroomId || undefined }
        : { teacher: selectedTeacherId || undefined }
    if (!params.classroom && !params.teacher) {
      setSlots([])
      setSlotsFailed(false)
      return
    }
    void fetchTimetable(params)
      .then((rows) => {
        setSlots(rows)
        setSlotsFailed(false)
      })
      .catch(() => {
        setSlots([])
        setSlotsFailed(true)
      })
  }

  function loadUncovered(date = uncoveredDate) {
    void fetchUncovered(date)
      .then((body) => {
        setUncovered(body.results)
        setUncoveredCount(body.count)
        setUncoveredFailed(false)
      })
      .catch(() => {
        setUncovered([])
        setUncoveredCount(0)
        setUncoveredFailed(true)
      })
  }

  useEffect(() => {
    loadBase()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (tab === 'timetable') {
      loadSlots()
      loadUncovered()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, viewMode, selectedClassroomId, selectedTeacherId])

  useEffect(() => {
    if (!activeId) {
      setActive(null)
      return
    }
    void fetchClassroom(activeId)
      .then(setActive)
      .catch(() => setActive(null))
  }, [activeId])

  const slotMap = useMemo(() => {
    const map = new Map<string, TimetableSlot>()
    for (const slot of slots) {
      map.set(`${slot.day_of_week}:${slot.period_number}`, slot)
    }
    return map
  }, [slots])

  const classroomOptions = classrooms.map((row) => ({ value: row.id, label: `${row.name} · ${row.campus_name}` }))
  const teacherOptions = teachers.map((row) => ({ value: row.id, label: row.display_name }))
  const selectedClassroom = classrooms.find((row) => row.id === selectedClassroomId) ?? null

  if (!ready) return <p className="text-xs text-sub">Loading classes.</p>
  if (failed) return <ErrorState onRetry={loadBase}>Could not load classes.</ErrorState>

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b pb-4 crm-border lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-main">Classes & Weekly Timetable</h1>
          <p className="mt-0.5 text-xs text-sub">
            Homeroom sections from Nursery to Grade 12, teacher assignments, and room schedules.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Subtabs tabs={TABS} value={tab} onChange={setTab} />
          {canWrite ? (
            <Button className="px-3 py-1.5 text-xs" onClick={() => setNewOpen(true)}>
              + New Class
            </Button>
          ) : null}
        </div>
      </div>

      {tab === 'roster' ? (
        classrooms.length === 0 ? (
          <EmptyState>No classrooms yet.</EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classrooms.map((row) => {
              const pct = row.capacity > 0 ? Math.round((row.enrolled / row.capacity) * 100) : 0
              return (
                <button
                  key={row.id}
                  type="button"
                  className="crm-card space-y-3 p-5 text-left text-xs"
                  onClick={() => setActiveId(row.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge tone="info">{row.grade_level.division}</Badge>
                      <h3 className="mt-1 text-base font-semibold text-main">{row.name}</h3>
                      <div className="text-sub">
                        {row.room_label || 'No room'} · Homeroom: {row.homeroom_teacher?.display_name || 'Unassigned'}
                      </div>
                    </div>
                    <span className="num-tabular text-xs font-semibold text-main">
                      {row.enrolled}/{row.capacity}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full crm-subtle">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--brand-primary)' }} />
                  </div>
                </button>
              )
            })}
          </div>
        )
      ) : (
        <div className="space-y-4">
          <Card className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-main">Weekly Classroom Schedule</h2>
                <p className="text-xs text-sub">Liberian Ministry of Education core subjects + WAEC labs</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  ariaLabel="Timetable view"
                  value={viewMode}
                  options={[
                    { value: 'classroom', label: 'By classroom' },
                    { value: 'teacher', label: 'By teacher' },
                  ]}
                  onChange={(value) => setViewMode(value as 'classroom' | 'teacher')}
                />
                {viewMode === 'classroom' ? (
                  <Select
                    ariaLabel="Classroom"
                    value={selectedClassroomId}
                    options={classroomOptions}
                    onChange={setSelectedClassroomId}
                  />
                ) : (
                  <Select
                    ariaLabel="Teacher"
                    value={selectedTeacherId}
                    options={teacherOptions}
                    onChange={setSelectedTeacherId}
                  />
                )}
              </div>
            </div>
            {slotsFailed ? (
              <ErrorState onRetry={loadSlots}>The timetable could not be loaded.</ErrorState>
            ) : null}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b text-[11px] uppercase text-sub crm-border">
                    <th className="px-3 py-2.5">Period</th>
                    {DAYS.map((day) => (
                      <th key={day.id} className="px-3 py-2.5">
                        {day.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y crm-border">
                  {PERIODS.map((period) => (
                    <tr key={period}>
                      <td className="num-tabular px-3 py-3 font-semibold text-main">
                        {period === 1 ? '1st' : period === 2 ? '2nd' : period === 3 ? '3rd' : `${period}th`} Period
                      </td>
                      {DAYS.map((day) => {
                        const slot = slotMap.get(`${day.id}:${period}`) ?? null
                        return (
                          <td key={`${day.id}-${period}`} className="px-3 py-3 text-body">
                            <button
                              type="button"
                              className="w-full text-left"
                              onClick={() => {
                                if (!canWrite || viewMode !== 'classroom' || !selectedClassroomId) return
                                setSlotEdit({ day: day.id, period, slot })
                              }}
                            >
                              {slot ? (
                                <>
                                  <div>{slot.subject.name}</div>
                                  <div className="text-[10px] text-sub">
                                    {slot.teacher?.display_name || 'Unassigned'}
                                    {slot.room_label ? ` · ${slot.room_label}` : ''}
                                    {viewMode === 'teacher' ? ` · ${slot.classroom_name}` : ''}
                                  </div>
                                </>
                              ) : (
                                <span className="text-sub">{canWrite && viewMode === 'classroom' ? 'Add slot' : '—'}</span>
                              )}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {canWrite ? (
            <Card className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-main">Uncovered bell slots</h2>
                  <p className="text-xs text-sub">
                    {uncoveredCount} uncovered on {uncoveredDate}.
                  </p>
                </div>
                <div className="w-44">
                  <DatePicker
                    ariaLabel="Uncovered date"
                    value={uncoveredDate}
                    onChange={(value) => {
                      setUncoveredDate(value)
                      loadUncovered(value)
                    }}
                  />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-body">Mark teacher absent</p>
                  <Select
                    ariaLabel="Absent teacher"
                    value={absenceTeacherId}
                    options={[{ value: '', label: 'Select teacher' }, ...teacherOptions]}
                    onChange={setAbsenceTeacherId}
                  />
                  <input
                    className="crm-input w-full px-3 py-2 text-xs"
                    placeholder="Reason"
                    value={absenceReason}
                    onChange={(event) => setAbsenceReason(event.target.value)}
                  />
                  <Button
                    className="px-3 py-1.5 text-xs"
                    disabled={!absenceTeacherId}
                    onClick={() => {
                      void recordAbsence({
                        teacher_id: absenceTeacherId,
                        date: uncoveredDate,
                        reason: absenceReason,
                      })
                        .then((body) => {
                          setUncovered(body.uncovered)
                          setUncoveredCount(body.count)
                          pushToast('Absence recorded.', 'success')
                        })
                        .catch((error) => {
                          pushToast(isApiError(error) ? error.detail : 'Could not record absence.', 'warn')
                        })
                    }}
                  >
                    Record absence
                  </Button>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-body">Assign substitute</p>
                  <Select
                    ariaLabel="Uncovered slot"
                    value={subSlotId}
                    options={[
                      { value: '', label: 'Select uncovered slot' },
                      ...uncovered.map((row) => ({
                        value: row.id,
                        label: `${row.classroom_name} · ${row.period_label} · ${row.subject.name}`,
                      })),
                    ]}
                    onChange={setSubSlotId}
                  />
                  <Select
                    ariaLabel="Substitute teacher"
                    value={subTeacherId}
                    options={[{ value: '', label: 'Select substitute' }, ...teacherOptions]}
                    onChange={setSubTeacherId}
                  />
                  <input
                    className="crm-input w-full px-3 py-2 text-xs"
                    placeholder="Reason"
                    value={subReason}
                    onChange={(event) => setSubReason(event.target.value)}
                  />
                  <Button
                    className="px-3 py-1.5 text-xs"
                    disabled={!subSlotId || !subTeacherId}
                    onClick={() => {
                      void assignSubstitute({
                        slot_id: subSlotId,
                        date: uncoveredDate,
                        substitute_teacher_id: subTeacherId,
                        reason: subReason,
                      })
                        .then((body) => {
                          setUncovered(body.uncovered)
                          setUncoveredCount(body.count)
                          setSubSlotId('')
                          setSubTeacherId('')
                          setSubReason('')
                          pushToast('Substitute assigned.', 'success')
                          loadSlots()
                        })
                        .catch((error) => {
                          pushToast(isApiError(error) ? error.detail : 'Could not assign substitute.', 'warn')
                        })
                    }}
                  >
                    Assign substitute
                  </Button>
                </div>
              </div>
              {uncoveredFailed ? (
                <ErrorState onRetry={() => loadUncovered()}>Uncovered slots could not be loaded.</ErrorState>
              ) : uncovered.length === 0 ? (
                <EmptyState>No uncovered slots for this date.</EmptyState>
              ) : (
                <ul className="space-y-2 text-xs">
                  {uncovered.map((row) => (
                    <li key={`${row.id}-${row.date}`} className="rounded-lg px-3 py-2 crm-subtle">
                      <span className="font-medium text-main">{row.classroom_name}</span>
                      <span className="text-sub">
                        {' '}
                        · {row.period_label} · {row.subject.name} · {row.reason}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}
        </div>
      )}

      {active ? (
        <ClassroomInspector
          key={active.id}
          open
          classroom={active}
          subjects={subjects}
          teachers={teachers}
          canWrite={canWrite}
          onClose={() => setActiveId(null)}
          onSaved={(row) => {
            setActive(row)
            setClassrooms((prev) => prev.map((item) => (item.id === row.id ? row : item)))
          }}
          onOpenTimetable={() => {
            setSelectedClassroomId(active.id)
            setViewMode('classroom')
            setTab('timetable')
            setActiveId(null)
          }}
        />
      ) : null}

      {newOpen ? (
        <NewClassModal
          key="new-class"
          open
          campuses={campuses}
          years={years}
          grades={grades}
          teachers={teachers}
          onClose={() => setNewOpen(false)}
          onCreated={(row) => {
            setClassrooms((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)))
            setNewOpen(false)
            pushToast(`Created class ${row.name}.`, 'success')
          }}
        />
      ) : null}

      {slotEdit ? (
        <SlotEditorModal
          key={`${slotEdit.day}-${slotEdit.period}-${slotEdit.slot?.id ?? 'new'}`}
          open
          day={slotEdit.day}
          period={slotEdit.period}
          slot={slotEdit.slot}
          classroom={selectedClassroom}
          teachers={teachers}
          onClose={() => setSlotEdit(null)}
          onSaved={() => {
            setSlotEdit(null)
            loadSlots()
            loadUncovered()
          }}
        />
      ) : null}
    </div>
  )
}

function ClassroomInspector({
  open,
  classroom,
  subjects,
  teachers,
  canWrite,
  onClose,
  onSaved,
  onOpenTimetable,
}: {
  open: boolean
  classroom: ClassroomRecord
  subjects: SubjectRecord[]
  teachers: TeacherRef[]
  canWrite: boolean
  onClose: () => void
  onSaved: (row: ClassroomRecord) => void
  onOpenTimetable: () => void
}) {
  const [roomLabel, setRoomLabel] = useState(classroom.room_label)
  const [capacity, setCapacity] = useState(String(classroom.capacity))
  const [homeroomId, setHomeroomId] = useState(classroom.homeroom_teacher?.id ?? '')
  const [selectedSubjectIds, setSelectedSubjectIds] = useState(
    () => classroom.subjects.map((row) => row.subject.id),
  )
  const [teacherBySubject, setTeacherBySubject] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const row of classroom.subjects) {
      map[row.subject.id] = row.teacher?.id ?? ''
    }
    return map
  })
  const [error, setError] = useState('')
  const [subjectError, setSubjectError] = useState('')

  return (
    <Drawer open={open} title={classroom.name} onClose={onClose}>
      <div className="space-y-4 text-xs">
        <p className="text-sub">
          {classroom.campus_name} · {classroom.academic_year_label} · {classroom.grade_level.division}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="font-medium text-body">Room</span>
            <input
              className="crm-input w-full px-3 py-2"
              value={roomLabel}
              disabled={!canWrite}
              onChange={(event) => setRoomLabel(event.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="font-medium text-body">Capacity</span>
            <input
              className="crm-input num-tabular w-full px-3 py-2"
              type="number"
              min={1}
              max={120}
              value={capacity}
              disabled={!canWrite}
              onChange={(event) => setCapacity(event.target.value)}
            />
          </label>
        </div>
        <div className="space-y-1">
          <span className="font-medium text-body">Homeroom teacher</span>
          <Select
            ariaLabel="Homeroom teacher"
            value={homeroomId}
            disabled={!canWrite}
            options={[{ value: '', label: 'Unassigned' }, ...teachers.map((row) => ({ value: row.id, label: row.display_name }))]}
            onChange={setHomeroomId}
          />
        </div>
        {canWrite ? (
          <Button
            className="px-3 py-1.5 text-xs"
            onClick={() => {
              setError('')
              void saveClassroom(classroom.id, {
                room_label: roomLabel,
                capacity: Number(capacity),
                homeroom_teacher_id: homeroomId || null,
              })
                .then((row) => {
                  onSaved(row)
                  pushToast('Classroom updated.', 'success')
                })
                .catch((err) => setError(isApiError(err) ? err.detail : 'Could not save classroom.'))
            }}
          >
            Save classroom
          </Button>
        ) : null}
        <FieldErrors messages={error ? [error] : []} />

        <div className="space-y-2 border-t pt-4 crm-border">
          <h3 className="text-sm font-semibold text-main">Subjects this class takes</h3>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {subjects.map((subject) => {
              const checked = selectedSubjectIds.includes(subject.id)
              return (
                <div key={subject.id} className="rounded-lg px-3 py-2 crm-subtle">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!canWrite}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setSelectedSubjectIds((prev) => [...prev, subject.id])
                        } else {
                          setSelectedSubjectIds((prev) => prev.filter((id) => id !== subject.id))
                        }
                      }}
                    />
                    <span className="font-medium text-main">{subject.name}</span>
                    {subject.is_core ? <Badge tone="info">Core</Badge> : null}
                    {subject.is_waec_lab ? <Badge tone="violet">WAEC Lab</Badge> : null}
                  </label>
                  {checked ? (
                    <div className="mt-2">
                      <Select
                        ariaLabel={`${subject.name} teacher`}
                        value={teacherBySubject[subject.id] ?? ''}
                        disabled={!canWrite}
                        options={[
                          { value: '', label: 'Unassigned teacher' },
                          ...teachers.map((row) => ({ value: row.id, label: row.display_name })),
                        ]}
                        onChange={(value) =>
                          setTeacherBySubject((prev) => ({ ...prev, [subject.id]: value }))
                        }
                      />
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
          {canWrite ? (
            <Button
              className="px-3 py-1.5 text-xs"
              onClick={() => {
                setSubjectError('')
                const body: SubjectAssignmentInput[] = selectedSubjectIds.map((subjectId) => ({
                  subject_id: subjectId,
                  teacher_id: teacherBySubject[subjectId] || null,
                }))
                void replaceClassroomSubjects(classroom.id, body)
                  .then((row) => {
                    onSaved(row)
                    pushToast('Subjects updated.', 'success')
                  })
                  .catch((err) => {
                    setSubjectError(
                      fieldText(err, 'subjects') || (isApiError(err) ? err.detail : 'Could not save subjects.'),
                    )
                  })
              }}
            >
              Save subjects
            </Button>
          ) : null}
          <FieldErrors messages={subjectError ? [subjectError] : []} />
        </div>

        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={onOpenTimetable}>
          Open weekly timetable
        </Button>
      </div>
    </Drawer>
  )
}

function NewClassModal({
  open,
  campuses,
  years,
  grades,
  teachers,
  onClose,
  onCreated,
}: {
  open: boolean
  campuses: CampusRecord[]
  years: AcademicYear[]
  grades: GradeLevel[]
  teachers: TeacherRef[]
  onClose: () => void
  onCreated: (row: ClassroomRecord) => void
}) {
  const currentYear = years.find((row) => row.is_current) ?? years[0]
  const [campusId, setCampusId] = useState(campuses[0]?.id ?? '')
  const [yearId, setYearId] = useState(currentYear?.id ?? '')
  const [gradeId, setGradeId] = useState(grades[0]?.id ?? '')
  const [section, setSection] = useState('A')
  const [room, setRoom] = useState('')
  const [capacity, setCapacity] = useState('35')
  const [homeroomId, setHomeroomId] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const campus = campuses.find((row) => row.id === campusId)
  const gradeOptions = (campus?.grades_served.length ? campus.grades_served : grades).map((row) => ({
    value: row.id,
    label: row.name,
  }))

  return (
    <Modal
      open={open}
      title="Create Classroom Section"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" className="px-4 py-1.5 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="px-4 py-1.5 text-xs"
            disabled={pending}
            onClick={() => {
              setPending(true)
              setError('')
              void createClassroom({
                campus_id: campusId,
                academic_year_id: yearId,
                grade_level_id: gradeId,
                section_name: section,
                room_label: room,
                capacity: Number(capacity) || 35,
                homeroom_teacher_id: homeroomId || null,
              })
                .then(onCreated)
                .catch((err) => setError(isApiError(err) ? err.detail : 'Could not create class.'))
                .finally(() => setPending(false))
            }}
          >
            Create Class
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-xs">
        <div className="space-y-1">
          <span className="font-medium text-body">Campus</span>
          <Select
            ariaLabel="Campus"
            value={campusId}
            options={campuses.map((row) => ({ value: row.id, label: row.name }))}
            onChange={setCampusId}
          />
        </div>
        <div className="space-y-1">
          <span className="font-medium text-body">Academic year</span>
          <Select
            ariaLabel="Academic year"
            value={yearId}
            options={years.map((row) => ({ value: row.id, label: row.label }))}
            onChange={setYearId}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <span className="font-medium text-body">Grade</span>
            <Select ariaLabel="Grade" value={gradeId} options={gradeOptions} onChange={setGradeId} />
          </div>
          <label className="space-y-1">
            <span className="font-medium text-body">Section</span>
            <input className="crm-input w-full px-3 py-2" value={section} onChange={(event) => setSection(event.target.value)} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="font-medium text-body">Room</span>
            <input className="crm-input w-full px-3 py-2" value={room} onChange={(event) => setRoom(event.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="font-medium text-body">Capacity</span>
            <input
              className="crm-input num-tabular w-full px-3 py-2"
              type="number"
              min={1}
              max={120}
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
            />
          </label>
        </div>
        <div className="space-y-1">
          <span className="font-medium text-body">Homeroom teacher</span>
          <Select
            ariaLabel="Homeroom teacher"
            value={homeroomId}
            options={[{ value: '', label: 'Unassigned' }, ...teachers.map((row) => ({ value: row.id, label: row.display_name }))]}
            onChange={setHomeroomId}
          />
        </div>
        <FieldErrors messages={error ? [error] : []} />
      </div>
    </Modal>
  )
}

function SlotEditorModal({
  open,
  day,
  period,
  slot,
  classroom,
  teachers,
  onClose,
  onSaved,
}: {
  open: boolean
  day: string
  period: number
  slot: TimetableSlot | null
  classroom: ClassroomRecord | null
  teachers: TeacherRef[]
  onClose: () => void
  onSaved: () => void
}) {
  const initialSubjectId = slot?.subject.id ?? classroom?.subjects[0]?.subject.id ?? ''
  const initialAssignment = classroom?.subjects.find((row) => row.subject.id === initialSubjectId)
  const [subjectId, setSubjectId] = useState(initialSubjectId)
  const [teacherId, setTeacherId] = useState(
    slot?.teacher?.id ?? initialAssignment?.teacher?.id ?? '',
  )
  const [roomLabel, setRoomLabel] = useState(slot?.room_label || classroom?.room_label || '')
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [pending, setPending] = useState(false)

  function chooseSubject(nextId: string) {
    setSubjectId(nextId)
    if (slot) return
    const assignment = classroom?.subjects.find((row) => row.subject.id === nextId)
    if (assignment?.teacher?.id) setTeacherId(assignment.teacher.id)
  }

  const subjectOptions = (classroom?.subjects ?? []).map((row) => ({
    value: row.subject.id,
    label: row.subject.name,
  }))
  const dayLabel = DAYS.find((row) => row.id === day)?.label ?? day

  return (
    <Modal
      open={open}
      title={`${dayLabel} · ${period === 1 ? '1st' : period === 2 ? '2nd' : period === 3 ? '3rd' : `${period}th`} Period`}
      subtitle={classroom?.name}
      onClose={onClose}
      footer={
        <>
          {slot ? (
            <Button
              variant="danger"
              className="mr-auto px-4 py-1.5 text-xs"
              disabled={pending}
              onClick={() => {
                setPending(true)
                void deleteTimetableSlot(slot.id)
                  .then(() => {
                    pushToast('Slot removed.', 'info')
                    onSaved()
                  })
                  .catch((err) => setError(isApiError(err) ? err.detail : 'Could not delete slot.'))
                  .finally(() => setPending(false))
              }}
            >
              Clear slot
            </Button>
          ) : null}
          <Button variant="secondary" className="px-4 py-1.5 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="px-4 py-1.5 text-xs"
            disabled={pending || !classroom || !subjectId}
            onClick={() => {
              if (!classroom) return
              setPending(true)
              setError('')
              setFieldError('')
              const body = {
                classroom_id: classroom.id,
                day_of_week: day,
                period_number: period,
                subject_id: subjectId,
                teacher_id: teacherId || null,
                room_label: roomLabel,
              }
              const task = slot
                ? saveTimetableSlot(slot.id, body)
                : createTimetableSlot(body)
              void task
                .then(() => {
                  pushToast('Timetable slot saved.', 'success')
                  onSaved()
                })
                .catch((err) => {
                  setFieldError(
                    fieldText(err, 'teacher') ||
                      fieldText(err, 'room_label') ||
                      fieldText(err, 'subject_id') ||
                      '',
                  )
                  setError(isApiError(err) ? err.detail : 'Could not save slot.')
                })
                .finally(() => setPending(false))
            }}
          >
            Save slot
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-xs">
        {subjectOptions.length === 0 ? (
          <EmptyState>Assign subjects to this classroom before editing the timetable.</EmptyState>
        ) : (
          <>
            <div className="space-y-1">
              <span className="font-medium text-body">Subject</span>
              <Select ariaLabel="Subject" value={subjectId} options={subjectOptions} onChange={chooseSubject} />
            </div>
            <div className="space-y-1">
              <span className="font-medium text-body">Teacher</span>
              <Select
                ariaLabel="Slot teacher"
                value={teacherId}
                options={[{ value: '', label: 'Unassigned' }, ...teachers.map((row) => ({ value: row.id, label: row.display_name }))]}
                onChange={setTeacherId}
              />
            </div>
            <label className="space-y-1">
              <span className="font-medium text-body">Room</span>
              <input
                className="crm-input w-full px-3 py-2"
                value={roomLabel}
                onChange={(event) => setRoomLabel(event.target.value)}
              />
            </label>
          </>
        )}
        <FieldErrors messages={[fieldError, error].filter(Boolean)} />
      </div>
    </Modal>
  )
}

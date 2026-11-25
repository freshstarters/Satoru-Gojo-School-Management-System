import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { Badge } from '../components/Badge.tsx'
import { Button } from '../components/Button.tsx'
import { Card } from '../components/Card.tsx'
import { ErrorState } from '../components/EmptyState.tsx'
import { Select } from '../components/Select.tsx'
import { NewStaffModal } from '../components/teachers/NewStaffModal.tsx'
import { TeacherInspectorDrawer } from '../components/teachers/TeacherInspectorDrawer.tsx'
import { pushToast } from '../hooks/useToasts.ts'
import { fetchCampuses, fetchGradeLevels, type CampusRecord } from '../service/settings.ts'
import { fetchTeacher, fetchTeachers, type StaffRecord } from '../service/teachers.ts'

const INSPECTOR_TABS = new Set(['profile', 'assignments', 'account'])

function dash(value: string | number | null | undefined) {
  if (value == null || value === '') return '—'
  return String(value)
}

function portalTone(status: string) {
  if (status === 'active') return 'success' as const
  if (status === 'invited') return 'info' as const
  if (status === 'inactive') return 'neutral' as const
  return 'warn' as const
}

function portalLabel(status: string) {
  if (status === 'not_invited') return 'Not Invited'
  if (status === 'invited') return 'Invited'
  if (status === 'inactive') return 'Inactive'
  return 'Active'
}

export function TeachersScreen() {
  const { teacherId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const canEdit = user?.role === 'principal'

  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [rows, setRows] = useState<StaffRecord[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [campusId, setCampusId] = useState('')
  const [divisionId, setDivisionId] = useState('')
  const [campuses, setCampuses] = useState<CampusRecord[]>([])
  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [active, setActive] = useState<StaffRecord | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const rawTab = searchParams.get('tab') || 'profile'
  const inspectorTab = INSPECTOR_TABS.has(rawTab) ? rawTab : 'profile'
  const pageSize = 50
  const pageCount = Math.max(1, Math.ceil(count / pageSize))

  const divisionOptions = useMemo(
    () => [{ value: '', label: 'All Divisions' }, ...divisions.map((row) => ({ value: row.id, label: row.name }))],
    [divisions],
  )

  function setInspectorTab(id: string) {
    const next = new URLSearchParams(searchParams)
    if (id === 'profile') next.delete('tab')
    else next.set('tab', id)
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [campusRows, gradeRows] = await Promise.all([fetchCampuses(), fetchGradeLevels()])
        if (cancelled) return
        setCampuses(campusRows)
        const names = [...new Set(gradeRows.map((grade) => grade.division).filter(Boolean))]
        setDivisions(names.map((name) => ({ id: name, name })))
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
        const data = await fetchTeachers({
          q: q.trim() || undefined,
          campus: campusId || undefined,
          division: divisionId || undefined,
          page,
          page_size: pageSize,
        })
        if (cancelled) return
        setRows(data.results)
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
  }, [q, campusId, divisionId, page, reloadKey])

  useEffect(() => {
    if (!teacherId) return
    let cancelled = false
    ;(async () => {
      try {
        const row = await fetchTeacher(teacherId)
        if (!cancelled) setActive(row)
      } catch {
        if (!cancelled) {
          setActive(null)
          pushToast('Staff member was not found.', 'warn')
          navigate('/teachers', { replace: true })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [teacherId, navigate, reloadKey])

  useEffect(() => {
    if (!teacherId && searchParams.has('tab')) {
      const next = new URLSearchParams(searchParams)
      next.delete('tab')
      setSearchParams(next, { replace: true })
    }
  }, [teacherId, searchParams, setSearchParams])

  return (
    <section className="w-full space-y-5">
      <div className="flex flex-col gap-3 border-b crm-border pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-main">Teachers &amp; Administrative Staff</h1>
          <p className="mt-0.5 text-xs text-sub">
            Faculty directory, homeroom leads, subject specialties, and MoE certifications.
          </p>
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
            placeholder="Search staff..."
            className="crm-input w-44 px-3 py-1.5 text-xs"
          />
          <div className="w-40">
            <Select
              value={divisionId}
              ariaLabel="Division filter"
              onChange={(value) => {
                refreshList()
                setPage(1)
                setDivisionId(value)
              }}
              options={divisionOptions}
            />
          </div>
          <div className="w-40">
            <Select
              value={campusId}
              ariaLabel="Campus filter"
              onChange={(value) => {
                refreshList()
                setPage(1)
                setCampusId(value)
              }}
              options={[
                { value: '', label: 'All Campuses' },
                ...campuses.map((row) => ({ value: row.id, label: row.name })),
              ]}
            />
          </div>
          {canEdit ? (
            <Button className="px-3 py-1.5 text-xs" onClick={() => setAddOpen(true)}>
              + Add Staff
            </Button>
          ) : null}
        </div>
      </div>

      {failed ? (
        <ErrorState
          onRetry={() => {
            refreshList()
            setReloadKey((value) => value + 1)
          }}
        >
          Could not load staff.
        </ErrorState>
      ) : null}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b crm-border text-[11px] font-semibold uppercase text-sub">
                <th className="px-4 py-3">Staff Member</th>
                <th className="px-4 py-3">Role &amp; Division</th>
                <th className="px-4 py-3">Homeroom</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y crm-border text-xs">
              {!ready ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sub">
                    Loading staff.
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sub">
                    No staff match this filter.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="crm-hover cursor-pointer"
                    onClick={() => navigate(`/teachers/${row.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-main">{row.full_name}</div>
                      <div className="text-[11px] text-sub">{row.staff_code}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-main">{dash(row.job_title || row.role_label)}</div>
                      <div className="text-[11px] text-sub">{dash(row.division)}</div>
                    </td>
                    <td className="px-4 py-3 text-body">
                      {row.homerooms.length ? row.homerooms.map((item) => item.name).join(', ') : '—'}
                    </td>
                    <td className="px-4 py-3 text-body">{row.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge tone={portalTone(row.portal_status)}>{portalLabel(row.portal_status)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="secondary"
                        className="px-2.5 py-1 text-[11px]"
                        onClick={(event) => {
                          event.stopPropagation()
                          navigate(`/teachers/${row.id}`)
                        }}
                      >
                        Open
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t crm-border px-4 py-3 text-xs">
          <span className="num-tabular text-sub">
            {count} staff · page {page} of {pageCount}
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

      {addOpen ? (
        <NewStaffModal
          open
          campuses={campuses}
          divisions={divisions}
          onClose={() => setAddOpen(false)}
          onCreated={() => {
            setAddOpen(false)
            refreshList()
            setPage(1)
            setReloadKey((value) => value + 1)
          }}
        />
      ) : null}

      {active && active.id === teacherId ? (
        <TeacherInspectorDrawer
          key={active.id}
          open={Boolean(teacherId)}
          staff={active}
          tab={inspectorTab}
          onTab={setInspectorTab}
          canEdit={canEdit}
          campuses={campuses}
          divisions={divisions}
          onClose={() => {
            setActive(null)
            navigate('/teachers')
          }}
          onSaved={() => setReloadKey((value) => value + 1)}
        />
      ) : null}
    </section>
  )
}

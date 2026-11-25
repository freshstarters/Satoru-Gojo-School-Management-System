import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { Badge } from '../components/Badge.tsx'
import { Button } from '../components/Button.tsx'
import { Card } from '../components/Card.tsx'
import { ErrorState } from '../components/EmptyState.tsx'
import { NewParentModal } from '../components/parents/NewParentModal.tsx'
import { ParentInspectorDrawer } from '../components/parents/ParentInspectorDrawer.tsx'
import { pushToast } from '../hooks/useToasts.ts'
import { fetchParent, fetchParents, type GuardianRecord } from '../service/parents.ts'
import { fetchStudents, type StudentRecord } from '../service/students.ts'

const INSPECTOR_TABS = new Set(['profile', 'children', 'account'])

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

export function ParentsScreen() {
  const { parentId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const role = user?.role ?? ''
  const canEdit = role === 'principal' || role === 'registrar'
  const canSeeBalance = role === 'principal' || role === 'registrar' || role === 'bursar'

  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [rows, setRows] = useState<GuardianRecord[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [active, setActive] = useState<GuardianRecord | null>(null)
  const [students, setStudents] = useState<StudentRecord[]>([])
  const [reloadKey, setReloadKey] = useState(0)

  const rawTab = searchParams.get('tab') || 'profile'
  const inspectorTab = INSPECTOR_TABS.has(rawTab) ? rawTab : 'profile'
  const pageSize = 50
  const pageCount = Math.max(1, Math.ceil(count / pageSize))

  function setInspectorTab(id: string) {
    const next = new URLSearchParams(searchParams)
    if (id === 'profile') next.delete('tab')
    else next.set('tab', id)
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    let cancelled = false
    setReady(false)
    ;(async () => {
      try {
        const data = await fetchParents({
          q: q.trim() || undefined,
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
  }, [q, page, reloadKey])

  useEffect(() => {
    if (!canEdit) return
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchStudents({ page: 1, page_size: 200 })
        if (!cancelled) setStudents(data.results)
      } catch {
        if (!cancelled) setStudents([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [canEdit, reloadKey])

  useEffect(() => {
    if (!parentId) {
      setActive(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const row = await fetchParent(parentId)
        if (!cancelled) setActive(row)
      } catch {
        if (!cancelled) {
          setActive(null)
          pushToast('Guardian was not found.', 'warn')
          navigate('/parents', { replace: true })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [parentId, navigate, reloadKey])

  useEffect(() => {
    if (!parentId && searchParams.has('tab')) {
      const next = new URLSearchParams(searchParams)
      next.delete('tab')
      setSearchParams(next, { replace: true })
    }
  }, [parentId, searchParams, setSearchParams])

  return (
    <section className="w-full space-y-5">
      <div className="flex flex-col gap-3 border-b crm-border pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-main">Parents &amp; Authorized Guardians</h1>
          <p className="mt-0.5 text-xs text-sub">
            Primary contacts, SMS notification consent, and authorized campus pickup verification.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={q}
            onChange={(event) => {
              setPage(1)
              setQ(event.target.value)
            }}
            placeholder="Search guardians..."
            className="crm-input w-44 px-3 py-1.5 text-xs"
          />
          {canEdit ? (
            <Button className="px-3 py-1.5 text-xs" onClick={() => setAddOpen(true)}>
              + Add Guardian
            </Button>
          ) : null}
        </div>
      </div>

      {failed ? (
        <ErrorState onRetry={() => setReloadKey((value) => value + 1)}>Could not load guardians.</ErrorState>
      ) : null}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b crm-border text-[11px] font-semibold uppercase text-sub">
                <th className="px-4 py-3">Guardian</th>
                <th className="px-4 py-3">Zone</th>
                <th className="px-4 py-3">Phone (LR)</th>
                <th className="px-4 py-3">Linked Children</th>
                <th className="px-4 py-3">SMS Consent</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y crm-border text-xs">
              {!ready ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sub">
                    Loading guardians.
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sub">
                    No guardians match this filter.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="crm-hover cursor-pointer"
                    onClick={() => navigate(`/parents/${row.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-main">{row.full_name}</div>
                      <div className="mt-1">
                        <Badge tone={portalTone(row.portal_status)}>{portalLabel(row.portal_status)}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-body">{row.residential_zone || '—'}</td>
                    <td className="px-4 py-3 text-body">{row.phone}</td>
                    <td className="num-tabular px-4 py-3 text-main">{row.linked_children_count}</td>
                    <td className="px-4 py-3">
                      <Badge tone={row.sms_consent ? 'success' : 'warn'}>
                        {row.sms_consent ? 'Opted In' : 'Opted Out'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="secondary"
                        className="px-2.5 py-1 text-[11px]"
                        onClick={(event) => {
                          event.stopPropagation()
                          navigate(`/parents/${row.id}`)
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
            {count} guardians · page {page} of {pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="px-2.5 py-1 text-[11px]"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              className="px-2.5 py-1 text-[11px]"
              disabled={page >= pageCount}
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {addOpen ? (
        <NewParentModal
          open
          onClose={() => setAddOpen(false)}
          onCreated={() => {
            setAddOpen(false)
            setPage(1)
            setReloadKey((value) => value + 1)
          }}
        />
      ) : null}

      {active ? (
        <ParentInspectorDrawer
          key={active.id}
          open={Boolean(parentId)}
          guardian={active}
          tab={inspectorTab}
          onTab={setInspectorTab}
          canEdit={canEdit}
          canSeeBalance={canSeeBalance}
          students={students}
          onClose={() => navigate('/parents')}
          onSaved={() => setReloadKey((value) => value + 1)}
        />
      ) : null}
    </section>
  )
}

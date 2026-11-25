import { useEffect, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router'
import type { PublicUser } from '../service/apiClient.ts'
import { sampleWorkspace } from '../fixtures/sampleWorkspace.ts'
import { canTopUp, dashboardTitle, initials, panesForRole, roleLabel, type Pane } from '../navigation.ts'
import { useSchoolProfile } from '../school/school-profile.ts'
import { fetchClassrooms } from '../service/classes.ts'
import { fetchStudents } from '../service/students.ts'
import { formatLrd } from '../utils/money.ts'
import { Button } from './Button.tsx'

export function Sidebar({
  user,
  mobileOpen,
  onNavigate,
  onTopUp,
}: {
  user: PublicUser
  mobileOpen: boolean
  onNavigate: () => void
  onTopUp: () => void
}) {
  const profile = useSchoolProfile()
  const [liveCounts, setLiveCounts] = useState<{ students?: number; classes?: number }>({})
  const panes = panesForRole(user.role, {
    students: liveCounts.students,
    classes: liveCounts.classes,
  })
  const sections = ['Campus Core', 'Academics', 'People & Welfare', 'Operations'] as const
  const school = sampleWorkspace
  const schoolName = profile.schoolName.trim() || school.schoolName

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      fetchStudents({ page: 1, page_size: 1 }).then((body) => body.summary.total),
      fetchClassrooms().then((rows) => rows.length),
    ])
      .then(([students, classes]) => {
        if (!cancelled) setLiveCounts({ students, classes })
      })
      .catch(() => {
        if (!cancelled) setLiveCounts({})
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <aside
      className={`floating-sidebar crm-sidebar z-40 flex shrink-0 flex-col justify-between overflow-y-auto ${
        mobileOpen ? 'mobile-open fixed inset-y-3 left-3 z-50 flex' : 'hidden lg:flex'
      }`}
    >
      <div className="space-y-3 p-2.5">
        <div className="sb-brand-card crm-card flex items-center justify-between rounded-lg p-2">
          <div className="flex min-w-0 items-center space-x-2.5">
            <div className="btn-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-bold shadow-sm">
              G
            </div>
            <div className="sb-label min-w-0">
              <div className="truncate text-sm font-semibold text-main">{schoolName}</div>
              <div className="truncate text-xs text-sub">{school.tagline}</div>
            </div>
          </div>
          <span className="sb-label ml-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" data-tooltip={school.statusTooltip} />
        </div>
        {sections.map((section) => {
          const items = panes.filter((pane) => pane.section === section)
          if (items.length === 0) return null
          return (
            <div key={section}>
              <div className="sb-collapse-hide mb-1.5 whitespace-nowrap px-3 text-[11px] font-semibold uppercase tracking-wider text-sub">
                {section}
              </div>
              <nav className="space-y-1">
                {items.map((pane) => (
                  <NavItem
                    key={pane.id}
                    pane={pane}
                    tooltip={pane.id === 'dashboard' ? dashboardTitle(user.role) : pane.tooltip}
                    onNavigate={onNavigate}
                  />
                ))}
              </nav>
            </div>
          )
        })}
      </div>
      <div className="border-t crm-border p-2.5">
        <div className="sb-compact-only flex-col items-center space-y-2.5 py-1">
          <div
            className="crm-card flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold text-emerald-600 dark:text-emerald-400"
            data-tooltip={school.walletTooltip}
          >
            L$
          </div>
          <div
            className="crm-subtle flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-main"
            data-tooltip={`Role: ${roleLabel(user.role)}`}
          >
            {initials(user.display_name)}
          </div>
        </div>
        <div className="sb-collapse-hide space-y-3">
          <div className="crm-card space-y-1.5 rounded-lg p-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-body">Parent SMS Wallet</span>
              <span className="badge badge-success px-1.5 py-0 text-[10px]">{school.walletSender}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="num-tabular text-sm font-semibold text-main" data-tooltip={school.walletTooltip}>
                {formatLrd(school.walletBalance)}
              </span>
              {canTopUp(user.role) ? (
                <button type="button" className="text-xs font-medium hover:underline" style={{ color: 'var(--brand-text)' }} onClick={onTopUp}>
                  + Top up
                </button>
              ) : null}
            </div>
            <div className="text-[11px] text-sub">Lonestar MTN MoMo / Orange Money</div>
          </div>
          <div>
            <p className="text-[11px] font-medium text-sub">Signed in</p>
            <p className="truncate text-xs font-medium text-main">{user.display_name}</p>
            <p className="text-[11px] text-sub">{roleLabel(user.role)}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

function NavItem({ pane, tooltip, onNavigate }: { pane: Pane; tooltip: string; onNavigate: () => void }) {
  return (
    <NavLink
      to={`/${pane.id}`}
      data-tooltip={tooltip}
      onClick={onNavigate}
      className={({ isActive }) =>
        `nav-item flex w-full items-center justify-between px-3.5 text-xs ${pane.id === 'dashboard' ? 'py-2.5' : 'py-2'} ${isActive ? 'active' : ''}`
      }
    >
      <div className="flex min-w-0 items-center space-x-3">
        <NavGlyph id={pane.id} />
        <span className="sb-label">{pane.label}</span>
      </div>
      {pane.count != null ? (
        <span className={`sb-label num-tabular text-[11px] ${pane.id === 'students' ? 'sb-pill crm-subtle rounded-full py-0.5 font-medium text-body' : 'text-xs text-sub'}`}>
          {pane.count}
        </span>
      ) : pane.id === 'dashboard' ? (
        <span className="sb-label text-[11px] text-sub">Campus</span>
      ) : null}
    </NavLink>
  )
}

const navGlyphs: Record<Pane['id'], ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  students: (
    <>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </>
  ),
  admissions: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </>
  ),
  fees: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </>
  ),
  classes: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="9" y1="22" x2="9" y2="10" />
    </>
  ),
  attendance: (
    <>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </>
  ),
  grades: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </>
  ),
  teachers: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  parents: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  library: (
    <>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </>
  ),
  transport: (
    <>
      <rect x="3" y="6" width="18" height="11" rx="2" />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="16.5" cy="17.5" r="1.5" />
      <path d="M3 11h18" />
    </>
  ),
  announcements: (
    <>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1.05 1.42 1.2.15.04.3.05.46.05H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
}

function NavGlyph({ id }: { id: Pane['id'] }) {
  const dashboard = id === 'dashboard'
  return (
    <svg
      className={dashboard ? 'h-4 w-4 shrink-0' : 'h-4 w-4 shrink-0 text-sub'}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={dashboard ? 2 : 1.75}
    >
      {navGlyphs[id]}
    </svg>
  )
}

export function MenuButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="secondary" className="p-1.5 lg:hidden" aria-label="Toggle menu" onClick={onClick}>
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </Button>
  )
}

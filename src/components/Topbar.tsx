import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { pushToast } from '../hooks/useToasts.ts'
import { setAccent, setFont, setTheme, setUsdReference, usePreferences, type AccentName, type FontName } from '../hooks/usePreferences.ts'
import { canSeeAi, canSeeAudit, dashboardTitle, initials, roleLabel, type Pane } from '../navigation.ts'
import { formatMonroviaDateTime } from '../utils/datetime.ts'
import { fetchSessions, refreshSession, revokeSession, type BrowserSession } from '../service/apiClient.ts'
import { sampleWorkspace } from '../fixtures/sampleWorkspace.ts'
import { Button } from './Button.tsx'
import { ConfirmDialog } from './ConfirmDialog.tsx'
import { Drawer } from './Drawer.tsx'
import { EmptyState, ErrorState } from './EmptyState.tsx'
import { Modal } from './Modal.tsx'
import { Select } from './Select.tsx'
import { MenuButton } from './Sidebar.tsx'

export function Topbar({
  pane,
  onMenu,
  topUpOpen,
  onTopUpClose,
}: {
  pane: Pane | null
  onMenu: () => void
  topUpOpen: boolean
  onTopUpClose: () => void
}) {
  const { user, logout } = useAuth()
  const preferences = usePreferences()
  const navigate = useNavigate()
  const searchRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [auditOpen, setAuditOpen] = useState(false)
  const [sessions, setSessions] = useState<BrowserSession[]>([])
  const [sessionsReady, setSessionsReady] = useState(false)
  const [sessionError, setSessionError] = useState('')
  const [pending, setPending] = useState<BrowserSession | null>(null)
  const [revoking, setRevoking] = useState(false)
  const role = user?.role ?? ''

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    let cancelled = false
    void fetchSessions()
      .then((data) => {
        if (cancelled) return
        setSessions(data.sessions)
        setSessionsReady(true)
      })
      .catch(() => {
        if (cancelled) return
        setSessionError('Sessions could not be loaded.')
        setSessionsReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [menuOpen])

  async function signOut() {
    await logout()
    navigate('/login', { replace: true })
  }

  async function confirmRevoke() {
    if (!pending) return
    setRevoking(true)
    try {
      await revokeSession(pending.session_id)
      const session = await refreshSession()
      if (!session) {
        await logout()
        navigate('/login', { replace: true })
        return
      }
      const data = await fetchSessions()
      setSessions(data.sessions)
      setPending(null)
    } catch {
      setSessionError('That session could not be revoked.')
    } finally {
      setRevoking(false)
    }
  }

  return (
    <header className="floating-topbar sticky top-3 z-30 mx-3 flex shrink-0 items-center justify-between px-4 sm:mx-4 sm:px-5">
      <div className="flex items-center space-x-3">
        <MenuButton onClick={onMenu} />
        <div className="flex items-center space-x-2 text-sm">
          <span className="hidden text-sub sm:inline">{sampleWorkspace.schoolName}</span>
          <span className="hidden text-sub sm:inline">/</span>
          <span className="font-semibold text-main">
            {pane?.id === 'dashboard' ? dashboardTitle(role) : pane?.breadcrumb ?? 'Campus'}
          </span>
        </div>
      </div>
      <div className="relative mx-4 max-w-md flex-1">
        <div className="relative flex items-center">
          <svg className="pointer-events-none absolute left-3 h-4 w-4 text-sub" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={searchRef}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setSearchOpen(true)
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search students, guardians, LRD receipts, or classes..."
            className="crm-input w-full py-1.5 pl-9 pr-12 text-xs"
          />
          <span className="crm-subtle absolute right-2.5 hidden rounded px-1.5 py-0.5 text-[11px] text-sub sm:inline">Ctrl K</span>
        </div>
        {searchOpen ? (
          <div className="crm-card absolute left-0 right-0 top-full z-40 mt-2 p-3">
            <p className="text-xs text-sub">Search is not available yet.</p>
          </div>
        ) : null}
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="secondary"
          className="hidden items-center space-x-1.5 px-2.5 py-1.5 text-xs md:inline-flex"
          data-tooltip="Show optional USD reference alongside LRD"
          onClick={() => {
            const next = !preferences.showUsd
            setUsdReference(next)
            pushToast(next ? 'Showing optional USD equivalent next to LRD.' : 'Showing LRD amounts only.', 'info')
          }}
        >
          <span className="font-semibold text-main">LRD</span>
          <span className="text-[10px] text-sub">{preferences.showUsd ? '+ USD' : 'Only'}</span>
        </Button>
        <Button
          variant="plain"
          className="icon-plain"
          data-tooltip={preferences.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Switch theme"
          onClick={() => {
            const next = preferences.theme === 'dark' ? 'light' : 'dark'
            setTheme(next)
            pushToast(`Switched campus theme to ${next === 'dark' ? 'Dark' : 'Light'} mode.`, 'info')
          }}
        >
          {preferences.theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </Button>
        <div className="relative">
          <Button variant="plain" aria-label="Appearance" data-tooltip="Appearance" onClick={() => setAppearanceOpen((open) => !open)}>
            <PaletteIcon />
          </Button>
          {appearanceOpen ? (
            <div className="crm-card absolute right-0 z-40 mt-2 w-72 space-y-4 p-4 shadow-xl">
              <div className="flex items-center justify-between border-b crm-border pb-2.5">
                <span className="text-xs font-semibold text-main">Campus Theme Tokens</span>
                <button type="button" className="text-xs text-sub" onClick={() => setAppearanceOpen(false)} aria-label="Close appearance">
                  Close
                </button>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-sub">Surface Mode</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" className={`py-1.5 text-xs font-medium ${preferences.theme === 'light' ? 'border-blue-500' : ''}`} onClick={() => setTheme('light')}>
                    Light
                  </Button>
                  <Button variant="secondary" className={`py-1.5 text-xs font-medium ${preferences.theme === 'dark' ? 'border-blue-500' : ''}`} onClick={() => setTheme('dark')}>
                    Dark
                  </Button>
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-sub">Brand Accent</p>
                <div className="grid grid-cols-4 gap-2">
                  {(['blue', 'slate', 'emerald', 'indigo'] as AccentName[]).map((accent) => (
                    <button
                      key={accent}
                      type="button"
                      className="flex items-center justify-center space-x-1 rounded border crm-border px-2 py-1.5 text-xs font-medium text-main"
                      onClick={() => {
                        setAccent(accent)
                        pushToast(`Updated brand accent to ${accent}.`, 'info')
                      }}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${accentDot[accent]}`} />
                      <span className="capitalize">{accent === 'emerald' ? 'Green' : accent}</span>
                    </button>
                  ))}
                </div>
              </div>
              <Select
                ariaLabel="Typography"
                value={preferences.font}
                options={[
                  { value: 'inter', label: 'Inter (Standard Sans)' },
                  { value: 'jakarta', label: 'Plus Jakarta Sans' },
                  { value: 'system', label: 'System UI' },
                ]}
                onChange={(value) => {
                  setFont(value as FontName)
                  pushToast('Updated campus typography.', 'info')
                }}
              />
            </div>
          ) : null}
        </div>
        {canSeeAi(role) ? (
          <Button variant="secondary" className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs" onClick={() => setAiOpen(true)}>
            <span className="hidden sm:inline">School AI</span>
            <span className="sm:hidden">AI</span>
          </Button>
        ) : null}
        {canSeeAudit(role) ? (
          <Button variant="secondary" className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs" onClick={() => setAuditOpen(true)}>
            <span className="hidden sm:inline">Campus Log</span>
          </Button>
        ) : null}
        <div className="relative">
          <Button
            variant="secondary"
            className="px-2.5 py-1.5 text-xs"
            aria-label="Account"
            onClick={() => {
              setSessionError('')
              setSessionsReady(false)
              setMenuOpen((open) => !open)
            }}
          >
            {user ? initials(user.display_name) : 'Account'}
          </Button>
          {menuOpen && user ? (
            <div className="crm-card absolute right-0 z-40 mt-2 w-72 space-y-3 p-4">
              <div>
                <p className="text-xs font-semibold text-main">{user.display_name}</p>
                <p className="text-[11px] text-sub">{user.email}</p>
                <p className="text-[11px] text-sub">{roleLabel(user.role)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-medium uppercase text-sub">This browser</p>
                {sessionError ? <ErrorState>{sessionError}</ErrorState> : null}
                {!sessionError && sessionsReady && sessions.length === 0 ? <EmptyState>No sessions in this browser.</EmptyState> : null}
                {sessions.map((session) => (
                  <div key={session.session_id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate text-xs text-body">{session.email}</span>
                      <span className="block text-[11px] text-sub">{formatMonroviaDateTime(session.issued_at)}</span>
                    </span>
                    <Button variant="secondary" className="px-2 py-1 text-[11px]" onClick={() => setPending(session)}>
                      Revoke
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="secondary" className="w-full px-3 py-1.5 text-xs" onClick={() => void signOut()}>
                Sign out
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      <Modal open={aiOpen} title="School AI" onClose={() => setAiOpen(false)} footer={<Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setAiOpen(false)}>Close</Button>}>
        <p className="text-xs text-sub">School AI is not available yet.</p>
      </Modal>
      <Modal open={topUpOpen} title="SMS top up" onClose={onTopUpClose} footer={<Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={onTopUpClose}>Close</Button>}>
        <p className="text-xs text-sub">SMS top up is not available yet.</p>
      </Modal>
      <Drawer open={auditOpen} title="Campus Log" width="36rem" onClose={() => setAuditOpen(false)}>
        <EmptyState>No activities yet.</EmptyState>
      </Drawer>
      <ConfirmDialog
        open={pending != null}
        title="Revoke session"
        message="This signs out the session stored in this browser."
        confirmLabel={revoking ? 'Revoking' : 'Revoke'}
        busy={revoking}
        onClose={() => setPending(null)}
        onConfirm={() => void confirmRevoke()}
      />
    </header>
  )
}

const accentDot: Record<AccentName, string> = {
  blue: 'bg-blue-600',
  slate: 'bg-slate-700',
  emerald: 'bg-emerald-600',
  indigo: 'bg-indigo-600',
}

function MoonIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
    </svg>
  )
}

function PaletteIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <circle cx="8" cy="10" r="1" />
      <circle cx="12" cy="8" r="1" />
      <circle cx="16" cy="11" r="1" />
    </svg>
  )
}

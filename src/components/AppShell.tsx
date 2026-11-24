import { useState } from 'react'
import { Outlet, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { paneById } from '../navigation.ts'
import { Sidebar } from './Sidebar.tsx'
import { Topbar } from './Topbar.tsx'

export function AppShell() {
  const { user } = useAuth()
  const { paneId } = useParams()
  const pane = paneId ? paneById(paneId) : null
  const [mobileOpen, setMobileOpen] = useState(false)
  const [topUpOpen, setTopUpOpen] = useState(false)

  if (!user) return null

  return (
    <div className="relative flex h-full overflow-hidden">
      <div className="hidden w-[5.25rem] shrink-0 lg:block" />
      {mobileOpen ? (
        <button type="button" className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
      ) : null}
      <Sidebar
        user={user}
        mobileOpen={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
        onTopUp={() => setTopUpOpen(true)}
      />
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-y-auto">
        <Topbar
          pane={pane}
          onMenu={() => setMobileOpen((open) => !open)}
          topUpOpen={topUpOpen}
          onTopUpClose={() => setTopUpOpen(false)}
        />
        <main className="flex-1 space-y-5 px-3 pb-6 pt-3 sm:px-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

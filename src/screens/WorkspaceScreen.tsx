import { Navigate, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { Card } from '../components/Card.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { usePreferences } from '../hooks/usePreferences.ts'
import { dashboardTitle, firstPane, paneById, panesForRole } from '../navigation.ts'
import { useSchoolProfile } from '../school/school-profile.ts'
import { formatLrd, formatUsdEquivalent } from '../utils/money.ts'
import { ClassesScreen } from './ClassesScreen.tsx'
import { ParentsScreen } from './ParentsScreen.tsx'
import { SettingsScreen } from './SettingsScreen.tsx'
import { StudentsScreen } from './StudentsScreen.tsx'
import { TeachersScreen } from './TeachersScreen.tsx'

export function HomeRedirect() {
  const { user } = useAuth()
  const pane = firstPane(user?.role ?? '')
  if (!pane) return <EmptyState>No workspace is available for this account.</EmptyState>
  return <Navigate to={`/${pane.id}`} replace />
}

export function WorkspaceScreen() {
  const { paneId, studentId, teacherId, parentId } = useParams()
  const { user } = useAuth()
  const preferences = usePreferences()
  const profile = useSchoolProfile()
  const resolvedPaneId = studentId
    ? 'students'
    : teacherId
      ? 'teachers'
      : parentId
        ? 'parents'
        : paneId
  const pane = resolvedPaneId ? paneById(resolvedPaneId) : null
  const allowed = panesForRole(user?.role ?? '')
  if (!pane || !allowed.some((item) => item.id === pane.id)) {
    const next = allowed[0]
    if (!next) return <EmptyState>No workspace is available for this account.</EmptyState>
    return <Navigate to={`/${next.id}`} replace />
  }

  const ownsHeader =
    pane.id === 'classes' ||
    pane.id === 'students' ||
    pane.id === 'teachers' ||
    pane.id === 'parents'

  return (
    <section className={`space-y-5 ${pane.id === 'settings' ? 'max-w-4xl' : 'w-full'}`}>
      {ownsHeader ? null : (
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-main">
            {pane.id === 'dashboard' ? dashboardTitle(user?.role ?? '') : pane.breadcrumb}
          </h1>
          <p className="mt-0.5 text-xs text-sub">{pane.subtitle}</p>
        </div>
      )}
      {pane.money != null ? (
        <Card className="p-4">
          <p className="num-tabular text-sm font-semibold text-main">{formatLrd(pane.money)}</p>
          {preferences.showUsd && profile.lrdPerUsd != null ? (
            <p className="num-tabular text-xs text-sub">{formatUsdEquivalent(pane.money, profile.lrdPerUsd)}</p>
          ) : null}
        </Card>
      ) : null}
      {pane.id === 'settings' ? (
        <SettingsScreen />
      ) : pane.id === 'classes' ? (
        <ClassesScreen />
      ) : pane.id === 'students' ? (
        <StudentsScreen />
      ) : pane.id === 'teachers' ? (
        <TeachersScreen />
      ) : pane.id === 'parents' ? (
        <ParentsScreen />
      ) : (
        <p className="text-xs text-sub">This workspace is not available yet.</p>
      )}
      <p className="text-xs text-sub">Times use Africa/Monrovia.</p>
    </section>
  )
}

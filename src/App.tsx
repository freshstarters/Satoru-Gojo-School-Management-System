import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import { AuthProvider } from './auth/AuthProvider.tsx'
import { useAuth } from './auth/useAuth.ts'
import { AppShell } from './components/AppShell.tsx'
import { ToastRegion } from './components/Toast.tsx'
import { TooltipLayer } from './components/Tooltip.tsx'
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen.tsx'
import { InviteScreen } from './screens/InviteScreen.tsx'
import { LoginScreen } from './screens/LoginScreen.tsx'
import { PrivacyScreen } from './screens/PrivacyScreen.tsx'
import { ResetPasswordScreen } from './screens/ResetPasswordScreen.tsx'
import { HomeRedirect, WorkspaceScreen } from './screens/WorkspaceScreen.tsx'

export default function App() {
  return (
    <AuthProvider>
      <div className="h-full">
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/invite" element={<InviteScreen />} />
          <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
          <Route path="/reset-password" element={<ResetPasswordScreen />} />
          <Route path="/privacy" element={<PrivacyScreen />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route index element={<HomeRedirect />} />
              <Route path=":paneId" element={<WorkspaceScreen />} />
            </Route>
          </Route>
        </Routes>
        <ToastRegion />
        <TooltipLayer />
      </div>
    </AuthProvider>
  )
}

function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'checking') return <p className="p-6 text-xs text-sub">Checking session.</p>
  if (status === 'anonymous') {
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }
  return <Outlet />
}

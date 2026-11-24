import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { Button } from '../components/Button.tsx'
import { ErrorState, FieldErrors } from '../components/EmptyState.tsx'
import { GoogleSignInButton } from '../components/GoogleSignInButton.tsx'
import { googleSignInEnabled } from '../utils/google.ts'
import { fieldText, isApiError } from '../service/apiClient.ts'
import { destinationFor } from './destinations.ts'
import { AuthLayout, AuthLinks } from './AuthLayout.tsx'

export function LoginScreen() {
  const { status, user, config, configError, reloadConfig, login, loginGoogle } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [loginValue, setLoginValue] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const next = params.get('next') ?? ''

  if (status === 'checking') return <p className="p-6 text-xs text-sub">Checking session.</p>
  if (status === 'authenticated' && user) {
    return <Navigate to={destinationFor(next, user.role)} replace />
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const signedIn = await login(loginValue, password)
      navigate(destinationFor(next, signedIn.role), { replace: true })
    } catch (caught) {
      setError(caught)
    } finally {
      setBusy(false)
    }
  }

  const detail = isApiError(error) ? error.detail : error ? 'Sign-in failed.' : ''

  return (
    <AuthLayout title="Sign in">
      {configError ? <ErrorState onRetry={() => void reloadConfig()}>{configError}</ErrorState> : null}
      <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-sub">Email or +231 phone</span>
          <input
            className="crm-input w-full px-3 py-1.5 text-xs"
            autoComplete="username"
            value={loginValue}
            onChange={(event) => setLoginValue(event.target.value)}
          />
          <FieldErrors messages={fieldText(error, 'login') ? [fieldText(error, 'login')] : []} />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-sub">Password</span>
          <input
            type="password"
            className="crm-input w-full px-3 py-1.5 text-xs"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <FieldErrors messages={fieldText(error, 'password') ? [fieldText(error, 'password')] : []} />
        </label>
        {detail ? <p className="text-xs text-sub">{detail}</p> : null}
        <Button type="submit" className="w-full px-3 py-1.5 text-xs" disabled={busy}>
          {busy ? 'Signing in' : 'Sign in'}
        </Button>
      </form>
      {googleSignInEnabled(Boolean(config?.google_enabled)) ? (
        <GoogleSignInButton
          onCredential={(idToken) => {
            setBusy(true)
            setError(null)
            void loginGoogle(idToken)
              .then((signedIn) => navigate(destinationFor(next, signedIn.role), { replace: true }))
              .catch((caught: unknown) => setError(caught))
              .finally(() => setBusy(false))
          }}
        />
      ) : null}
      <AuthLinks />
    </AuthLayout>
  )
}

import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { Button } from '../components/Button.tsx'
import { FieldErrors } from '../components/EmptyState.tsx'
import { GoogleSignInButton } from '../components/GoogleSignInButton.tsx'
import { googleSignInEnabled } from '../utils/google.ts'
import { useSubmitGuard } from '../hooks/useSubmitGuard.ts'
import { acceptInvite, fieldText, isApiError } from '../service/apiClient.ts'
import { destinationFor } from './destinations.ts'
import { AuthLayout } from './AuthLayout.tsx'

export function InviteScreen() {
  const { config, adoptSession } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [token, setToken] = useState(params.get('token') ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const guard = useSubmitGuard()

  async function submitPassword(event: FormEvent) {
    event.preventDefault()
    const key = guard.claim(`password\n${token}\n${password}`)
    if (!key) return
    setBusy(true)
    setError(null)
    try {
      const session = await acceptInvite({ token, password }, key)
      adoptSession(session.user)
      navigate(destinationFor('', session.user.role), { replace: true })
    } catch (caught) {
      setError(caught)
    } finally {
      guard.release()
      setBusy(false)
    }
  }

  const detail = isApiError(error) ? error.detail : ''
  const formMessages = isApiError(error) ? (error.fields.non_field_errors ?? []) : []

  return (
    <AuthLayout title="Activate invite">
      <p className="text-xs text-sub">
        Paste the token from your invite, then set a password. Google can be used instead of a password.
      </p>
      <form className="space-y-3" onSubmit={(event) => void submitPassword(event)}>
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-sub">Invite token</span>
          <input className="crm-input w-full px-3 py-1.5 text-xs" value={token} onChange={(event) => setToken(event.target.value)} />
          <FieldErrors messages={fieldText(error, 'token') ? [fieldText(error, 'token')] : []} />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-sub">Password</span>
          <input
            type="password"
            className="crm-input w-full px-3 py-1.5 text-xs"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <FieldErrors messages={fieldText(error, 'password') ? [fieldText(error, 'password')] : []} />
        </label>
        <FieldErrors messages={formMessages} />
        {detail ? <p className="text-xs text-sub">{detail}</p> : null}
        <Button type="submit" className="w-full px-3 py-1.5 text-xs" disabled={busy}>
          {busy ? 'Activating' : 'Set password'}
        </Button>
      </form>
      {googleSignInEnabled(Boolean(config?.google_enabled)) ? (
        <GoogleSignInButton
          onCredential={(idToken) => {
            const key = guard.claim(`google\n${token}\n${idToken}`)
            if (!key) return
            setBusy(true)
            setError(null)
            void acceptInvite({ token, id_token: idToken }, key)
              .then((session) => {
                adoptSession(session.user)
                navigate(destinationFor('', session.user.role), { replace: true })
              })
              .catch((caught: unknown) => setError(caught))
              .finally(() => {
                guard.release()
                setBusy(false)
              })
          }}
        />
      ) : null}
      <Link to="/login" className="text-xs font-medium" style={{ color: 'var(--brand-text)' }}>
        Back to sign in
      </Link>
    </AuthLayout>
  )
}

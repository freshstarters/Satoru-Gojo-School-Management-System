import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button } from '../components/Button.tsx'
import { FieldErrors } from '../components/EmptyState.tsx'
import { useSubmitGuard } from '../hooks/useSubmitGuard.ts'
import { confirmPasswordReset, fieldText, isApiError } from '../service/apiClient.ts'
import { AuthLayout } from './AuthLayout.tsx'

export function ResetPasswordScreen() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [token, setToken] = useState(params.get('token') ?? '')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const guard = useSubmitGuard()

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const key = guard.claim(`${token}\n${password}`)
    if (!key) return
    setBusy(true)
    setError(null)
    try {
      const response = await confirmPasswordReset(token, password, key)
      setMessage(response.detail)
      window.setTimeout(() => navigate('/login', { replace: true }), 600)
    } catch (caught) {
      setError(caught)
    } finally {
      guard.release()
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Choose a new password">
      <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-sub">Reset token</span>
          <input className="crm-input w-full px-3 py-1.5 text-xs" value={token} onChange={(event) => setToken(event.target.value)} />
          <FieldErrors messages={fieldText(error, 'token') ? [fieldText(error, 'token')] : []} />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-sub">New password</span>
          <input
            type="password"
            autoComplete="new-password"
            className="crm-input w-full px-3 py-1.5 text-xs"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <FieldErrors messages={fieldText(error, 'password') ? [fieldText(error, 'password')] : []} />
        </label>
        {message ? <p className="text-xs text-sub">{message}</p> : null}
        {isApiError(error) ? <p className="text-xs text-sub">{error.detail}</p> : null}
        <Button type="submit" className="w-full px-3 py-1.5 text-xs" disabled={busy}>
          {busy ? 'Updating' : 'Update password'}
        </Button>
      </form>
      <Link to="/login" className="text-xs font-medium" style={{ color: 'var(--brand-text)' }}>
        Back to sign in
      </Link>
    </AuthLayout>
  )
}

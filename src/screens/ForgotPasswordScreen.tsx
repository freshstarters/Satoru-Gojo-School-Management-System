import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Button } from '../components/Button.tsx'
import { FieldErrors } from '../components/EmptyState.tsx'
import { useSubmitGuard } from '../hooks/useSubmitGuard.ts'
import { fieldText, isApiError, requestPasswordReset } from '../service/apiClient.ts'
import { AuthLayout } from './AuthLayout.tsx'

export function ForgotPasswordScreen() {
  const [loginValue, setLoginValue] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const guard = useSubmitGuard()

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const key = guard.claim(loginValue)
    if (!key) return
    setBusy(true)
    setError(null)
    setMessage('')
    try {
      const response = await requestPasswordReset(loginValue, key)
      setMessage(response.detail)
    } catch (caught) {
      setError(caught)
    } finally {
      guard.release()
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Reset password">
      <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-sub">Email or +231 phone</span>
          <input className="crm-input w-full px-3 py-1.5 text-xs" value={loginValue} onChange={(event) => setLoginValue(event.target.value)} />
          <FieldErrors messages={fieldText(error, 'login') ? [fieldText(error, 'login')] : []} />
        </label>
        {message ? <p className="text-xs text-sub">{message}</p> : null}
        {isApiError(error) ? <p className="text-xs text-sub">{error.detail}</p> : null}
        <Button type="submit" className="w-full px-3 py-1.5 text-xs" disabled={busy}>
          {busy ? 'Sending' : 'Send reset'}
        </Button>
      </form>
      <Link to="/reset-password" className="text-xs font-medium" style={{ color: 'var(--brand-text)' }}>
        I already have a token
      </Link>
      <Link to="/login" className="block text-xs font-medium" style={{ color: 'var(--brand-text)' }}>
        Back to sign in
      </Link>
    </AuthLayout>
  )
}

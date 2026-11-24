import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { ErrorState } from '../components/EmptyState.tsx'
import { AuthLayout } from './AuthLayout.tsx'

export function PrivacyNotice() {
  const { config, configError, reloadConfig } = useAuth()
  if (configError) return <ErrorState onRetry={() => void reloadConfig()}>{configError}</ErrorState>
  if (!config) return <p className="text-xs text-sub">Loading the privacy notice.</p>
  const notice = config.privacy_notice
  return (
    <div className="space-y-3 text-xs text-body">
      {notice.warning ? <p className="text-sub">{notice.warning}</p> : null}
      <p>
        Hosting region: <span className="text-main">{notice.hosting_region || 'Not configured'}</span>
      </p>
      <p>
        Data controller: <span className="text-main">{notice.data_controller_name || 'Not configured'}</span>
      </p>
      <p>{notice.sms_consent}</p>
    </div>
  )
}

export function PrivacyScreen() {
  return (
    <AuthLayout title="Privacy notice">
      <PrivacyNotice />
      <Link to="/login" className="text-xs font-medium" style={{ color: 'var(--brand-text)' }}>
        Back to sign in
      </Link>
    </AuthLayout>
  )
}

import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Card } from '../components/Card.tsx'
import { sampleWorkspace } from '../fixtures/sampleWorkspace.ts'

export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md p-6">
        <p className="text-xs text-sub">{sampleWorkspace.schoolName}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-main">{title}</h1>
        <div className="mt-5 space-y-4">{children}</div>
      </Card>
    </div>
  )
}

export function AuthLinks() {
  return (
    <div className="flex items-center justify-between text-xs">
      <Link to="/forgot-password" className="font-medium" style={{ color: 'var(--brand-text)' }}>
        Forgot password
      </Link>
      <Link to="/privacy" className="font-medium" style={{ color: 'var(--brand-text)' }}>
        Privacy notice
      </Link>
    </div>
  )
}

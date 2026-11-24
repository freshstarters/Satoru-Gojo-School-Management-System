import type { ReactNode } from 'react'
import { Button } from './Button.tsx'

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="text-xs text-sub">{children}</p>
}

export function ErrorState({
  children,
  onRetry,
}: {
  children: ReactNode
  onRetry?: () => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-sub">{children}</p>
      {onRetry ? (
        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}

export function FieldErrors({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null
  return <p className="text-xs text-sub">{messages.join(' ')}</p>
}

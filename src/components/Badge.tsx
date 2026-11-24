import type { ReactNode } from 'react'

const tones = ['success', 'warn', 'danger', 'info', 'neutral', 'indigo', 'violet', 'teal', 'orange', 'pink'] as const

export type BadgeTone = (typeof tones)[number]

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

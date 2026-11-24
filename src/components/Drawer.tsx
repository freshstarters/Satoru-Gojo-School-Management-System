import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button.tsx'

export function Drawer({
  open,
  title,
  onClose,
  children,
  width = 'min(100%, 32rem)',
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  width?: string
}) {
  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="crm-drawer-backdrop fixed inset-0 z-[70] flex" onMouseDown={onClose}>
      <aside
        className="crm-drawer-panel h-full overflow-y-auto"
        style={{ width }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b crm-border px-4 py-3">
          <h2 className="text-sm font-semibold text-main">{title}</h2>
          <Button variant="secondary" className="p-1.5" aria-label="Close" onClick={onClose}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </svg>
          </Button>
        </div>
        <div className="p-4">{children}</div>
      </aside>
    </div>,
    document.body,
  )
}

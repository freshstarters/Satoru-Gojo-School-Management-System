import { createPortal } from 'react-dom'
import { useToasts } from '../hooks/useToasts.ts'

export function ToastRegion() {
  const toasts = useToasts()
  return createPortal(
    <div id="crmToastRegion" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="crm-toast" data-tone={toast.tone}>
          <span className="crm-toast-dot" />
          <span>{toast.message}</span>
        </div>
      ))}
    </div>,
    document.body,
  )
}

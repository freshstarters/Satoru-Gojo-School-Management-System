import type { ReactNode } from 'react'
import { Button } from './Button.tsx'
import { Modal } from './Modal.tsx'

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
  busy = false,
}: {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
  busy?: boolean
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button className="px-3 py-1.5 text-xs" onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-xs text-body">{message}</div>
    </Modal>
  )
}

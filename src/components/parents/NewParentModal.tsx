import { useState } from 'react'
import { Button } from '../Button.tsx'
import { Modal } from '../Modal.tsx'
import { pushToast } from '../../hooks/useToasts.ts'
import { fieldText, isApiError } from '../../service/apiClient.ts'
import { createParent } from '../../service/parents.ts'

export function NewParentModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [zone, setZone] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    setError('')
    try {
      await createParent({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        residential_zone: zone.trim(),
      })
      pushToast('Guardian added.', 'success')
      onCreated()
    } catch (err) {
      setError(
        fieldText(err, 'email') ||
          fieldText(err, 'phone') ||
          fieldText(err, 'full_name') ||
          (isApiError(err) ? err.detail : 'Could not add guardian.'),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title="Add Parent / Guardian" onClose={onClose}>
      <div className="space-y-3 text-xs">
        <div>
          <label className="mb-1 block font-medium text-body">Full Name</label>
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="crm-input w-full px-3 py-2"
            placeholder="e.g. Helena Flomo"
          />
        </div>
        <div>
          <label className="mb-1 block font-medium text-body">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="crm-input w-full px-3 py-2"
            placeholder="helena.flomo@gojo.test"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block font-medium text-body">Phone (LR)</label>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="crm-input w-full px-3 py-2"
              placeholder="+231 88 655 0121"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-body">Zone</label>
            <input
              value={zone}
              onChange={(event) => setZone(event.target.value)}
              className="crm-input w-full px-3 py-2"
              placeholder="Sinkor, Monrovia"
            />
          </div>
        </div>
        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        <div className="flex justify-end gap-2 border-t crm-border pt-3">
          <Button variant="secondary" className="px-4 py-1.5 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button className="px-4 py-1.5 text-xs" disabled={busy} onClick={submit}>
            Add Guardian
          </Button>
        </div>
      </div>
    </Modal>
  )
}

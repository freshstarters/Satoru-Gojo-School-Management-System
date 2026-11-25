import { useState } from 'react'
import { Button } from '../Button.tsx'
import { Modal } from '../Modal.tsx'
import { Select } from '../Select.tsx'
import { fieldText, isApiError } from '../../service/apiClient.ts'
import { createTeacher } from '../../service/teachers.ts'
import type { CampusRecord } from '../../service/settings.ts'
import { pushToast } from '../../hooks/useToasts.ts'

const ROLE_OPTIONS = [
  { value: 'teacher', label: 'Teacher' },
  { value: 'support_staff', label: 'Support Staff' },
  { value: 'registrar', label: 'Registrar' },
  { value: 'bursar', label: 'Bursar' },
  { value: 'principal', label: 'Principal' },
]

export function NewStaffModal({
  open,
  campuses,
  divisions,
  onClose,
  onCreated,
}: {
  open: boolean
  campuses: CampusRecord[]
  divisions: { id: string; name: string }[]
  onClose: () => void
  onCreated: () => void
}) {
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('teacher')
  const [jobTitle, setJobTitle] = useState('')
  const [divisionId, setDivisionId] = useState('')
  const [campusId, setCampusId] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    setError('')
    try {
      await createTeacher({
        full_name: fullName.trim(),
        role,
        job_title: jobTitle.trim(),
        division_id: divisionId || null,
        campus_id: campusId || null,
        phone: phone.trim(),
        email: email.trim(),
      })
      pushToast('Staff member added.', 'success')
      onCreated()
    } catch (err) {
      setError(
        fieldText(err, 'email') ||
          fieldText(err, 'phone') ||
          fieldText(err, 'full_name') ||
          (isApiError(err) ? err.detail : 'Could not add staff.'),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title="Add Faculty / Staff" onClose={onClose}>
      <div className="space-y-3 text-xs">
        <div>
          <label className="mb-1 block font-medium text-body">Full Name</label>
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="crm-input w-full px-3 py-2"
            placeholder="e.g. Aaron B. Cooper"
          />
        </div>
        <div>
          <label className="mb-1 block font-medium text-body">Portal Role</label>
          <Select value={role} ariaLabel="Portal role" onChange={setRole} options={ROLE_OPTIONS} />
        </div>
        <div>
          <label className="mb-1 block font-medium text-body">Job Title</label>
          <input
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
            className="crm-input w-full px-3 py-2"
            placeholder="Physics & Chemistry Teacher"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block font-medium text-body">Division</label>
            <Select
              value={divisionId}
              ariaLabel="Division"
              onChange={setDivisionId}
              options={[{ value: '', label: 'Unassigned' }, ...divisions.map((row) => ({ value: row.id, label: row.name }))]}
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-body">Campus</label>
            <Select
              value={campusId}
              ariaLabel="Campus"
              onChange={setCampusId}
              options={[{ value: '', label: 'School-wide' }, ...campuses.map((row) => ({ value: row.id, label: row.name }))]}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block font-medium text-body">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="crm-input w-full px-3 py-2"
            placeholder="aaron.cooper@gojo.test"
          />
        </div>
        <div>
          <label className="mb-1 block font-medium text-body">Phone (LR)</label>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="crm-input w-full px-3 py-2"
            placeholder="+231 77 555 0192"
          />
        </div>
        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        <div className="flex justify-end gap-2 border-t crm-border pt-3">
          <Button variant="secondary" className="px-4 py-1.5 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button className="px-4 py-1.5 text-xs" disabled={busy} onClick={submit}>
            Add Staff
          </Button>
        </div>
      </div>
    </Modal>
  )
}

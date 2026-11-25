import { useState } from 'react'
import { Badge } from '../Badge.tsx'
import { Button } from '../Button.tsx'
import { Drawer } from '../Drawer.tsx'
import { Select } from '../Select.tsx'
import { Subtabs } from '../Subtabs.tsx'
import { pushToast } from '../../hooks/useToasts.ts'
import { fieldText, isApiError } from '../../service/apiClient.ts'
import {
  deactivateTeacher,
  reactivateTeacher,
  saveTeacher,
  sendTeacherInvite,
  type StaffRecord,
} from '../../service/teachers.ts'
import type { CampusRecord } from '../../service/settings.ts'

const ROLE_OPTIONS = [
  { value: 'teacher', label: 'Teacher' },
  { value: 'support_staff', label: 'Support Staff' },
  { value: 'registrar', label: 'Registrar' },
  { value: 'bursar', label: 'Bursar' },
  { value: 'principal', label: 'Principal' },
]

function portalTone(status: string) {
  if (status === 'active') return 'success' as const
  if (status === 'invited') return 'info' as const
  if (status === 'inactive') return 'neutral' as const
  return 'warn' as const
}

function portalLabel(status: string) {
  if (status === 'not_invited') return 'Not Invited'
  if (status === 'invited') return 'Invited'
  if (status === 'inactive') return 'Inactive'
  return 'Active'
}

export function TeacherInspectorDrawer({
  open,
  staff,
  tab,
  onTab,
  canEdit,
  campuses,
  divisions,
  onClose,
  onSaved,
}: {
  open: boolean
  staff: StaffRecord
  tab: string
  onTab: (id: string) => void
  canEdit: boolean
  campuses: CampusRecord[]
  divisions: { id: string; name: string }[]
  onClose: () => void
  onSaved: () => void
}) {
  const [fullName, setFullName] = useState(staff.full_name)
  const [role, setRole] = useState(staff.role)
  const [jobTitle, setJobTitle] = useState(staff.job_title)
  const [divisionId, setDivisionId] = useState(staff.division ?? '')
  const [campusId, setCampusId] = useState(staff.campus_id ?? '')
  const [qualifications, setQualifications] = useState(staff.qualifications)
  const [phone, setPhone] = useState(staff.phone)
  const [email, setEmail] = useState(staff.email)
  const [portalStatus, setPortalStatus] = useState(staff.portal_status)
  const [employmentStatus, setEmploymentStatus] = useState(staff.employment_status)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!canEdit) return
    setBusy(true)
    setError('')
    try {
      const row = await saveTeacher(staff.id, {
        full_name: fullName.trim(),
        role,
        job_title: jobTitle.trim(),
        division_id: divisionId || null,
        campus_id: campusId || null,
        qualifications: qualifications.trim(),
        phone: phone.trim(),
        email: email.trim(),
      })
      setPortalStatus(row.portal_status)
      setEmploymentStatus(row.employment_status)
      pushToast('Saved staff member.', 'success')
      onSaved()
    } catch (err) {
      setError(
        fieldText(err, 'email') ||
          fieldText(err, 'phone') ||
          (isApiError(err) ? err.detail : 'Could not save staff.'),
      )
    } finally {
      setBusy(false)
    }
  }

  async function invite() {
    if (!canEdit) return
    setBusy(true)
    setError('')
    try {
      const row = await sendTeacherInvite(staff.id)
      setPortalStatus(row.portal_status)
      pushToast('Portal invite sent.', 'success')
      onSaved()
    } catch (err) {
      setError(isApiError(err) ? err.detail : 'Could not send invite.')
    } finally {
      setBusy(false)
    }
  }

  async function deactivate() {
    if (!canEdit) return
    setBusy(true)
    setError('')
    try {
      const row = await deactivateTeacher(staff.id)
      setPortalStatus(row.portal_status)
      setEmploymentStatus(row.employment_status)
      pushToast('Staff deactivated.', 'success')
      onSaved()
    } catch (err) {
      setError(isApiError(err) ? err.detail : 'Could not deactivate staff.')
    } finally {
      setBusy(false)
    }
  }

  async function reactivate() {
    if (!canEdit) return
    setBusy(true)
    setError('')
    try {
      const row = await reactivateTeacher(staff.id)
      setPortalStatus(row.portal_status)
      setEmploymentStatus(row.employment_status)
      pushToast('Staff reactivated.', 'success')
      onSaved()
    } catch (err) {
      setError(isApiError(err) ? err.detail : 'Could not reactivate staff.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer open={open} title={staff.full_name} onClose={onClose}>
      <div className="space-y-4 p-4 text-xs">
        <div className="flex items-start justify-between gap-3 border-b crm-border pb-3">
          <div>
            <div className="text-xs text-sub">{staff.staff_code}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge tone={portalTone(portalStatus)}>{portalLabel(portalStatus)}</Badge>
              {employmentStatus === 'inactive' ? <Badge tone="neutral">Employment Inactive</Badge> : null}
            </div>
          </div>
        </div>

        <Subtabs
          tabs={[
            { id: 'profile', label: 'Profile' },
            { id: 'assignments', label: 'Assignments' },
            { id: 'account', label: 'Account' },
          ]}
          value={tab}
          onChange={onTab}
        />

        {tab === 'profile' ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block font-medium text-body">Full Name</label>
              <input
                value={fullName}
                disabled={!canEdit}
                onChange={(event) => setFullName(event.target.value)}
                className="crm-input w-full px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-body">Portal Role</label>
              <Select
                value={role}
                ariaLabel="Portal role"
                disabled={!canEdit}
                onChange={setRole}
                options={ROLE_OPTIONS}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-body">Job Title</label>
              <input
                value={jobTitle}
                disabled={!canEdit}
                onChange={(event) => setJobTitle(event.target.value)}
                className="crm-input w-full px-3 py-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-medium text-body">Division</label>
                <Select
                  value={divisionId}
                  ariaLabel="Division"
                  disabled={!canEdit}
                  onChange={setDivisionId}
                  options={[{ value: '', label: 'Unassigned' }, ...divisions.map((row) => ({ value: row.id, label: row.name }))]}
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-body">Campus</label>
                <Select
                  value={campusId}
                  ariaLabel="Campus"
                  disabled={!canEdit}
                  onChange={setCampusId}
                  options={[{ value: '', label: 'School-wide' }, ...campuses.map((row) => ({ value: row.id, label: row.name }))]}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block font-medium text-body">Qualifications</label>
              <textarea
                value={qualifications}
                disabled={!canEdit}
                onChange={(event) => setQualifications(event.target.value)}
                rows={3}
                className="crm-input w-full p-2.5 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-body">Phone</label>
              <input
                value={phone}
                disabled={!canEdit}
                onChange={(event) => setPhone(event.target.value)}
                className="crm-input w-full px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-body">Email</label>
              <input
                value={email}
                disabled={!canEdit}
                onChange={(event) => setEmail(event.target.value)}
                className="crm-input w-full px-3 py-2"
              />
            </div>
            {canEdit ? (
              <Button className="px-3 py-1.5 text-xs" disabled={busy} onClick={save}>
                Save Staff
              </Button>
            ) : null}
          </div>
        ) : null}

        {tab === 'assignments' ? (
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase text-sub">Homerooms</div>
              {staff.homerooms.length === 0 ? (
                <p className="text-xs text-sub">No homeroom assignments.</p>
              ) : (
                <ul className="space-y-2">
                  {staff.homerooms.map((row) => (
                    <li key={row.id} className="rounded-lg border crm-border px-3 py-2">
                      <div className="font-medium text-main">{row.name}</div>
                      <div className="text-[11px] text-sub">{row.campus_name}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase text-sub">Subjects</div>
              {staff.subjects.length === 0 ? (
                <p className="text-xs text-sub">No subject assignments.</p>
              ) : (
                <ul className="space-y-2">
                  {staff.subjects.map((row) => (
                    <li key={row.id} className="rounded-lg border crm-border px-3 py-2">
                      <div className="font-medium text-main">{row.subject}</div>
                      <div className="text-[11px] text-sub">
                        {row.classroom} · {row.campus_name}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-xs text-sub">Assignments are managed in Classes &amp; Timetable.</p>
          </div>
        ) : null}

        {tab === 'account' ? (
          <div className="space-y-3">
            <div className="rounded-lg border crm-border p-3">
              <div className="text-[11px] uppercase text-sub">Portal Status</div>
              <div className="mt-1">
                <Badge tone={portalTone(portalStatus)}>{portalLabel(portalStatus)}</Badge>
              </div>
            </div>
            {canEdit ? (
              <div className="flex flex-wrap gap-2">
                <Button className="px-3 py-1.5 text-xs" disabled={busy || employmentStatus === 'inactive'} onClick={invite}>
                  Send Portal Invite
                </Button>
                {employmentStatus === 'inactive' ? (
                  <Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={busy} onClick={reactivate}>
                    Reactivate
                  </Button>
                ) : (
                  <Button variant="secondary" className="px-3 py-1.5 text-xs text-rose-600" disabled={busy} onClick={deactivate}>
                    Deactivate
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      </div>
    </Drawer>
  )
}

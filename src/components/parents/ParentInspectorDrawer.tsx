import { useMemo, useState } from 'react'
import { Badge } from '../Badge.tsx'
import { Button } from '../Button.tsx'
import { Drawer } from '../Drawer.tsx'
import { Select } from '../Select.tsx'
import { Subtabs } from '../Subtabs.tsx'
import { pushToast } from '../../hooks/useToasts.ts'
import { fieldText, isApiError } from '../../service/apiClient.ts'
import {
  deactivateParent,
  linkChild,
  reactivateParent,
  saveParent,
  sendParentInvite,
  unlinkChild,
  type GuardianRecord,
} from '../../service/parents.ts'
import type { StudentRecord } from '../../service/students.ts'

const RELATIONSHIP_OPTIONS = [
  { value: 'mother', label: 'Mother' },
  { value: 'father', label: 'Father' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'uncle', label: 'Uncle' },
  { value: 'aunt', label: 'Aunt' },
  { value: 'other', label: 'Other' },
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

function dash(value: string | number | null | undefined) {
  if (value == null || value === '') return '—'
  return String(value)
}

export function ParentInspectorDrawer({
  open,
  guardian,
  tab,
  onTab,
  canEdit,
  canSeeBalance,
  students,
  onClose,
  onSaved,
}: {
  open: boolean
  guardian: GuardianRecord
  tab: string
  onTab: (id: string) => void
  canEdit: boolean
  canSeeBalance: boolean
  students: StudentRecord[]
  onClose: () => void
  onSaved: () => void
}) {
  const [fullName, setFullName] = useState(guardian.full_name)
  const [phone, setPhone] = useState(guardian.phone)
  const [whatsapp, setWhatsapp] = useState(guardian.whatsapp_phone)
  const [email, setEmail] = useState(guardian.email)
  const [zone, setZone] = useState(guardian.residential_zone)
  const [occupation, setOccupation] = useState(guardian.occupation)
  const [smsConsent, setSmsConsent] = useState(guardian.sms_consent ? 'on' : 'off')
  const [portalStatus, setPortalStatus] = useState(guardian.portal_status)
  const [status, setStatus] = useState(guardian.status)
  const [children, setChildren] = useState(guardian.children)
  const [studentId, setStudentId] = useState('')
  const [relationship, setRelationship] = useState('mother')
  const [relationshipNote, setRelationshipNote] = useState('')
  const [financial, setFinancial] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const linkedIds = useMemo(() => new Set(children.map((row) => row.student_id)), [children])
  const studentOptions = useMemo(
    () => [
      { value: '', label: 'Select student' },
      ...students
        .filter((row) => !linkedIds.has(row.id))
        .map((row) => ({
          value: row.id,
          label: `${row.full_name} (${row.student_code})`,
        })),
    ],
    [students, linkedIds],
  )

  async function save() {
    if (!canEdit) return
    setBusy(true)
    setError('')
    try {
      const row = await saveParent(guardian.id, {
        full_name: fullName.trim(),
        phone: phone.trim(),
        whatsapp_phone: whatsapp.trim(),
        email: email.trim(),
        residential_zone: zone.trim(),
        occupation: occupation.trim(),
        sms_consent: smsConsent === 'on',
      })
      setPortalStatus(row.portal_status)
      setStatus(row.status)
      setChildren(row.children)
      pushToast('Guardian saved.', 'success')
      onSaved()
    } catch (err) {
      setError(
        fieldText(err, 'email') ||
          fieldText(err, 'phone') ||
          (isApiError(err) ? err.detail : 'Could not save guardian.'),
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
      const row = await sendParentInvite(guardian.id)
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
      const row = await deactivateParent(guardian.id)
      setPortalStatus(row.portal_status)
      setStatus(row.status)
      setChildren(row.children)
      pushToast('Guardian deactivated.', 'success')
      onSaved()
    } catch (err) {
      setError(isApiError(err) ? err.detail : 'Could not deactivate guardian.')
    } finally {
      setBusy(false)
    }
  }

  async function reactivate() {
    if (!canEdit) return
    setBusy(true)
    setError('')
    try {
      const row = await reactivateParent(guardian.id)
      setPortalStatus(row.portal_status)
      setStatus(row.status)
      pushToast('Guardian reactivated.', 'success')
      onSaved()
    } catch (err) {
      setError(isApiError(err) ? err.detail : 'Could not reactivate guardian.')
    } finally {
      setBusy(false)
    }
  }

  async function addChild() {
    if (!canEdit || !studentId) return
    setBusy(true)
    setError('')
    try {
      const link = await linkChild(guardian.id, {
        student_id: studentId,
        relationship,
        relationship_note: relationship === 'other' ? relationshipNote.trim() : '',
        is_financial_responsible: financial,
      })
      setChildren((rows) => [...rows, link])
      setStudentId('')
      setRelationshipNote('')
      setFinancial(false)
      pushToast('Child linked.', 'success')
      onSaved()
    } catch (err) {
      setError(isApiError(err) ? err.detail : 'Could not link child.')
    } finally {
      setBusy(false)
    }
  }

  async function removeChild(linkId: string) {
    if (!canEdit) return
    setBusy(true)
    setError('')
    try {
      await unlinkChild(guardian.id, linkId)
      setChildren((rows) => rows.filter((row) => row.id !== linkId))
      pushToast('Child unlinked.', 'success')
      onSaved()
    } catch (err) {
      setError(isApiError(err) ? err.detail : 'Could not unlink child.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer open={open} title={guardian.full_name} onClose={onClose}>
      <div className="space-y-4 p-4 text-xs">
        <div className="border-b crm-border pb-3">
          <div className="text-xs text-sub">{guardian.email}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge tone={portalTone(portalStatus)}>{portalLabel(portalStatus)}</Badge>
            {status === 'inactive' ? <Badge tone="neutral">Inactive</Badge> : null}
            <Badge tone={guardian.sms_consent ? 'success' : 'warn'}>
              SMS {guardian.sms_consent ? 'Opted In' : 'Opted Out'}
            </Badge>
          </div>
        </div>

        <Subtabs
          tabs={[
            { id: 'profile', label: 'Profile' },
            { id: 'children', label: 'Children' },
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
              <label className="mb-1 block font-medium text-body">Phone (LR)</label>
              <input
                value={phone}
                disabled={!canEdit}
                onChange={(event) => setPhone(event.target.value)}
                className="crm-input w-full px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-body">WhatsApp</label>
              <input
                value={whatsapp}
                disabled={!canEdit}
                onChange={(event) => setWhatsapp(event.target.value)}
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
            <div>
              <label className="mb-1 block font-medium text-body">Residential Zone</label>
              <input
                value={zone}
                disabled={!canEdit}
                onChange={(event) => setZone(event.target.value)}
                className="crm-input w-full px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-body">Occupation</label>
              <input
                value={occupation}
                disabled={!canEdit}
                onChange={(event) => setOccupation(event.target.value)}
                className="crm-input w-full px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-body">SMS Alerts</label>
              <Select
                value={smsConsent}
                ariaLabel="SMS consent"
                disabled={!canEdit}
                onChange={setSmsConsent}
                options={[
                  { value: 'on', label: 'Opted In' },
                  { value: 'off', label: 'Opted Out' },
                ]}
              />
            </div>
            {canEdit ? (
              <Button className="px-3 py-1.5 text-xs" disabled={busy} onClick={save}>
                Save Guardian
              </Button>
            ) : null}
          </div>
        ) : null}

        {tab === 'children' ? (
          <div className="space-y-4">
            {canSeeBalance ? (
              <div className="rounded-lg border crm-border p-3">
                <div className="text-[11px] uppercase text-sub">Family Balance</div>
                <div className="num-tabular mt-1 text-sm font-semibold text-main">
                  {guardian.family_balance_lrd == null
                    ? '—'
                    : `LRD ${guardian.family_balance_lrd.toLocaleString('en-US')}`}
                </div>
              </div>
            ) : null}
            {children.length === 0 ? (
              <p className="text-xs text-sub">No linked children.</p>
            ) : (
              <ul className="space-y-2">
                {children.map((row) => (
                  <li key={row.id} className="rounded-lg border crm-border px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-main">{row.student_name}</div>
                        <div className="text-[11px] text-sub">
                          {row.student_code} · {dash(row.classroom_name || row.grade)} ·{' '}
                          {row.relationship_label}
                          {row.relationship_note ? ` (${row.relationship_note})` : ''}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {row.is_primary ? <Badge tone="info">Primary</Badge> : null}
                          {row.is_financial_responsible ? (
                            <Badge tone="teal">Financial</Badge>
                          ) : null}
                        </div>
                      </div>
                      {canEdit ? (
                        <Button
                          variant="secondary"
                          className="px-2 py-1 text-[11px]"
                          disabled={busy}
                          onClick={() => removeChild(row.id)}
                        >
                          Unlink
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {canEdit ? (
              <div className="space-y-2 border-t crm-border pt-3">
                <div className="text-[11px] font-semibold uppercase text-sub">Link Child</div>
                <Select
                  value={studentId}
                  ariaLabel="Student"
                  onChange={setStudentId}
                  options={studentOptions}
                />
                <Select
                  value={relationship}
                  ariaLabel="Relationship"
                  onChange={setRelationship}
                  options={RELATIONSHIP_OPTIONS}
                />
                {relationship === 'other' ? (
                  <input
                    value={relationshipNote}
                    onChange={(event) => setRelationshipNote(event.target.value)}
                    className="crm-input w-full px-3 py-2"
                    placeholder="Relationship note"
                  />
                ) : null}
                <label className="flex items-center gap-2 text-body">
                  <input
                    type="checkbox"
                    checked={financial}
                    onChange={(event) => setFinancial(event.target.checked)}
                  />
                  Financially responsible
                </label>
                <Button className="px-3 py-1.5 text-xs" disabled={busy || !studentId} onClick={addChild}>
                  Link Child
                </Button>
              </div>
            ) : null}
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
                <Button className="px-3 py-1.5 text-xs" disabled={busy || status === 'inactive'} onClick={invite}>
                  Send Portal Invite
                </Button>
                {status === 'inactive' ? (
                  <Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={busy} onClick={reactivate}>
                    Reactivate
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    className="px-3 py-1.5 text-xs text-rose-600"
                    disabled={busy}
                    onClick={deactivate}
                  >
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

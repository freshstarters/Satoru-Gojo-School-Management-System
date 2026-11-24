import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { Badge } from '../components/Badge.tsx'
import { Button } from '../components/Button.tsx'
import { Card } from '../components/Card.tsx'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { DataTable } from '../components/DataTable.tsx'
import { DatePicker } from '../components/DatePicker.tsx'
import { DateTimePicker } from '../components/DateTimePicker.tsx'
import { EmptyState, ErrorState, FieldErrors } from '../components/EmptyState.tsx'
import { Modal } from '../components/Modal.tsx'
import { Select } from '../components/Select.tsx'
import { Subtabs } from '../components/Subtabs.tsx'
import { pushToast } from '../hooks/useToasts.ts'
import { setUsdReference, usePreferences } from '../hooks/usePreferences.ts'
import { useSchoolProfile } from '../school/school-profile.ts'
import { fieldText, isApiError } from '../service/apiClient.ts'
import {
  createAcademicYear,
  createCampus,
  deleteAcademicYear,
  deleteCampus,
  fetchAcademicYears,
  fetchCampuses,
  fetchGradeLevels,
  fetchIntegrationStatus,
  fetchSettings,
  saveAcademicYear,
  saveCampus,
  saveSettings,
  type AcademicYear,
  type CampusRecord,
  type GradeLevel,
  type IntegrationStatus,
  type MarkingPeriod,
  type SchoolSettings,
} from '../service/settings.ts'
import { formatLrd, formatUsdEquivalent } from '../utils/money.ts'
import { PrivacyNotice } from './PrivacyScreen.tsx'

const TABS = [
  { id: 'school', label: 'School & Campuses' },
  { id: 'calendar', label: 'Academic Calendar' },
  { id: 'grading', label: 'Grading Weights' },
  { id: 'currency', label: 'Currency & FX' },
  { id: 'health', label: 'Integration Health' },
  { id: 'kit', label: 'UI Kit' },
]

const ACTIVE_CODES = new Set(['P1', 'P2', 'P3', 'P4', 'P5', 'P6'])

export function SettingsScreen() {
  const { user } = useAuth()
  const profile = useSchoolProfile()
  const role = user?.role ?? ''
  const principal = role === 'principal'
  const rules = role === 'principal' || role === 'bursar'
  const [tab, setTab] = useState('school')
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [settings, setSettings] = useState<SchoolSettings | null>(null)
  const [campuses, setCampuses] = useState<CampusRecord[]>([])
  const [years, setYears] = useState<AcademicYear[]>([])
  const [grades, setGrades] = useState<GradeLevel[]>([])
  const [health, setHealth] = useState<IntegrationStatus | null>(null)

  function load() {
    setFailed(false)
    void Promise.all([fetchSettings(), fetchCampuses(), fetchAcademicYears(), fetchGradeLevels(), fetchIntegrationStatus()])
      .then(([nextSettings, nextCampuses, nextYears, nextGrades, nextHealth]) => {
        setSettings(nextSettings)
        setCampuses(nextCampuses)
        setYears(nextYears)
        setGrades(nextGrades)
        setHealth(nextHealth)
        profile.setSchoolName(nextSettings.school_name)
        const rate = Number(nextSettings.lrd_per_usd)
        if (Number.isFinite(rate) && rate > 0) profile.setRate(rate)
        setReady(true)
      })
      .catch(() => {
        setFailed(true)
        setReady(true)
      })
  }

  useEffect(() => {
    load()
    // The screen loads once for the signed-in role.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-5">
      <Card className="space-y-2 p-4">
        <h2 className="text-sm font-semibold text-main">Privacy notice</h2>
        <PrivacyNotice />
        <Link to="/privacy" className="text-xs font-medium" style={{ color: 'var(--brand-text)' }}>
          Open privacy notice
        </Link>
      </Card>
      <Subtabs tabs={TABS} value={tab} onChange={setTab} />
      {failed ? <ErrorState onRetry={load}>Settings could not be loaded.</ErrorState> : null}
      {!failed && !ready ? <EmptyState>Loading school settings.</EmptyState> : null}
      {!failed && ready && settings ? (
        <>
          {tab === 'school' ? (
            <SchoolSection
              settings={settings}
              campuses={campuses}
              grades={grades}
              canEdit={principal}
              onSettings={setSettings}
              onCampuses={setCampuses}
            />
          ) : null}
          {tab === 'calendar' ? (
            <CalendarSection settings={settings} years={years} canEdit={principal} onSettings={setSettings} onYears={setYears} />
          ) : null}
          {tab === 'grading' ? <GradingSection settings={settings} canEdit={rules} onSettings={setSettings} /> : null}
          {tab === 'currency' ? <CurrencySection settings={settings} canEdit={rules} onSettings={setSettings} /> : null}
          {tab === 'health' && health ? <HealthSection health={health} /> : null}
          {tab === 'kit' ? <UiKit /> : null}
        </>
      ) : null}
    </div>
  )
}

function SchoolSection({
  settings,
  campuses,
  grades,
  canEdit,
  onSettings,
  onCampuses,
}: {
  settings: SchoolSettings
  campuses: CampusRecord[]
  grades: GradeLevel[]
  canEdit: boolean
  onSettings: (settings: SchoolSettings) => void
  onCampuses: (campuses: CampusRecord[]) => void
}) {
  const profile = useSchoolProfile()
  const [name, setName] = useState(settings.school_name)
  const [code, setCode] = useState(settings.moe_registration_code)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<CampusRecord | null>(null)
  const [creating, setCreating] = useState(false)
  const [blocked, setBlocked] = useState<CampusRecord | null>(null)
  const [removing, setRemoving] = useState<CampusRecord | null>(null)

  async function saveProfile() {
    setBusy(true)
    setError('')
    try {
      const saved = await saveSettings({ school_name: name.trim(), moe_registration_code: code.trim() })
      onSettings(saved)
      profile.setSchoolName(saved.school_name)
      pushToast('Saved the school profile.', 'success')
    } catch (caught) {
      setError(isApiError(caught) ? caught.detail : 'The school profile could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-4 p-4">
        <div>
          <h2 className="text-sm font-semibold text-main">School profile</h2>
          <p className="mt-0.5 text-xs text-sub">Gojo Institute name and Ministry of Education registration code.</p>
        </div>
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-body">School name</span>
          <input className="crm-input w-full px-3 py-2" value={name} disabled={!canEdit} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-body">MoE registration code</span>
          <input className="crm-input w-full px-3 py-2" value={code} disabled={!canEdit} onChange={(event) => setCode(event.target.value)} />
        </label>
        {error ? <p className="text-xs text-sub">{error}</p> : null}
        {canEdit ? (
          <Button className="px-3 py-1.5 text-xs" disabled={busy} onClick={() => void saveProfile()}>
            Save profile
          </Button>
        ) : null}
      </Card>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <h2 className="text-sm font-semibold text-main">Campuses</h2>
          {canEdit ? (
            <Button className="px-3 py-1.5 text-xs" onClick={() => setCreating(true)}>
              Add campus
            </Button>
          ) : null}
        </div>
        {campuses.length === 0 ? (
          <div className="p-4">
            <EmptyState>No campuses yet.</EmptyState>
          </div>
        ) : (
          <DataTable
            empty="No campuses yet."
            rows={campuses}
            columns={[
              { key: 'name', header: 'Campus', render: (row) => row.name },
              { key: 'zone', header: 'Catchment', render: (row) => row.catchment_zone || '—' },
              { key: 'lead', header: 'Lead', render: (row) => row.lead_staff || '—' },
              {
                key: 'students',
                header: 'Students',
                numeric: true,
                render: (row) => row.student_count.toLocaleString('en-US'),
              },
              {
                key: 'teachers',
                header: 'Teachers',
                numeric: true,
                render: (row) => row.teacher_count.toLocaleString('en-US'),
              },
              {
                key: 'action',
                header: '',
                render: (row) =>
                  canEdit ? (
                    <span className="flex justify-end gap-2">
                      <Button variant="secondary" className="px-2.5 py-1 text-[11px]" onClick={() => setEditing(row)}>
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        className="px-2.5 py-1 text-[11px]"
                        onClick={() => (row.student_count + row.teacher_count > 0 ? setBlocked(row) : setRemoving(row))}
                      >
                        Delete
                      </Button>
                    </span>
                  ) : (
                    row.address
                  ),
              },
            ]}
          />
        )}
      </Card>
      <CampusDialog
        key={editing?.id ?? 'new-campus'}
        open={creating || editing != null}
        campus={editing}
        grades={grades}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
        onSaved={(saved) => {
          onCampuses(editing ? campuses.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...campuses])
          setCreating(false)
          setEditing(null)
        }}
      />
      <Modal
        open={blocked != null}
        title="Campus cannot be deleted"
        onClose={() => setBlocked(null)}
        footer={
          <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setBlocked(null)}>
            Close
          </Button>
        }
      >
        <p className="text-xs text-body">
          {blocked?.name} cannot be deleted until the people assigned to it are moved.
        </p>
      </Modal>
      <ConfirmDialog
        open={removing != null}
        destructive
        title="Delete campus"
        message={`Delete ${removing?.name ?? 'this campus'}? This cannot be undone.`}
        confirmLabel="Delete campus"
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (!removing) return
          const target = removing
          void deleteCampus(target.id)
            .then(() => {
              onCampuses(campuses.filter((item) => item.id !== target.id))
              setRemoving(null)
              pushToast('Deleted the campus.', 'success')
            })
            .catch((caught) => {
              pushToast(isApiError(caught) ? caught.detail : 'The campus could not be deleted.', 'danger')
            })
        }}
      />
    </div>
  )
}

function CampusDialog({
  open,
  campus,
  grades,
  onClose,
  onSaved,
}: {
  open: boolean
  campus: CampusRecord | null
  grades: GradeLevel[]
  onClose: () => void
  onSaved: (campus: CampusRecord) => void
}) {
  const [name, setName] = useState(campus?.name ?? '')
  const [address, setAddress] = useState(campus?.address ?? '')
  const [zone, setZone] = useState(campus?.catchment_zone ?? '')
  const [lead, setLead] = useState(campus?.lead_staff ?? '')
  const [selected, setSelected] = useState<string[]>(campus?.grades_served.map((grade) => grade.id) ?? [])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    setError('')
    const body = {
      name: name.trim(),
      address: address.trim(),
      catchment_zone: zone.trim(),
      lead_staff: lead.trim(),
      grade_level_ids: selected,
    }
    try {
      const saved = campus ? await saveCampus(campus.id, body) : await createCampus(body)
      onSaved(saved)
      pushToast(campus ? 'Saved the campus.' : 'Added the campus.', 'success')
    } catch (caught) {
      setError(fieldText(caught, 'name') || (isApiError(caught) ? caught.detail : 'The campus could not be saved.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title={campus ? 'Edit campus' : 'Add campus'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button className="px-3 py-1.5 text-xs" disabled={busy} onClick={() => void save()}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-xs">
        <label className="block">
          <span className="mb-1 block font-medium text-body">Name</span>
          <input className="crm-input w-full px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block font-medium text-body">Address</span>
          <input className="crm-input w-full px-3 py-2" value={address} onChange={(event) => setAddress(event.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block font-medium text-body">Catchment zone</span>
          <input className="crm-input w-full px-3 py-2" value={zone} onChange={(event) => setZone(event.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block font-medium text-body">Campus lead</span>
          <input className="crm-input w-full px-3 py-2" value={lead} onChange={(event) => setLead(event.target.value)} />
        </label>
        <div>
          <span className="mb-1 block font-medium text-body">Grades served</span>
          <div className="grid grid-cols-2 gap-2">
            {grades.map((grade) => (
              <label key={grade.id} className="crm-checkbox text-xs text-main">
                <input
                  type="checkbox"
                  className="crm-checkbox-input"
                  checked={selected.includes(grade.id)}
                  onChange={() =>
                    setSelected((current) =>
                      current.includes(grade.id) ? current.filter((id) => id !== grade.id) : [...current, grade.id],
                    )
                  }
                />
                <span aria-hidden="true" className="crm-checkbox-box" />
                <span className="crm-checkbox-label">{grade.name}</span>
              </label>
            ))}
          </div>
        </div>
        {error ? <p className="text-xs text-sub">{error}</p> : null}
      </div>
    </Modal>
  )
}

function CalendarSection({
  settings,
  years,
  canEdit,
  onSettings,
  onYears,
}: {
  settings: SchoolSettings
  years: AcademicYear[]
  canEdit: boolean
  onSettings: (settings: SchoolSettings) => void
  onYears: (years: AcademicYear[]) => void
}) {
  const current = years.find((year) => year.id === settings.academic_year_id) ?? years.find((year) => year.is_current) ?? null
  const [yearId, setYearId] = useState(current?.id ?? '')
  const [periodId, setPeriodId] = useState(settings.active_marking_period_id ?? '')
  const [periods, setPeriods] = useState<MarkingPeriod[]>(current?.marking_periods ?? [])
  const [label, setLabel] = useState('')
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const selected = years.find((year) => year.id === yearId) ?? null
  const activeOptions = periods
    .filter((period) => ACTIVE_CODES.has(period.code))
    .map((period) => ({ value: period.id, label: period.label }))

  function chooseYear(id: string) {
    setYearId(id)
    const next = years.find((year) => year.id === id)
    const nextPeriods = next?.marking_periods ?? []
    setPeriods(nextPeriods)
    setPeriodId(nextPeriods.find((period) => ACTIVE_CODES.has(period.code))?.id ?? '')
  }

  function editPeriod(id: string, patch: Partial<MarkingPeriod>) {
    setPeriods((currentPeriods) => currentPeriods.map((period) => (period.id === id ? { ...period, ...patch } : period)))
  }

  async function save() {
    if (!selected) return
    setBusy(true)
    setError('')
    try {
      const savedYear = await saveAcademicYear(selected.id, {
        is_current: true,
        marking_periods: periods.map((period) => ({
          code: period.code,
          start_date: period.start_date,
          end_date: period.end_date,
          is_locked: period.is_locked,
        })),
      })
      const savedSettings = await saveSettings({
        academic_year_id: savedYear.id,
        active_marking_period_id: periodId || null,
      })
      onYears(years.map((year) => (year.id === savedYear.id ? savedYear : { ...year, is_current: false })))
      onSettings(savedSettings)
      pushToast('Saved the academic calendar.', 'success')
    } catch (caught) {
      setError(fieldText(caught, 'active_marking_period_id') || fieldText(caught, 'end_date') || (isApiError(caught) ? caught.detail : 'The calendar could not be saved.'))
    } finally {
      setBusy(false)
    }
  }

  async function addYear() {
    const next = label.trim()
    if (!next) return
    try {
      const created = await createAcademicYear(next)
      onYears([created, ...years])
      setYearId(created.id)
      setPeriods(created.marking_periods)
      setPeriodId(created.marking_periods.find((period) => ACTIVE_CODES.has(period.code))?.id ?? '')
      setLabel('')
      setAdding(false)
      pushToast('Added the academic year.', 'success')
    } catch (caught) {
      setError(isApiError(caught) ? caught.detail : 'The academic year could not be added.')
    }
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-main">Academic calendar</h2>
          <p className="mt-0.5 text-xs text-sub">Six marking periods. The 3rd period exam is semester 1. The 6th period exam is the final.</p>
        </div>
        {canEdit ? (
          <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setAdding(true)}>
            Add year
          </Button>
        ) : null}
      </div>
      {years.length === 0 ? <EmptyState>No academic years yet.</EmptyState> : null}
      <Select
        ariaLabel="Academic year"
        value={yearId}
        disabled={!canEdit}
        onChange={chooseYear}
        options={years.map((year) => ({ value: year.id, label: year.label }))}
      />
      <Select
        ariaLabel="Active marking period"
        value={periodId}
        disabled={!canEdit}
        onChange={setPeriodId}
        options={activeOptions}
      />
      <div className="space-y-3">
        {periods.map((period) => (
          <div key={period.id} className="grid grid-cols-1 gap-2 border-t pt-3 sm:grid-cols-[8rem_1fr_1fr_auto]" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="text-xs font-medium text-main">{period.label}</div>
            <DatePicker ariaLabel={`${period.label} start`} value={period.start_date ?? ''} disabled={!canEdit} onChange={(value) => editPeriod(period.id, { start_date: value || null })} />
            <DatePicker ariaLabel={`${period.label} end`} value={period.end_date ?? ''} disabled={!canEdit} onChange={(value) => editPeriod(period.id, { end_date: value || null })} />
            <label className={`crm-switch text-xs text-main ${canEdit ? '' : 'is-disabled'}`}>
              <input
                type="checkbox"
                className="crm-switch-input"
                checked={period.is_locked}
                disabled={!canEdit}
                onChange={(event) => editPeriod(period.id, { is_locked: event.target.checked })}
              />
              <span aria-hidden="true" className="crm-switch-track">
                <span className="crm-switch-thumb" />
              </span>
              <span>Locked</span>
            </label>
          </div>
        ))}
      </div>
      {error ? <p className="text-xs text-sub">{error}</p> : null}
      {canEdit && selected ? (
        <div className="flex gap-2">
          <Button className="px-3 py-1.5 text-xs" disabled={busy} onClick={() => void save()}>
            Save calendar
          </Button>
          {!selected.is_current ? (
            <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => setRemoving(true)}>
              Delete year
            </Button>
          ) : null}
        </div>
      ) : null}
      <Modal
        open={adding}
        title="Add academic year"
        onClose={() => setAdding(false)}
        footer={
          <>
            <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button className="px-3 py-1.5 text-xs" onClick={() => void addYear()}>
              Add year
            </Button>
          </>
        }
      >
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-body">Label</span>
          <input className="crm-input w-full px-3 py-2" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="2027/2028" />
        </label>
      </Modal>
      <ConfirmDialog
        open={removing}
        destructive
        title="Delete academic year"
        message={`Delete ${selected?.label ?? 'this year'} and its marking periods? This cannot be undone.`}
        confirmLabel="Delete year"
        onClose={() => setRemoving(false)}
        onConfirm={() => {
          if (!selected) return
          void deleteAcademicYear(selected.id)
            .then(() => {
              const remaining = years.filter((year) => year.id !== selected.id)
              onYears(remaining)
              const next = remaining[0]
              setYearId(next?.id ?? '')
              setPeriods(next?.marking_periods ?? [])
              setPeriodId(next?.marking_periods.find((period) => ACTIVE_CODES.has(period.code))?.id ?? '')
              setRemoving(false)
              pushToast('Deleted the academic year.', 'success')
            })
            .catch((caught) => {
              setRemoving(false)
              setError(isApiError(caught) ? caught.detail : 'The academic year could not be deleted.')
            })
        }}
      />
    </Card>
  )
}

function GradingSection({
  settings,
  canEdit,
  onSettings,
}: {
  settings: SchoolSettings
  canEdit: boolean
  onSettings: (settings: SchoolSettings) => void
}) {
  const [pass, setPass] = useState(settings.pass_threshold)
  const [honor, setHonor] = useState(settings.honor_roll_threshold)
  const [marking, setMarking] = useState(settings.marking_period_weight)
  const [exam, setExam] = useState(settings.semester_exam_weight)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const sum = Math.round(Number(marking) * 100) + Math.round(Number(exam) * 100)

  async function save() {
    if (sum !== 10000) {
      setError('Grading weights must sum to 100%.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const saved = await saveSettings({
        pass_threshold: pass,
        honor_roll_threshold: honor,
        marking_period_weight: marking,
        semester_exam_weight: exam,
      })
      onSettings(saved)
      pushToast('Saved grading weights.', 'success')
    } catch (caught) {
      setError(fieldText(caught, 'marking_period_weight') || (isApiError(caught) ? caught.detail : 'Grading weights could not be saved.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-4 p-4">
      <div>
        <h2 className="text-sm font-semibold text-main">Grading weights</h2>
        <p className="mt-0.5 text-xs text-sub">Marking periods and the semester exam must add up to 100%.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NumberField label="Passing grade %" value={pass} disabled={!canEdit} onChange={setPass} />
        <NumberField label="Honor roll %" value={honor} disabled={!canEdit} onChange={setHonor} />
        <NumberField label="Marking periods %" value={marking} disabled={!canEdit} onChange={setMarking} />
        <NumberField label="Semester exam %" value={exam} disabled={!canEdit} onChange={setExam} />
      </div>
      <p className="text-xs text-sub">Current total {Number.isFinite(sum) ? (sum / 100).toFixed(2) : '—'}%</p>
      {error ? <p className="text-xs text-sub">{error}</p> : null}
      {canEdit ? (
        <Button className="px-3 py-1.5 text-xs" disabled={busy} onClick={() => void save()}>
          Save grading
        </Button>
      ) : null}
    </Card>
  )
}

function CurrencySection({
  settings,
  canEdit,
  onSettings,
}: {
  settings: SchoolSettings
  canEdit: boolean
  onSettings: (settings: SchoolSettings) => void
}) {
  const preferences = usePreferences()
  const profile = useSchoolProfile()
  const [rate, setRateInput] = useState(settings.lrd_per_usd)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const numeric = Number(rate)
  const preview = Number.isFinite(numeric) && numeric > 0 ? formatUsdEquivalent(192000, numeric) : ''

  async function save() {
    setBusy(true)
    setError('')
    try {
      const saved = await saveSettings({ lrd_per_usd: rate })
      onSettings(saved)
      const next = Number(saved.lrd_per_usd)
      if (Number.isFinite(next) && next > 0) profile.setRate(next)
      pushToast(`Updated reference exchange rate: 1 USD = ${saved.lrd_per_usd} LRD.`, 'success')
    } catch (caught) {
      setError(fieldText(caught, 'lrd_per_usd') || (isApiError(caught) ? caught.detail : 'The exchange rate could not be saved.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-4 p-4">
      <div>
        <h2 className="text-sm font-semibold text-main">Currency and FX rate</h2>
        <p className="mt-0.5 text-xs text-sub">Tuition stays in Liberian dollars. USD is a reference only.</p>
      </div>
      <label className="block text-xs">
        <span className="mb-1 block font-medium text-body">Reference exchange rate (LRD per 1 USD)</span>
        <input
          className="crm-input num-tabular w-full px-3 py-2"
          type="number"
          min="0"
          step="0.01"
          value={rate}
          disabled={!canEdit}
          onChange={(event) => setRateInput(event.target.value)}
        />
      </label>
      <label className="crm-switch justify-between p-2.5 text-xs">
        <span className="font-medium text-main">Show USD equivalent next to LRD</span>
        <span className="relative inline-flex items-center">
          <input
            type="checkbox"
            className="crm-switch-input"
            checked={preferences.showUsd}
            onChange={(event) => setUsdReference(event.target.checked)}
          />
          <span aria-hidden="true" className="crm-switch-track">
            <span className="crm-switch-thumb" />
          </span>
        </span>
      </label>
      {preview ? <p className="num-tabular text-xs text-sub">LRD 192,000.00 {preview}</p> : null}
      {error ? <FieldErrors messages={[error]} /> : null}
      {canEdit ? (
        <Button className="px-3 py-1.5 text-xs" disabled={busy} onClick={() => void save()}>
          Save rate
        </Button>
      ) : null}
    </Card>
  )
}

function HealthSection({ health }: { health: IntegrationStatus }) {
  const cards = [
    { title: 'Email SMTP', status: health.email_smtp.status, detail: '' },
    { title: 'SMS gateway', status: health.sms.status, detail: health.sms.sender_id ? `Sender ID ${health.sms.sender_id}` : '' },
    { title: 'WhatsApp Business', status: health.whatsapp.status, detail: '' },
    { title: 'Google Sign-In', status: health.google.status, detail: '' },
    { title: 'AI Assist', status: health.ai.status, detail: health.ai.provider ? health.ai.provider : '' },
    ...health.mobile_money.map((item) => ({
      title: item.provider === 'mtn_momo' ? 'Lonestar MTN MoMo' : 'Orange Money',
      status: item.status,
      detail: '',
    })),
  ]
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {cards.map((card) => (
        <Card key={card.title} className="space-y-2 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-main">{card.title}</h2>
            <Badge tone={card.status === 'configured' ? 'success' : 'neutral'}>
              {card.status === 'configured' ? 'Configured' : 'Unconfigured'}
            </Badge>
          </div>
          {card.detail ? <p className="text-xs text-sub">{card.detail}</p> : null}
        </Card>
      ))}
    </div>
  )
}

function NumberField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string
  value: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-medium text-body">{label}</span>
      <input className="crm-input num-tabular w-full px-3 py-2" type="number" min="0" max="100" step="0.01" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function UiKit() {
  const [period, setPeriod] = useState('p2')
  const [date, setDate] = useState('')
  const [dateTime, setDateTime] = useState('')
  const [kitTab, setKitTab] = useState('light')
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <div className="space-y-5">
      <Card className="space-y-4 p-4">
        <h2 className="text-sm font-semibold text-main">UI kit</h2>
        <div className="flex flex-wrap gap-2">
          <Badge tone="success">Active</Badge>
          <Badge tone="warn">Pending</Badge>
          <Badge tone="danger">Hold</Badge>
          <Badge tone="info">Note</Badge>
          <Badge tone="neutral">Draft</Badge>
        </div>
        <Subtabs
          value={kitTab}
          onChange={setKitTab}
          tabs={[
            { id: 'light', label: 'Light' },
            { id: 'dark', label: 'Dark' },
            { id: 'accent', label: 'Accent' },
          ]}
        />
        <Select
          ariaLabel="Marking period"
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'p2', label: 'Period 2 (Nov 2026)' },
            { value: 's1', label: 'Semester 1 (P1–P3 + Exam)' },
            { value: 'yr', label: 'Full Academic Year 2026/27' },
          ]}
        />
        <DatePicker ariaLabel="Sample date" value={date} onChange={setDate} />
        <DateTimePicker ariaLabel="Sample date and time" value={dateTime} onChange={setDateTime} />
        <div className="flex gap-2">
          <Button className="px-3 py-1.5 text-xs" onClick={() => setModalOpen(true)}>
            Open dialog
          </Button>
          <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setConfirmOpen(true)}>
            Confirm
          </Button>
          <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => pushToast('Saved the sample.', 'success')}>
            Toast
          </Button>
        </div>
        <DataTable
          empty="No activities yet."
          rows={[{ id: 'sample', label: 'Sample row', value: formatLrd(1234) }]}
          columns={[
            { key: 'label', header: 'Item', render: (row) => row.label },
            { key: 'value', header: 'Amount', numeric: true, render: (row) => row.value },
          ]}
        />
      </Card>
      <Modal
        open={modalOpen}
        title="Sample dialog"
        subtitle="Dialogs use the modal surface."
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button className="px-3 py-1.5 text-xs" onClick={() => setModalOpen(false)}>
              Done
            </Button>
          </>
        }
      >
        <p className="text-xs text-sub">This dialog is part of the UI kit.</p>
      </Modal>
      <ConfirmDialog
        open={confirmOpen}
        title="Confirm sample"
        message="This confirmation does not change school data."
        confirmLabel="Confirm"
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => setConfirmOpen(false)}
      />
    </div>
  )
}

import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { Badge } from '../components/Badge.tsx'
import { Button } from '../components/Button.tsx'
import { Card } from '../components/Card.tsx'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { DataTable } from '../components/DataTable.tsx'
import { DatePicker } from '../components/DatePicker.tsx'
import { DateTimePicker } from '../components/DateTimePicker.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { Modal } from '../components/Modal.tsx'
import { Select } from '../components/Select.tsx'
import { Subtabs } from '../components/Subtabs.tsx'
import { pushToast } from '../hooks/useToasts.ts'
import { usePreferences } from '../hooks/usePreferences.ts'
import { dashboardTitle, firstPane, paneById, panesForRole } from '../navigation.ts'
import { formatLrd, formatUsdEquivalent } from '../utils/money.ts'
import { PrivacyNotice } from './PrivacyScreen.tsx'

export function HomeRedirect() {
  const { user } = useAuth()
  const pane = firstPane(user?.role ?? '')
  if (!pane) return <EmptyState>No workspace is available for this account.</EmptyState>
  return <Navigate to={`/${pane.id}`} replace />
}

export function WorkspaceScreen() {
  const { paneId } = useParams()
  const { user } = useAuth()
  const preferences = usePreferences()
  const pane = paneId ? paneById(paneId) : null
  const allowed = panesForRole(user?.role ?? '')
  if (!pane || !allowed.some((item) => item.id === pane.id)) {
    const next = allowed[0]
    if (!next) return <EmptyState>No workspace is available for this account.</EmptyState>
    return <Navigate to={`/${next.id}`} replace />
  }

  return (
    <section className={`space-y-5 ${pane.id === 'settings' ? 'max-w-4xl' : 'w-full'}`}>
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-main">
          {pane.id === 'dashboard' ? dashboardTitle(user?.role ?? '') : pane.breadcrumb}
        </h1>
        <p className="mt-0.5 text-xs text-sub">{pane.subtitle}</p>
      </div>
      {pane.money != null ? (
        <Card className="p-4">
          <p className="num-tabular text-sm font-semibold text-main">{formatLrd(pane.money)}</p>
          {preferences.showUsd ? <p className="num-tabular text-xs text-sub">{formatUsdEquivalent(pane.money)}</p> : null}
        </Card>
      ) : null}
      {pane.id === 'settings' ? <SettingsKit /> : <p className="text-xs text-sub">This workspace is not available yet.</p>}
      <p className="text-xs text-sub">Times use Africa/Monrovia.</p>
    </section>
  )
}

function SettingsKit() {
  const [period, setPeriod] = useState('p2')
  const [date, setDate] = useState('')
  const [dateTime, setDateTime] = useState('')
  const [tab, setTab] = useState('light')
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <div className="space-y-5">
      <Card className="space-y-2 p-4">
        <h2 className="text-sm font-semibold text-main">Privacy notice</h2>
        <PrivacyNotice />
        <Link to="/privacy" className="text-xs font-medium" style={{ color: 'var(--brand-text)' }}>
          Open privacy notice
        </Link>
      </Card>
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
          value={tab}
          onChange={setTab}
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
          rows={[{ id: 'sample', label: 'Sample row', value: 'LRD 1,234.00' }]}
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

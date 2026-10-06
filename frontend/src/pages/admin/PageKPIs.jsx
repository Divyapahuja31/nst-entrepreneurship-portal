import React from 'react'
import { useLoaderData, useRevalidator } from 'react-router'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'

import EmptyState from '../../components/EmptyState'
import PageHeader from '../../components/PageHeader'
import ReviewTable from '../../components/ReviewTable'
import SectionCard from '../../components/SectionCard'
import StatTile from '../../components/StatTile'
import {
  CheckCircleIcon,
  HourglassIcon,
  KpiIcon,
  TargetIcon,
} from '../../components/icons'
import { KPI_STATUS, formatDate } from '../../components/kpiStatus'
import KPIEvaluateDialog from '../../components/KPIEvaluateDialog'
import KpiLockAction from '../../components/KpiLockAction'
import {
  reviewBlockedReason,
  staffKpiContext,
} from '../../components/kpiAccess'
import { evaluateKPI, lockKPI, unlockKPI } from '../../api/kpi'
import useAccess from '../../hooks/useAccess'
import { canEvaluateKpi } from '@nst/shared/permissions.js'

const columns = [
  { key: 'title', label: 'KPI' },
  { key: 'owner', label: 'Owner' },
  { key: 'venture', label: 'Startup' },
  { key: 'status', label: 'Status' },
  { key: 'dueDate', label: 'Due' },
]

const STATUSES = Object.keys(KPI_STATUS)

export default function PageKPIs() {
  const { kpis } = useLoaderData()
  const revalidator = useRevalidator()
  const { actor, isMentor } = useAccess()

  const [ownerFilter, setOwnerFilter] = React.useState('')
  const [status, setStatus] = React.useState('')
  const [busyId, setBusyId] = React.useState(null)
  const [error, setError] = React.useState('')
  const [success, setSuccess] = React.useState('')
  const [evaluating, setEvaluating] = React.useState(null)
  // The decision the dialog opens on, e.g. REJECTED from the Reject button.
  const [initialDecision, setInitialDecision] = React.useState(null)

  const openReview = (kpi, decision = null) => {
    setInitialDecision(decision)
    setEvaluating(kpi)
  }

  const visible = kpis.filter(kpi => {
    if (ownerFilter === 'STARTUP' && kpi.founder) return false
    if (ownerFilter === 'MEMBER' && !kpi.founder) return false
    if (status && kpi.status !== status) return false
    return true
  })

  const rows = visible.map(kpi => ({
    id: kpi._id,
    kpi,
    title: kpi.title,
    owner:
      kpi.founder?.username || (kpi.founder ? 'Founder' : 'Entire startup'),
    venture: kpi.venture?.name || '-',
    rawStatus: kpi.status,
    dueDate: formatDate(kpi.dueDate),
  }))

  const review = async (kpiId, payload) => {
    setBusyId(kpiId)
    setError('')
    setSuccess('')

    try {
      await evaluateKPI({ kpiId, ...payload })
      setSuccess(
        {
          ACCEPTED: 'KPI approved.',
          REJECTED: 'KPI rejected.',
          GRADED: 'KPI graded.',
        }[payload.status] || 'KPI updated.'
      )
      revalidator.revalidate()
    } catch (err) {
      setError(err.message || 'Could not update KPI')
    } finally {
      setBusyId(null)
    }
  }

  const setLock = async (kpiId, locked) => {
    setBusyId(kpiId)
    setError('')
    setSuccess('')
    try {
      await (locked ? lockKPI(kpiId) : unlockKPI(kpiId))
      setSuccess(locked ? 'KPI locked. Its grade is final.' : 'KPI unlocked.')
      revalidator.revalidate()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const pendingCount = kpis.filter(
    kpi => kpi.status === 'WAITING_FOR_APPROVAL'
  ).length
  const acceptedCount = kpis.filter(kpi => kpi.status === 'ACCEPTED').length
  const gradedCount = kpis.filter(kpi => kpi.status === 'GRADED').length
  const rejectedCount = kpis.filter(kpi => kpi.status === 'REJECTED').length

  const renderRowActions = row => {
    const kpi = row.kpi
    const isBusy = busyId === row.id
    // A mentor reviews until the KPI is locked; the board always may.
    const ctx = staffKpiContext(kpi)
    const mayReview = canEvaluateKpi(actor, ctx)

    return (
      <Stack
        direction="row"
        spacing={1}
        sx={{ justifyContent: 'flex-end', alignItems: 'center' }}
      >
        <Button variant="text" onClick={() => openReview(kpi)}>
          View
        </Button>
        <KpiLockAction
          actor={actor}
          ctx={ctx}
          busy={isBusy}
          onLock={() => setLock(row.id, true)}
          onUnlock={() => setLock(row.id, false)}
        />
        {mayReview && kpi.status === 'WAITING_FOR_APPROVAL' && (
          <>
            <Button
              variant="outlined"
              color="success"
              loading={isBusy}
              disabled={Boolean(busyId) && !isBusy}
              onClick={() => review(row.id, { status: 'ACCEPTED' })}
            >
              Approve
            </Button>
            <Button
              variant="outlined"
              color="error"
              disabled={Boolean(busyId)}
              onClick={() => openReview(kpi, 'REJECTED')}
            >
              Reject
            </Button>
          </>
        )}
        {mayReview && kpi.status === 'ACCEPTED' && (
          <Button
            variant="outlined"
            disabled={isBusy}
            onClick={() => openReview(kpi, 'GRADED')}
          >
            Grade
          </Button>
        )}
        {mayReview && kpi.status === 'REJECTED' && (
          <Button
            variant="outlined"
            disabled={isBusy}
            onClick={() => openReview(kpi, 'ACCEPTED')}
          >
            Review
          </Button>
        )}
      </Stack>
    )
  }

  const graded = kpis.filter(
    kpi => kpi.status === 'GRADED' && typeof kpi.score === 'number'
  )
  const averageScore = graded.length
    ? Math.round(
        graded.reduce((sum, kpi) => sum + kpi.score, 0) / graded.length
      )
    : null

  return (
    <Box sx={{ maxWidth: 1080, mx: 'auto' }}>
      <PageHeader
        title="KPIs"
        subtitle={
          isMentor
            ? 'Every KPI of the startups you mentor, whether it belongs to a startup or one of its founders.'
            : 'Every KPI across all startups, whether it belongs to a startup or one of its founders.'
        }
      />

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gap: { xs: 2, sm: 3 },
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(4, minmax(0, 1fr))',
          },
          mb: 3,
        }}
      >
        <StatTile
          icon={KpiIcon}
          label="Total"
          value={kpis.length}
          detail={rejectedCount ? `${rejectedCount} rejected` : null}
        />
        <StatTile
          icon={HourglassIcon}
          tint="orange"
          label="Awaiting approval"
          value={pendingCount}
        />
        <StatTile icon={TargetIcon} label="To grade" value={acceptedCount} />
        <StatTile
          icon={CheckCircleIcon}
          tint="green"
          label="Graded"
          value={gradedCount}
          detail={averageScore != null ? `Average ${averageScore} pts` : null}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        <TextField
          select
          label="Owner"
          value={ownerFilter}
          onChange={event => setOwnerFilter(event.target.value)}
          slotProps={{
            select: { displayEmpty: true },
            inputLabel: { shrink: true },
          }}
          sx={{ flex: '0 1 200px', minWidth: 160 }}
        >
          <MenuItem value="">All owners</MenuItem>
          <MenuItem value="STARTUP">Entire startup</MenuItem>
          <MenuItem value="MEMBER">One founder</MenuItem>
        </TextField>

        <TextField
          select
          label="Status"
          value={status}
          onChange={event => setStatus(event.target.value)}
          slotProps={{
            select: { displayEmpty: true },
            inputLabel: { shrink: true },
          }}
          sx={{ flex: '0 1 220px', minWidth: 180 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {STATUSES.map(value => (
            <MenuItem key={value} value={value}>
              {KPI_STATUS[value].label}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {rows.length ? (
        <ReviewTable
          actionsLabel="Actions"
          columns={columns}
          rows={rows}
          busyId={busyId}
          renderActions={renderRowActions}
        />
      ) : (
        <SectionCard>
          <EmptyState
            icon={KpiIcon}
            title={kpis.length ? 'No matches' : 'No KPIs yet'}
            description={
              kpis.length
                ? 'No KPIs match these filters.'
                : 'KPIs appear here once founders create them.'
            }
          />
        </SectionCard>
      )}

      <KPIEvaluateDialog
        open={Boolean(evaluating)}
        kpi={evaluating}
        initialStatus={initialDecision}
        founder={evaluating?.founder}
        venture={evaluating?.venture}
        saving={Boolean(busyId)}
        readOnlyReason={
          evaluating && reviewBlockedReason(actor, staffKpiContext(evaluating))
        }
        onClose={() => setEvaluating(null)}
        onSave={async payload => {
          setEvaluating(null)
          await review(payload.kpiId, {
            status: payload.status,
            score: payload.score,
            feedback: payload.feedback,
          })
        }}
      />
    </Box>
  )
}

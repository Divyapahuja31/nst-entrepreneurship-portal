import React from 'react'
import { useLoaderData, useRevalidator } from 'react-router'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import ReviewTable from '../../components/ReviewTable'
import KPIEvaluateDialog from '../../components/KPIEvaluateDialog'
import { evaluateKPI } from '../../api/kpi'

const columns = [
  { key: 'title', label: 'kpi' },
  { key: 'owner', label: 'owner' },
  { key: 'venture', label: 'startup' },
  { key: 'status', label: 'status' },
  { key: 'dueDate', label: 'due' },
]

const STATUS_LABELS = {
  DRAFT: 'Draft',
  WAITING_FOR_APPROVAL: 'Waiting for Approval',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  GRADED: 'Graded',
}

const STATUSES = Object.keys(STATUS_LABELS)

const formatDate = value => {
  if (!value) return '-'

  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function PageKPIs() {
  const { kpis } = useLoaderData()
  const revalidator = useRevalidator()

  const [ownerFilter, setOwnerFilter] = React.useState('')
  const [status, setStatus] = React.useState('')
  const [busyId, setBusyId] = React.useState(null)
  const [error, setError] = React.useState('')
  const [success, setSuccess] = React.useState('')
  const [evaluating, setEvaluating] = React.useState(null)

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
    owner: kpi.founder?.username || (kpi.founder ? 'Member' : 'Entire Startup'),
    venture: kpi.venture?.name || '-',
    rawStatus: kpi.status,
    status: STATUS_LABELS[kpi.status] || kpi.status,
    dueDate: formatDate(kpi.dueDate),
  }))

  const review = async (kpiId, payload) => {
    setBusyId(kpiId)
    setError('')
    setSuccess('')

    try {
      await evaluateKPI({ kpiId, ...payload })
      setSuccess(
        payload.status === 'ACCEPTED'
          ? 'KPI approved successfully'
          : payload.status === 'REJECTED'
            ? 'KPI rejected'
            : payload.status === 'GRADED'
              ? 'KPI graded successfully'
              : 'KPI updated successfully'
      )
      revalidator.revalidate()
    } catch (err) {
      setError(err.message || 'Could not update KPI')
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

    return (
      <Stack
        direction="row"
        spacing={1}
        justifyContent="flex-end"
        alignItems="center"
      >
        <Button size="small" onClick={() => setEvaluating(kpi)}>
          View
        </Button>
        {kpi.status === 'WAITING_FOR_APPROVAL' && (
          <>
            <Button
              size="small"
              variant="contained"
              color="success"
              disabled={isBusy}
              onClick={() => review(row.id, { status: 'ACCEPTED' })}
            >
              Approve
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              disabled={isBusy}
              onClick={() => setEvaluating(kpi)}
            >
              Reject
            </Button>
          </>
        )}
        {kpi.status === 'ACCEPTED' && (
          <Button
            size="small"
            variant="contained"
            color="primary"
            disabled={isBusy}
            onClick={() => setEvaluating(kpi)}
          >
            Grade KPI
          </Button>
        )}
        {kpi.status === 'GRADED' && (
          <Button
            size="small"
            variant="outlined"
            color="primary"
            disabled={isBusy}
            onClick={() => setEvaluating(kpi)}
          >
            Update Grade
          </Button>
        )}
        {kpi.status === 'REJECTED' && (
          <Button
            size="small"
            variant="outlined"
            color="warning"
            disabled={isBusy}
            onClick={() => setEvaluating(kpi)}
          >
            Review / Accept
          </Button>
        )}
      </Stack>
    )
  }

  return (
    <>
      <Typography variant="h4" gutterBottom>
        KPIs
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Every KPI across all startups, whether it belongs to a startup or to one
        of its founders.
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
        <Chip label={`${kpis.length} total`} />
        <Chip label={`${pendingCount} awaiting approval`} color="warning" />
        <Chip label={`${acceptedCount} accepted`} color="info" />
        <Chip label={`${gradedCount} graded`} color="success" />
        {rejectedCount > 0 && (
          <Chip label={`${rejectedCount} rejected`} color="error" />
        )}
      </Stack>

      {success && (
        <Alert
          severity="success"
          sx={{ mt: 2 }}
          onClose={() => setSuccess('')}
        >
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ my: 3 }}>
        <TextField
          select
          label="Owner"
          value={ownerFilter}
          onChange={event => setOwnerFilter(event.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All owners</MenuItem>
          <MenuItem value="STARTUP">Entire Startup</MenuItem>
          <MenuItem value="MEMBER">Specific Member</MenuItem>
        </TextField>

        <TextField
          select
          label="Status"
          value={status}
          onChange={event => setStatus(event.target.value)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {STATUSES.map(value => (
            <MenuItem key={value} value={value}>
              {STATUS_LABELS[value] || value}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Box>
        {rows.length ? (
          <ReviewTable
            columns={columns}
            rows={rows}
            busyId={busyId}
            renderActions={renderRowActions}
          />
        ) : (
          <Alert severity="info">No KPIs match these filters.</Alert>
        )}
      </Box>

      <KPIEvaluateDialog
        open={Boolean(evaluating)}
        kpi={evaluating}
        founder={evaluating?.founder}
        venture={evaluating?.venture}
        saving={Boolean(busyId)}
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
    </>
  )
}

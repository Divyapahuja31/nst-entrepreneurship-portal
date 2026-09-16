import React from 'react'
import { useLoaderData, useRevalidator } from 'react-router'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
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
  { key: 'scope', label: 'scope' },
  { key: 'owner', label: 'belongs to' },
  { key: 'venture', label: 'venture' },
  { key: 'status', label: 'status' },
  { key: 'dueDate', label: 'due' },
]

const SCOPES = ['VENTURE', 'FOUNDER']

const STATUSES = [
  'DRAFT',
  'WAITING_FOR_APPROVAL',
  'ACCEPTED',
  'REJECTED',
  'GRADED',
]

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

  const [scope, setScope] = React.useState('')
  const [status, setStatus] = React.useState('')
  const [busyId, setBusyId] = React.useState(null)
  const [error, setError] = React.useState('')
  const [evaluating, setEvaluating] = React.useState(null)

  const visible = kpis.filter(
    kpi => (!scope || kpi.scope === scope) && (!status || kpi.status === status)
  )

  const rows = visible.map(kpi => ({
    id: kpi._id,
    kpi,
    title: kpi.title,
    scope: kpi.scope,
    // A venture KPI belongs to the whole team; a founder KPI names its founder.
    owner:
      kpi.scope === 'FOUNDER' ? kpi.founder?.username || '-' : 'Whole team',
    venture: kpi.venture?.name || '-',
    status: kpi.status,
    dueDate: formatDate(kpi.dueDate),
  }))

  const review = async (kpiId, payload) => {
    setBusyId(kpiId)
    setError('')

    try {
      await evaluateKPI({ kpiId, ...payload })
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

  return (
    <>
      <Typography variant="h4" gutterBottom>
        KPIs
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Every KPI across all ventures, whether it belongs to a venture or to one
        of its founders.
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Chip label={`${kpis.length} total`} />
        <Chip label={`${pendingCount} awaiting approval`} color="warning" />
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ my: 3 }}>
        <TextField
          select
          label="Scope"
          value={scope}
          onChange={event => setScope(event.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All scopes</MenuItem>
          {SCOPES.map(value => (
            <MenuItem key={value} value={value}>
              {value}
            </MenuItem>
          ))}
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
              {value}
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
            onView={row => setEvaluating(row.kpi)}
            onApprove={row => review(row.id, { status: 'ACCEPTED' })}
            onReject={row => review(row.id, { status: 'REJECTED' })}
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

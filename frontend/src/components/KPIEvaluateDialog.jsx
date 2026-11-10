import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Link,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material'

import { EVALUATION_TRANSITIONS } from '@nst/shared/permissions.js'

import { formatDate } from './kpiStatus'

// What a KPI can become from each status, the same rules the API applies.
// A draft hasn't been submitted, so it has no decisions.
const DECISIONS = EVALUATION_TRANSITIONS

const DECISION_LABELS = {
  ACCEPTED: 'Accept (approve the KPI proposal)',
  GRADED: 'Grade (assign a score)',
  REJECTED: 'Reject (the student revises it)',
}

const SUBMIT_LABELS = {
  ACCEPTED: 'Approve KPI',
  GRADED: 'Submit Grade',
  REJECTED: 'Reject KPI',
}

function Row({ label, children }) {
  return (
    <Box
      sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 1 }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ textAlign: 'right' }}>
        {children}
      </Typography>
    </Box>
  )
}

const isValidScore = value =>
  value !== '' && Number(value) >= 0 && Number(value) <= 100

export default function KPIEvaluateDialog({
  open,
  onClose,
  kpi,
  initialStatus,
  founder,
  venture,
  onSave,
  saving = false,
  // Set when the viewer may not review this KPI (it is locked, or not
  // their startup): the dialog then only shows the KPI and this reason.
  readOnlyReason = null,
}) {
  const [prevOpen, setPrevOpen] = useState(false)
  const [prevKpi, setPrevKpi] = useState(null)
  const [evalStatus, setEvalStatus] = useState('')
  const [evalScore, setEvalScore] = useState('')
  const [evalFeedback, setEvalFeedback] = useState('')

  if (open !== prevOpen || kpi !== prevKpi) {
    setPrevOpen(open)
    setPrevKpi(kpi)
    if (open && kpi) {
      // Score defaults to 0 on the server; only show it once a grade exists.
      setEvalScore(
        kpi.status === 'GRADED' && kpi.score != null ? String(kpi.score) : ''
      )
      setEvalFeedback(kpi.feedback || '')
      const options = DECISIONS[kpi.status] ?? []
      setEvalStatus(
        options.includes(initialStatus) ? initialStatus : (options[0] ?? '')
      )
    }
  }

  const decisions = readOnlyReason ? [] : (DECISIONS[kpi?.status] ?? [])
  const scoreMissing = evalStatus === 'GRADED' && !isValidScore(evalScore)
  const reasonMissing = evalStatus === 'REJECTED' && !evalFeedback.trim()
  const canSubmit = Boolean(evalStatus) && !scoreMissing && !reasonMissing
  const hasEvidenceFile = Boolean(
    kpi?.evidence?.fileUrl || kpi?.evidence?.fileName
  )

  const handleSubmit = () => {
    if (!kpi || !canSubmit) return
    onSave({
      kpiId: kpi._id,
      status: evalStatus,
      score: evalStatus === 'GRADED' ? Number(evalScore) : undefined,
      feedback: evalFeedback,
    })
  }

  const owner = founder?.username || kpi?.founder?.username || 'Entire startup'
  const ventureName = venture?.name || kpi?.venture?.name

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {evalStatus === 'GRADED' ? 'Grade' : 'Review'} “{kpi?.title}”
      </DialogTitle>
      <DialogContent>
        <Box
          sx={{
            mb: 3,
            p: 2,
            borderRadius: '14px',
            bgcolor: 'background.default',
          }}
        >
          <Row label="Owner">
            {owner}
            {ventureName ? ` · ${ventureName}` : ''}
          </Row>
          <Divider />
          <Row label="Due">{formatDate(kpi?.dueDate)}</Row>
          <Divider />
          <Row label="Submitted">
            {formatDate(kpi?.submissionDate || kpi?.evidence?.submittedAt)}
          </Row>
          <Divider />
          <Row label="Achieved">
            {kpi?.actualValue || (
              <Box component="span" sx={{ color: 'text.secondary' }}>
                Not recorded
              </Box>
            )}
          </Row>
          {hasEvidenceFile && (
            <>
              <Divider />
              <Row label="Evidence">
                <Link href={`/api/kpis/${kpi?._id}/evidence/download`} download>
                  {kpi?.evidence?.fileName || 'Download file'}
                </Link>
              </Row>
            </>
          )}

          {kpi?.description && (
            <>
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>
                Description
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                {kpi.description}
              </Typography>
            </>
          )}

          {kpi?.subKPIs?.length > 0 && (
            <>
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>
                Sub-KPIs
              </Typography>
              <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
                {kpi.subKPIs.map((sub, i) => (
                  <Typography key={sub._id || i} component="li" variant="body2">
                    {sub.name}
                  </Typography>
                ))}
              </Box>
            </>
          )}

          {kpi?.evidence?.supportingText && (
            <>
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>
                Founder&apos;s notes
              </Typography>
              <Typography variant="body2">
                {kpi.evidence.supportingText}
              </Typography>
            </>
          )}
        </Box>

        {decisions.length === 0 ? (
          <Alert severity="info">
            {readOnlyReason ||
              'This KPI is still a draft. You can review it once the founder submits it for approval.'}
          </Alert>
        ) : (
          <Box sx={{ display: 'grid', gap: 2 }}>
            <TextField
              select
              label="Decision"
              fullWidth
              value={evalStatus}
              onChange={e => setEvalStatus(e.target.value)}
            >
              {decisions.map(value => (
                <MenuItem key={value} value={value}>
                  {DECISION_LABELS[value]}
                </MenuItem>
              ))}
            </TextField>

            {evalStatus === 'GRADED' && (
              <TextField
                label="Score (0–100)"
                type="number"
                fullWidth
                required
                value={evalScore}
                onChange={e => setEvalScore(e.target.value)}
                slotProps={{ htmlInput: { min: 0, max: 100, step: 1 } }}
                error={evalScore !== '' && scoreMissing}
                helperText={
                  evalScore !== '' && scoreMissing
                    ? 'Enter a score from 0 to 100.'
                    : 'Required to grade the KPI.'
                }
              />
            )}

            <TextField
              label={
                evalStatus === 'REJECTED'
                  ? 'Reason and guidance for the founder'
                  : 'Feedback'
              }
              multiline
              rows={4}
              fullWidth
              required={evalStatus === 'REJECTED'}
              value={evalFeedback}
              onChange={e => setEvalFeedback(e.target.value)}
              helperText={
                evalStatus === 'REJECTED'
                  ? 'Required. The founder sees this when they revise the KPI.'
                  : 'The founder sees this.'
              }
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose} disabled={saving}>
          {decisions.length ? 'Cancel' : 'Close'}
        </Button>
        {decisions.length > 0 && (
          <Button
            variant="contained"
            color={evalStatus === 'REJECTED' ? 'error' : 'primary'}
            onClick={handleSubmit}
            loading={saving}
            disabled={!canSubmit}
          >
            {SUBMIT_LABELS[evalStatus]}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

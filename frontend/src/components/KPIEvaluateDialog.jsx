import { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Chip,
  Divider,
  Alert,
} from '@mui/material'
import RateReviewIcon from '@mui/icons-material/RateReview'
import DownloadIcon from '@mui/icons-material/Download'

const formatDate = dateStr => {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return '-'
  }
}

// What a KPI can become from each status; mirrors EVALUATION_TRANSITIONS on
// the server. A draft hasn't been submitted, so it has no decisions.
const DECISIONS = {
  WAITING_FOR_APPROVAL: ['ACCEPTED', 'REJECTED'],
  REJECTED: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['GRADED'],
  GRADED: ['GRADED'],
}

const DECISION_LABELS = {
  ACCEPTED: 'Accept (approve the KPI proposal)',
  GRADED: 'Grade (assign a score)',
  REJECTED: 'Reject (the student revises it)',
}

const SUBMIT_LABELS = {
  ACCEPTED: 'Approve KPI',
  GRADED: 'Submit grade',
  REJECTED: 'Reject KPI',
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

  const decisions = DECISIONS[kpi?.status] ?? []
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {evalStatus === 'GRADED' ? 'Grade KPI' : 'Review KPI'}: {kpi?.title}
      </DialogTitle>
      <DialogContent dividers>
        {/* KPI Overview & Submission Details */}
        <Box
          sx={{
            mb: 2.5,
            p: 2,
            backgroundColor: '#f8fafc',
            borderRadius: 2,
            border: '1px solid #e2e8f0',
          }}
        >
          <Box sx={{ mb: 1.5 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block' }}
            >
              Owner:{' '}
              <strong>
                {founder?.username ||
                  kpi?.founder?.username ||
                  'Entire startup'}
              </strong>{' '}
              {venture?.name || kpi?.venture?.name
                ? `(${venture?.name || kpi?.venture?.name})`
                : ''}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block' }}
            >
              Due Date: <strong>{formatDate(kpi?.dueDate)}</strong> | Submission
              Date:{' '}
              <strong>
                {formatDate(kpi?.submissionDate || kpi?.evidence?.submittedAt)}
              </strong>
            </Typography>
          </Box>

          {kpi?.description && (
            <Box sx={{ mb: 1.5 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 600 }}
              >
                Description:
              </Typography>
              <Typography
                variant="body2"
                sx={{ whiteSpace: 'pre-line', color: 'text.primary' }}
              >
                {kpi.description}
              </Typography>
            </Box>
          )}

          {kpi?.subKPIs?.length > 0 && (
            <Box sx={{ mb: 1.5 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
              >
                SubKPIs:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {kpi.subKPIs.map((sub, i) => (
                  <Chip
                    key={sub._id || i}
                    label={sub.name}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}

          <Divider sx={{ my: 1.5 }} />

          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, mb: 1, color: 'primary.dark' }}
          >
            Student Submission & Evidence
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Achieved Metric / Number:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  color: kpi?.actualValue ? 'success.dark' : 'text.secondary',
                }}
              >
                {kpi?.actualValue || 'Not recorded'}
              </Typography>
            </Box>

            {kpi?.evidence?.supportingText && (
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 600 }}
                >
                  Student Notes:
                </Typography>
                <Typography variant="body2" color="text.primary">
                  {kpi.evidence.supportingText}
                </Typography>
              </Box>
            )}

            {hasEvidenceFile && (
              <Box
                sx={{
                  mt: 1,
                  pt: 1,
                  borderTop: '1px dashed #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5,
                }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block' }}
                  >
                    Attached Evidence File:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {kpi?.evidence?.fileName || 'Evidence File'}
                  </Typography>
                </Box>
                <Button
                  component="a"
                  href={`/api/kpis/${kpi?._id}/evidence/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={<DownloadIcon fontSize="small" />}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Download Submission File
                </Button>
              </Box>
            )}
          </Box>
        </Box>

        {decisions.length === 0 ? (
          <Alert severity="info">
            This KPI is still a draft. You can review it once the student
            submits it for approval.
          </Alert>
        ) : (
          <>
            <Box
              sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2.5 }}
            >
              <TextField
                select
                label="Decision"
                size="small"
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
                  size="small"
                  fullWidth
                  required
                  value={evalScore}
                  onChange={e => setEvalScore(e.target.value)}
                  placeholder="e.g. 85"
                  slotProps={{ htmlInput: { min: 0, max: 100, step: 1 } }}
                  error={evalScore !== '' && scoreMissing}
                  helperText={
                    evalScore !== '' && scoreMissing
                      ? 'Enter a score from 0 to 100'
                      : 'Required to grade the KPI'
                  }
                />
              )}
            </Box>

            <TextField
              label={
                evalStatus === 'REJECTED'
                  ? 'Reason and guidance for the student'
                  : 'Feedback'
              }
              multiline
              rows={4}
              fullWidth
              required={evalStatus === 'REJECTED'}
              value={evalFeedback}
              onChange={e => setEvalFeedback(e.target.value)}
              placeholder={
                evalStatus === 'REJECTED'
                  ? 'Explain why this KPI is rejected and how the student should improve it...'
                  : 'Feedback, observations or advice...'
              }
              helperText={
                evalStatus === 'REJECTED'
                  ? 'Required. Visible to the student.'
                  : 'Visible to the student.'
              }
            />
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving} color="inherit">
          {decisions.length ? 'Cancel' : 'Close'}
        </Button>
        {decisions.length > 0 && (
          <Button
            variant="contained"
            color={
              evalStatus === 'REJECTED'
                ? 'error'
                : evalStatus === 'GRADED'
                  ? 'primary'
                  : 'success'
            }
            onClick={handleSubmit}
            disabled={saving || !canSubmit}
            startIcon={
              saving ? <CircularProgress size={16} /> : <RateReviewIcon />
            }
          >
            {saving ? 'Saving...' : SUBMIT_LABELS[evalStatus]}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

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
} from '@mui/material'
import RateReviewIcon from '@mui/icons-material/RateReview'

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
  const [evalStatus, setEvalStatus] = useState('ACCEPTED')
  const [evalScore, setEvalScore] = useState('')
  const [evalFeedback, setEvalFeedback] = useState('')

  if (open !== prevOpen || kpi !== prevKpi) {
    setPrevOpen(open)
    setPrevKpi(kpi)
    if (open && kpi) {
      setEvalScore(
        kpi.score !== undefined && kpi.score !== null ? String(kpi.score) : ''
      )
      setEvalFeedback(kpi.feedback || '')
      if (initialStatus) {
        setEvalStatus(initialStatus)
      } else if (
        kpi.status === 'WAITING_FOR_APPROVAL' ||
        kpi.status === 'DRAFT'
      ) {
        setEvalStatus('ACCEPTED')
      } else if (kpi.status === 'ACCEPTED') {
        setEvalStatus('GRADED')
      } else {
        setEvalStatus(kpi.status || 'ACCEPTED')
      }
    }
  }

  const handleSubmit = () => {
    if (!kpi) return
    onSave({
      kpiId: kpi._id,
      status: evalStatus,
      score:
        evalStatus === 'GRADED' && evalScore !== ''
          ? Number(evalScore)
          : undefined,
      feedback: evalFeedback,
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {evalStatus === 'GRADED' ? 'Grade KPI' : 'Review KPI'}: {kpi?.title}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Student / Venture: <strong>{founder?.username}</strong>{' '}
            {venture?.name ? `(${venture.name})` : ''}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Submission Date: <strong>{formatDate(kpi?.submissionDate)}</strong>
          </Typography>
        </Box>

        {kpi?.actualValue && (
          <Box
            sx={{
              mb: 2,
              p: 1.5,
              backgroundColor: '#f0fdf4',
              borderRadius: 1.5,
              border: '1px solid #bbf7d0',
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              Student Achieved Metric / Number:
            </Typography>
            <Typography
              variant="body1"
              sx={{ fontWeight: 700, color: 'success.dark' }}
            >
              {kpi.actualValue}
            </Typography>
            {kpi.evidence?.supportingText && (
              <Typography
                variant="body2"
                sx={{ mt: 0.5, color: 'text.secondary' }}
              >
                <strong>Notes:</strong> {kpi.evidence.supportingText}
              </Typography>
            )}
            {kpi.evidence?.fileName && (
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                sx={{ mt: 0.5 }}
              >
                <strong>File:</strong> {kpi.evidence.fileName}
              </Typography>
            )}
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2.5 }}>
          <TextField
            select
            label="Action / Status"
            size="small"
            fullWidth
            value={evalStatus}
            onChange={e => setEvalStatus(e.target.value)}
            helperText={
              evalStatus === 'ACCEPTED'
                ? 'Approve this KPI definition proposed by student'
                : evalStatus === 'GRADED'
                  ? 'Assign performance grade/score and stamp evaluation date'
                  : evalStatus === 'REJECTED'
                    ? 'Reject this KPI definition with feedback so student can revise'
                    : ''
            }
          >
            <MenuItem value="ACCEPTED">
              Accepted (Approve KPI Proposal)
            </MenuItem>
            <MenuItem value="GRADED">
              Graded (Assign Score & Evaluation Date)
            </MenuItem>
            <MenuItem value="REJECTED">
              Rejected (Require Student Revision)
            </MenuItem>
          </TextField>

          {evalStatus === 'GRADED' && (
            <TextField
              label="Grade / Score"
              type="number"
              size="small"
              fullWidth
              value={evalScore}
              onChange={e => setEvalScore(e.target.value)}
              placeholder="e.g. 85"
              inputProps={{ min: 0, max: 100 }}
              helperText="Enter score (e.g. 0 - 100)"
              required
            />
          )}
        </Box>

        <TextField
          label={
            evalStatus === 'REJECTED'
              ? 'Rejection Reason / Guidance for Student'
              : 'Teacher Feedback / Remarks'
          }
          multiline
          rows={4}
          fullWidth
          value={evalFeedback}
          onChange={e => setEvalFeedback(e.target.value)}
          placeholder={
            evalStatus === 'REJECTED'
              ? 'Explain why this KPI is rejected and how the student should improve the metric...'
              : 'Enter constructive feedback, milestone validation observations, or advice...'
          }
          helperText="Visible to the student."
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving} color="inherit">
          Cancel
        </Button>
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
          disabled={saving}
          startIcon={
            saving ? <CircularProgress size={16} /> : <RateReviewIcon />
          }
        >
          {saving
            ? 'Saving...'
            : evalStatus === 'GRADED'
              ? 'Submit Grade'
              : `Mark as ${evalStatus}`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

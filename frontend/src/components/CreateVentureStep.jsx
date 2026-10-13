import { useEffect, useRef, useState } from 'react'

import {
  Alert,
  Button,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'

import ProposalStepper from './ProposalStepper.jsx'
import {
  buildProposalPayload,
  getPrefilledData,
  steps,
} from './proposalFormConfig.js'

import {
  createProposal,
  getCampuses,
  getMyProposal,
} from '../api/proposal.js'

const getLatestReview = proposal =>
  proposal?.reviews?.length
    ? proposal.reviews[proposal.reviews.length - 1]
    : null

export default function CreateVentureStep({ onBack, onSubmitted }) {
  // rejected proposal is prefilled
  const [rejectedProposal, setRejectedProposal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  // Asked for only when the account has no campus to file the proposal
  // under.
  const [campuses, setCampuses] = useState(null)
  const [campus, setCampus] = useState('')
  const contentRef = useRef(null)

  useEffect(() => {
    let active = true

    getMyProposal()
      .then(proposal => {
        if (!active) return
        setRejectedProposal(proposal?.status === 'REJECTED' ? proposal : null)
      })
      .catch(() => {
        if (!active) return
        setRejectedProposal(null)
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const handleSubmit = async data => {
    setSubmitting(true)
    setError('')

    const result = await createProposal({
      ...buildProposalPayload(data),
      ...(campus && { campus }),
    })

    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      if (result.code === 'CAMPUS_REQUIRED' && !campuses) {
        setCampuses(await getCampuses())
      }
      // Submit is at the bottom of a long step; the message is at the top.
      contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <>
        <DialogTitle>Proposal submitted</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Your startup proposal has been submitted. Your startup will be set
            up once an admin approves it.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={onSubmitted}>
            Done
          </Button>
        </DialogActions>
      </>
    )
  }

  return (
    <>
      <DialogTitle>
        <IconButton onClick={onBack} disabled={submitting} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        Create a startup
      </DialogTitle>
      <DialogContent ref={contentRef}>
        {error && !campuses && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {campuses && (
          <Alert severity={campus ? 'info' : 'error'} sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              {campus
                ? 'Thanks. Press Submit again to send your proposal.'
                : 'Your account has no campus yet. Choose yours, then press Submit again.'}
            </Typography>
            <TextField
              select
              size="small"
              label="Campus"
              value={campus}
              onChange={e => setCampus(e.target.value)}
              sx={{ minWidth: 220, bgcolor: 'background.paper' }}
            >
              {campuses.map(option => (
                <MenuItem key={option._id} value={option._id}>
                  {option.name}
                </MenuItem>
              ))}
            </TextField>
          </Alert>
        )}

        {rejectedProposal && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              Proposal requires revision
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {getLatestReview(rejectedProposal)?.remarks ||
                'Your proposal was reviewed and requires updates. Please revise the form below and resubmit.'}
            </Typography>
          </Alert>
        )}

        {loading ? (
          <CircularProgress />
        ) : (
          <ProposalStepper
            steps={steps}
            initialData={getPrefilledData(rejectedProposal)}
            onSubmit={handleSubmit}
            isSubmitting={submitting}
          />
        )}
      </DialogContent>
    </>
  )
}

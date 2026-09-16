import { useEffect, useState } from 'react'

import {
  Alert,
  Button,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'

import ProposalStepper from './ProposalStepper.jsx'
import {
  buildProposalPayload,
  getPrefilledData,
  steps,
} from './proposalFormConfig.js'

import { createProposal, getMyProposal } from '../api/proposal.js'

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

    const result = await createProposal(buildProposalPayload(data))

    setSubmitting(false)

    if (result.error) {
      setError(result.error)
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
            Your venture proposal has been submitted. Your venture will be set
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
        Create a venture
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
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

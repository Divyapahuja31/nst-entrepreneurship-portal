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
  MenuItem,
  Stack,
  TextField,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'

import { applyToVenture, getVentures } from '../api/venture.js'

export default function JoinVentureStep({ onBack, onSubmitted }) {
  const [ventures, setVentures] = useState([])
  const [ventureId, setVentureId] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    let active = true

    getVentures()
      .then(data => {
        if (!active) return
        setVentures(data)
      })
      .catch(() => {
        if (!active) return
        setError('Could not load startups. Try again.')
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const handleApply = async () => {
    setSubmitting(true)
    setError('')

    const result = await applyToVenture(ventureId, message)

    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setSubmitted(true)
  }

  if (submitted) {
    const venture = ventures.find(item => item.id === ventureId)

    return (
      <>
        <DialogTitle>Request sent</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Your request to join {venture?.name} has been sent. You will become
            part of the startup once an admin approves it.
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
        Join a startup
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Pick the startup you want to be part of and send your request. An
          admin reviews every request.
        </DialogContentText>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <CircularProgress />
        ) : (
          <Stack spacing={2}>
            <TextField
              select
              required
              fullWidth
              label="Startup"
              value={ventureId}
              onChange={event => setVentureId(event.target.value)}
              helperText={
                ventures.length ? '' : 'There are no startups to join yet.'
              }
            >
              {ventures.map(venture => (
                <MenuItem key={venture.id} value={venture.id}>
                  {venture.name} — {venture.industry} ({venture.campus})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Why do you want to join?"
              value={message}
              onChange={event => setMessage(event.target.value)}
            />
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          onClick={handleApply}
          disabled={!ventureId || submitting}
        >
          Apply
        </Button>
      </DialogActions>
    </>
  )
}

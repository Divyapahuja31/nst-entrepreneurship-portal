import { useEffect, useState } from 'react'

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  TextField,
  Typography,
} from '@mui/material'

import {
  getCheckIn,
  refreshTranscript,
  saveCheckInNotes,
} from '../api/checkins'

const formatWhen = date =>
  new Date(date).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })

const formatTime = date =>
  new Date(date).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })

const WAITING_TEXT = {
  PENDING:
    'The transcript appears here once Google Meet has made it, usually within an hour of the meeting.',
  UNAVAILABLE:
    'Google Meet made no transcript of this meeting. To get one next time, turn on transcription in Meet (Activities, then Transcripts) when the meeting starts.',
}

function Transcript({ transcript }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        maxHeight: '45vh',
        overflowY: 'auto',
        p: 2,
        borderRadius: '14px',
        bgcolor: 'background.default',
      }}
    >
      {transcript.entries.map((entry, i) => (
        <Box key={`${entry.startTime}-${i}`}>
          <Typography variant="subtitle2" component="p">
            {entry.speaker}{' '}
            <Typography
              component="span"
              variant="caption"
              color="text.secondary"
            >
              {formatTime(entry.startTime)}
            </Typography>
          </Typography>
          <Typography variant="body2">{entry.text}</Typography>
        </Box>
      ))}
      {transcript.truncated && (
        <Typography variant="caption" color="text.secondary">
          This transcript is long, so only the start is kept here. The full one
          is in the mentor’s Google Drive.
        </Typography>
      )}
    </Box>
  )
}

// A past check-in's Meet transcript and the mentor's notes. The mentor can
// edit the notes and ask Meet for a transcript that hasn't arrived. Mount
// it only while open.
export default function TranscriptDialog({
  checkInId,
  canManage,
  onClose,
  onChanged,
}) {
  const [checkIn, setCheckIn] = useState(null)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    getCheckIn(checkInId).then(result => {
      if (result.error) {
        setError(result.error)
        return
      }
      setCheckIn(result.checkIn)
      setNotes(result.checkIn.notes ?? '')
    })
  }, [checkInId])

  const checkNow = async () => {
    setChecking(true)
    setMessage('')
    const result = await refreshTranscript(checkInId)
    setChecking(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setCheckIn(result.checkIn)
    if (result.settled) {
      onChanged()
    } else {
      setMessage('Nothing from Google Meet yet. The portal keeps checking.')
    }
  }

  const save = async () => {
    setSaving(true)
    const result = await saveCheckInNotes(checkInId, notes)
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setMessage('Notes saved.')
    onChanged()
  }

  const transcript = checkIn?.transcript
  const ready = transcript?.status === 'READY'

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {checkIn
          ? `Check-In on ${formatWhen(checkIn.scheduledAt)}`
          : 'Check-In'}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {message && (
          <Alert severity="info" sx={{ mb: 2 }} onClose={() => setMessage('')}>
            {message}
          </Alert>
        )}

        {!checkIn && !error && (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {checkIn && (
          <Box sx={{ display: 'grid', gap: 3 }}>
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              <Typography variant="subtitle1" component="h3">
                Transcript
              </Typography>
              {ready ? (
                <Transcript transcript={transcript} />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {WAITING_TEXT[transcript?.status] ?? WAITING_TEXT.PENDING}{' '}
                  {canManage && (
                    <Button
                      variant="text"
                      size="small"
                      loading={checking}
                      onClick={checkNow}
                      sx={{ p: 0, minWidth: 0, verticalAlign: 'baseline' }}
                    >
                      Check Now
                    </Button>
                  )}
                </Typography>
              )}
            </Box>

            <Divider />

            <Box sx={{ display: 'grid', gap: 1.5 }}>
              <Typography variant="subtitle1" component="h3">
                Mentor Notes
              </Typography>
              {canManage ? (
                <TextField
                  label="Notes"
                  multiline
                  minRows={4}
                  value={notes}
                  onChange={event => setNotes(event.target.value)}
                  helperText="What you discussed and agreed. The founders can read these."
                />
              ) : (
                <Typography
                  variant="body2"
                  color={checkIn.notes ? 'text.primary' : 'text.secondary'}
                  sx={{ whiteSpace: 'pre-wrap' }}
                >
                  {checkIn.notes || 'No notes from the mentor yet.'}
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>
        {canManage && checkIn && (
          <Button variant="contained" loading={saving} onClick={save}>
            Save Notes
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

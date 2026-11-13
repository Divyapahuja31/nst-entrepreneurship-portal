import { useEffect, useState } from 'react'
import { Link } from 'react-router'

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
  addKpiBot,
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
          is in the Google Drive of whoever hosted the meeting.
        </Typography>
      )}
    </Box>
  )
}

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

// What the KPI bot made of the transcript: the KPIs it recommended, and
// the goals it couldn't give a founder, so the mentor can add those by hand.
// A meeting that isn't a bi-weekly session has the bot only once someone
// adds it (`onAdd`).
function KpiBotSummary({ kpiBot, ready, adding, onAdd, canRunDemoBot }) {
  if (!kpiBot || kpiBot.mode === 'OFF') {
    return (
      <Typography variant="body2" color="text.secondary">
        The KPI bot isn't on for this meeting. Add it to get recommended KPIs
        from the transcript.{' '}
        <Button
          variant="text"
          size="small"
          loading={adding}
          onClick={onAdd}
          sx={{ p: 0, minWidth: 0, verticalAlign: 'baseline' }}
        >
          Add KPI Bot
        </Button>
      </Typography>
    )
  }
  if (kpiBot.status === 'PENDING') {
    return (
      <Typography variant="body2" color="text.secondary">
        {ready
          ? "The KPI bot hasn't read this transcript yet."
          : 'The KPI bot reads the transcript once it is ready.'}
      </Typography>
    )
  }
  if (kpiBot.status === 'FAILED') {
    return (
      <Alert severity="warning">
        The KPI bot couldn't read this transcript. It tries again on its own for
        about a day and a half; add the KPIs by hand if none appear.
      </Alert>
    )
  }
  if (kpiBot.status === 'SKIPPED') {
    return (
      <Typography variant="body2" color="text.secondary">
        The KPI bot recommended nothing: {kpiBot.reason}.
      </Typography>
    )
  }
  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      <Typography variant="body2">
        {kpiBot.created
          ? `Recommended ${plural(kpiBot.created, 'KPI')} to the founders.` +
            (canRunDemoBot
              ? ''
              : ' They or you can accept or dismiss each one on the KPIs page.')
          : 'Recommended no KPIs.'}
      </Typography>
      {canRunDemoBot && kpiBot.created > 0 && (
        <Button
          component={Link}
          to="/kpis"
          variant="outlined"
          sx={{ justifySelf: 'start' }}
        >
          Review Recommended KPIs
        </Button>
      )}
      {kpiBot.skipped.length > 0 && (
        <>
          <Typography variant="body2" color="text.secondary">
            Not given to anyone ({kpiBot.skipped.length}). Add any that are real
            goals by hand:
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'grid', gap: 0.5 }}>
            {kpiBot.skipped.map((goal, i) => (
              <Typography
                component="li"
                variant="body2"
                key={`${goal.speaker}-${goal.title}-${i}`}
              >
                {goal.speaker}: {goal.title}{' '}
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                >
                  ({goal.reason})
                </Typography>
              </Typography>
            ))}
          </Box>
        </>
      )}
    </Box>
  )
}

// A past check-in's Meet transcript and notes. Whoever ran it (the mentor,
// or a programme meeting's staff) edits the notes and can ask Meet for a
// transcript that hasn't arrived. Mount it only while open.
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
  const [adding, setAdding] = useState(false)

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

  const canRunDemoBot = Boolean(checkIn?.canRunDemoBot)
  const canRunBot = canManage || canRunDemoBot
  const waitingForBot =
    canRunDemoBot &&
    checkIn?.transcript?.status === 'READY' &&
    checkIn?.kpiBot?.status === 'PENDING' &&
    ['ON', 'AUTO'].includes(checkIn.kpiBot.mode)

  useEffect(() => {
    if (!waitingForBot) {
      return undefined
    }
    let stopped = false
    let timer
    const refreshBot = async () => {
      const result = await getCheckIn(checkInId)
      if (stopped) {
        return
      }
      const kpiBot = result.checkIn?.kpiBot
      if (kpiBot && kpiBot.status !== 'PENDING') {
        setCheckIn(current => ({ ...current, kpiBot }))
        return
      }
      timer = setTimeout(refreshBot, 3000)
    }
    timer = setTimeout(refreshBot, 1000)
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [checkInId, waitingForBot])

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

  const addBot = async () => {
    setAdding(true)
    setError('')
    setMessage('')
    const result = await addKpiBot(checkInId)
    setAdding(false)
    const kpiBot = result.checkIn?.kpiBot ?? result.kpiBot
    if (result.error && !['ON', 'AUTO'].includes(kpiBot?.mode)) {
      setError(result.error)
      return
    }
    setCheckIn(current => ({ ...current, kpiBot }))
    if (!canRunDemoBot) {
      setMessage(
        'KPI bot added. Its recommendations appear once the transcript is read.'
      )
    }
    onChanged()
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
            {canRunBot &&
              transcript?.status !== 'UNAVAILABLE' &&
              checkIn.status !== 'CANCELLED' && (
                <Box sx={{ display: 'grid', gap: 1.5 }}>
                  <Typography variant="subtitle1" component="h3">
                    KPI Bot
                  </Typography>
                  <KpiBotSummary
                    kpiBot={checkIn.kpiBot}
                    ready={ready}
                    adding={adding}
                    onAdd={addBot}
                    canRunDemoBot={canRunDemoBot}
                  />
                </Box>
              )}

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
                Notes
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
                  {checkIn.notes || 'No notes yet.'}
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

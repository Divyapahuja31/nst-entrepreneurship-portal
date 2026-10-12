import { useEffect, useState } from 'react'

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material'

import {
  GOOGLE_CODES,
  calendarConnectUrl,
  disconnectCalendar,
  getCalendarStatus,
  moveCheckIn,
  scheduleCheckIn,
} from '../api/checkins'

const DURATIONS = [15, 30, 45, 60, 90]

// A Date as the value of a datetime-local field, in the browser's time zone.
const toLocalInput = date => {
  const d = new Date(date)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
}

// Tomorrow at 10:00, a sensible first suggestion.
const defaultStart = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(10, 0, 0, 0)
  return toLocalInput(d)
}

// Why the time can't be used, or '' when it can.
const timeProblem = value => {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) {
    return 'Choose a date and time.'
  }
  if (date <= new Date()) {
    return 'Choose a time in the future.'
  }
  return ''
}

function ConnectCalendar({ status }) {
  const returnTo = window.location.pathname
  return (
    <>
      <DialogContentText sx={{ mb: 2 }}>
        {status?.needsReconnect
          ? 'Google no longer accepts the portal’s access to your calendar. Connect it again to schedule or change check-ins.'
          : 'Check-ins go on your Google Calendar with a Meet link, and every founder gets the invite on theirs. Connect the Google account you sign in to the portal with.'}
      </DialogContentText>
      <Button
        variant="contained"
        component="a"
        href={calendarConnectUrl(returnTo)}
      >
        Connect Google Calendar
      </Button>
    </>
  )
}

const MINUTE_MS = 60 * 1000

const formatWhen = date =>
  new Date(date).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })

// The startup's programme session the chosen time clashes with, if any.
const programmeClash = (sessions, startAt, duration) => {
  const start = new Date(startAt).getTime()
  const end = start + duration * MINUTE_MS
  return sessions.find(s => {
    const from = new Date(s.scheduledAt).getTime()
    return from < end && start < from + s.durationMinutes * MINUTE_MS
  })
}

// Schedules a check-in for a startup, or moves `checkIn` when given. Asks
// the mentor to connect their Google Calendar first if they haven't. Mount
// it only while open, so each opening starts fresh. `programmeSessions` are
// the startup's upcoming programme meetings, to point out a clash.
export default function ScheduleCheckInDialog({
  onClose,
  onDone,
  venture,
  checkIn,
  programmeSessions = [],
}) {
  const moving = Boolean(checkIn)
  const [status, setStatus] = useState(null)
  const [startAt, setStartAt] = useState(() =>
    checkIn ? toLocalInput(checkIn.scheduledAt) : defaultStart()
  )
  const [duration, setDuration] = useState(checkIn?.durationMinutes ?? 30)
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getCalendarStatus().then(result =>
      setStatus(result.error ? { connected: false } : result)
    )
  }, [])

  const problem = timeProblem(startAt)
  const connected = status?.connected && !status.needsReconnect
  const clash = problem
    ? null
    : programmeClash(programmeSessions, startAt, duration)

  const save = async () => {
    setTouched(true)
    if (problem) {
      return
    }
    setSaving(true)
    setError('')
    const payload = {
      startAt: new Date(startAt).toISOString(),
      durationMinutes: duration,
    }
    const result = moving
      ? await moveCheckIn(checkIn._id, payload)
      : await scheduleCheckIn({ ...payload, ventureId: venture.id })
    setSaving(false)
    if (GOOGLE_CODES.includes(result.code)) {
      setStatus({
        connected: false,
        needsReconnect: result.code === 'GOOGLE_RECONNECT',
      })
      return
    }
    if (result.error) {
      setError(result.error)
      return
    }
    onDone()
  }

  const disconnect = async () => {
    const result = await disconnectCalendar()
    if (result.error) {
      setError(result.error)
      return
    }
    setStatus({ connected: false })
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {moving ? 'Move Check-In' : `Schedule a Check-In with ${venture.name}`}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!status && (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {status && !connected && <ConnectCalendar status={status} />}

        {connected && (
          <Box sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <TextField
              label="Date and time"
              type="datetime-local"
              value={startAt}
              onChange={event => setStartAt(event.target.value)}
              onBlur={() => setTouched(true)}
              error={touched && Boolean(problem)}
              helperText={touched && problem}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            {clash && (
              <Alert severity="warning">
                This clashes with the startup’s programme session on{' '}
                {formatWhen(clash.scheduledAt)}.
              </Alert>
            )}
            <TextField
              select
              label="Length"
              value={duration}
              onChange={event => setDuration(event.target.value)}
            >
              {DURATIONS.map(minutes => (
                <MenuItem key={minutes} value={minutes}>
                  {minutes} minutes
                </MenuItem>
              ))}
            </TextField>
            <Typography variant="body2" color="text.secondary">
              {moving
                ? 'The founders get the new time on their calendars.'
                : 'Goes on your Google Calendar with a Meet link. Every founder of the startup gets the invite.'}{' '}
              Calendar: {status.googleEmail}.{' '}
              <Button
                variant="text"
                size="small"
                onClick={disconnect}
                sx={{ p: 0, minWidth: 0, verticalAlign: 'baseline' }}
              >
                Disconnect
              </Button>
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        {connected && (
          <Button variant="contained" loading={saving} onClick={save}>
            {moving ? 'Move Check-In' : 'Schedule'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

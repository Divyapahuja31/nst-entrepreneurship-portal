import { useEffect, useState } from 'react'
import { useRevalidator, useSearchParams } from 'react-router'
import { canManageCheckIns } from '@nst/shared/permissions.js'

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from '@mui/material'

import { cancelCheckIn, endCheckInSeries } from '../api/checkins'
import useAccess from '../hooks/useAccess'
import EmptyState from './EmptyState'
import ScheduleCheckInDialog from './ScheduleCheckInDialog'
import SectionCard from './SectionCard'
import StatusPill from './StatusPill'
import { ChatIcon } from './icons'

// What Google said when the mentor came back from connecting their
// calendar (?calendar=<outcome>).
const CALENDAR_OUTCOMES = {
  connected: {
    severity: 'success',
    text: 'Google Calendar connected. You can schedule check-ins now.',
  },
  denied: {
    severity: 'info',
    text: 'Google Calendar wasn’t connected. Connect it whenever you’re ready.',
  },
  'wrong-account': {
    severity: 'error',
    text: 'Connect the Google account you sign in to the portal with.',
  },
  'missing-access': {
    severity: 'error',
    text: 'Allow both Calendar and Meet access when Google asks, so check-ins and their transcripts work.',
  },
  failed: {
    severity: 'error',
    text: 'Google Calendar couldn’t be connected. Try again.',
  },
}

const MINUTE_MS = 60 * 1000

// Upcoming until it ends, so the Meet link stays during the meeting. It can
// be moved or cancelled only before it starts.
const isUpcoming = checkIn =>
  checkIn.status === 'SCHEDULED' &&
  new Date(checkIn.scheduledAt).getTime() +
    checkIn.durationMinutes * MINUTE_MS >
    Date.now()

const hasStarted = checkIn => new Date(checkIn.scheduledAt) <= new Date()

const statusOf = checkIn => {
  if (isUpcoming(checkIn) && hasStarted(checkIn))
    return { label: 'In progress', tint: 'green' }
  if (isUpcoming(checkIn)) return { label: 'Scheduled', tint: 'blue' }
  if (checkIn.status === 'HELD') return { label: 'Held', tint: 'green' }
  if (checkIn.status === 'NOT_HELD') return { label: 'Not held', tint: 'orange' }
  if (checkIn.status === 'CANCELLED')
    return { label: 'Cancelled', tint: 'gray', plain: true }
  return { label: 'Past', tint: 'gray', plain: true }
}

const formatWhen = date =>
  new Date(date).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })

function CheckInRow({ checkIn, showVenture, canManage, onMove, onCancel }) {
  const upcoming = isUpcoming(checkIn)
  const details = [
    checkIn.cycle_number && `Cycle ${checkIn.cycle_number}`,
    `${checkIn.durationMinutes} min`,
    showVenture && checkIn.venture?.name,
    checkIn.series && 'Repeats',
  ].filter(Boolean)

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 2,
        p: 2,
        borderRadius: '14px',
        bgcolor: 'background.default',
      }}
    >
      <Box sx={{ flexGrow: 1, minWidth: 180 }}>
        <Typography variant="subtitle1" component="p">
          {formatWhen(checkIn.scheduledAt)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {details.join(' · ')}
        </Typography>
      </Box>
      <StatusPill {...statusOf(checkIn)} />
      {upcoming && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {checkIn.meetUrl && (
            <Button
              variant="outlined"
              component="a"
              href={checkIn.meetUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Join Meet
            </Button>
          )}
          {canManage && !hasStarted(checkIn) && (
            <>
              <Button variant="text" onClick={() => onMove(checkIn)}>
                Move
              </Button>
              <Button
                variant="text"
                color="error"
                onClick={() => onCancel(checkIn)}
              >
                Cancel
              </Button>
            </>
          )}
        </Box>
      )}
    </Box>
  )
}

function Group({ title, children }) {
  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      <Typography variant="subtitle2" component="h3" color="text.secondary">
        {title}
      </Typography>
      {children}
    </Box>
  )
}

// Asks before cancelling one check-in or ending a recurring one.
function ConfirmDialog({ confirm, busy, onClose, onConfirm }) {
  const series = confirm?.kind === 'series'
  return (
    <Dialog open={Boolean(confirm)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {series ? 'End Recurring Check-Ins?' : 'Cancel This Check-In?'}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {series
            ? 'Every upcoming check-in in the series is cancelled. Past ones stay. The founders get one update from Google Calendar.'
            : 'It comes off your calendar and the founders get a cancellation from Google Calendar.'}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          Keep {series ? 'Them' : 'It'}
        </Button>
        <Button
          variant="outlined"
          color="error"
          loading={busy}
          onClick={onConfirm}
        >
          {series ? 'End Series' : 'Cancel Check-In'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const emptyText = (canManage, isStaff) => {
  if (canManage) {
    return 'Schedule one and it goes on your Google Calendar, with a Meet link, and on every founder’s calendar.'
  }
  if (isStaff) {
    return 'Check-ins appear here once the startup’s mentor schedules them.'
  }
  return 'Your mentor hasn’t scheduled a check-in yet. It will appear here, and on your Google Calendar, once they do.'
}

// A startup's check-ins (or, without `venture`, a founder's across
// startups). The startup's mentor schedules, moves and cancels them here.
export default function CheckInsSection({ checkIns, venture, showVenture }) {
  const { actor, isStaff } = useAccess()
  const revalidator = useRevalidator()
  const [searchParams, setSearchParams] = useSearchParams()
  // The mentor arrives as an id or as { id, username, email }.
  const mentorId = venture?.mentor?.id ?? venture?.mentor
  const canManage = Boolean(venture) && canManageCheckIns(actor, mentorId)

  const [outcome] = useState(
    () => CALENDAR_OUTCOMES[searchParams.get('calendar')]
  )
  const [dialog, setDialog] = useState(() =>
    canManage && outcome === CALENDAR_OUTCOMES.connected
      ? { checkIn: null }
      : null
  )
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Shown once; a reload shouldn't repeat it.
  useEffect(() => {
    if (searchParams.has('calendar')) {
      setSearchParams(
        params => {
          params.delete('calendar')
          return params
        },
        { replace: true }
      )
    }
  }, [searchParams, setSearchParams])

  const all = checkIns ?? []
  const upcoming = all.filter(isUpcoming)
  const past = all.filter(c => !isUpcoming(c)).reverse()
  const activeSeries = upcoming.find(c => c.series)?.series

  const done = () => {
    setDialog(null)
    revalidator.revalidate()
  }

  const runConfirm = async () => {
    setBusy(true)
    const result =
      confirm.kind === 'series'
        ? await endCheckInSeries(confirm.id)
        : await cancelCheckIn(confirm.id)
    setBusy(false)
    setConfirm(null)
    if (result.error) {
      setError(result.error)
      return
    }
    setError('')
    revalidator.revalidate()
  }

  const row = checkIn => (
    <CheckInRow
      key={checkIn._id}
      checkIn={checkIn}
      showVenture={showVenture}
      // A founder's record can hold an earlier startup's check-ins.
      canManage={
        canManage &&
        String(checkIn.venture?._id ?? checkIn.venture) === String(venture.id)
      }
      onMove={c => setDialog({ checkIn: c })}
      onCancel={c => setConfirm({ kind: 'one', id: c._id })}
    />
  )

  return (
    <SectionCard
      icon={ChatIcon}
      title="Check-Ins"
      subtitle="Bi-weekly meetings with the mentor on Google Meet."
      action={
        canManage && (
          <Button
            variant="contained"
            onClick={() => setDialog({ checkIn: null })}
          >
            Schedule Check-In
          </Button>
        )
      }
    >
      <Box sx={{ display: 'grid', gap: 3 }}>
        {outcome && canManage && (
          <Alert severity={outcome.severity}>{outcome.text}</Alert>
        )}
        {error && (
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {checkIns === null && (
          <Alert severity="warning">
            Check-ins could not be loaded. Refresh the page to try again.
          </Alert>
        )}

        {checkIns && !all.length && (
          <EmptyState
            icon={ChatIcon}
            title="No check-ins yet"
            description={emptyText(canManage, isStaff)}
          />
        )}

        {upcoming.length > 0 && (
          <Group title="Upcoming">
            {canManage && activeSeries && (
              <Typography variant="body2" color="text.secondary">
                Repeats every 2 weeks.{' '}
                <Button
                  variant="text"
                  color="error"
                  size="small"
                  onClick={() => setConfirm({ kind: 'series', id: activeSeries })}
                  sx={{ p: 0, minWidth: 0, verticalAlign: 'baseline' }}
                >
                  End Series
                </Button>
              </Typography>
            )}
            {upcoming.map(row)}
          </Group>
        )}

        {past.length > 0 && <Group title="Past">{past.map(row)}</Group>}
      </Box>

      {canManage && dialog && (
        <ScheduleCheckInDialog
          checkIn={dialog.checkIn}
          venture={venture}
          onClose={() => setDialog(null)}
          onDone={done}
        />
      )}
      <ConfirmDialog
        confirm={confirm}
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
      />
    </SectionCard>
  )
}

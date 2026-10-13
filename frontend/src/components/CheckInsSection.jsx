import { useEffect, useState } from 'react'
import { useRevalidator, useSearchParams } from 'react-router'
import { canManageCheckIns, canRunCheckIn } from '@nst/shared/permissions.js'

import {
  Alert,
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from '@mui/material'

import {
  GOOGLE_CODES,
  calendarConnectUrl,
  cancelCheckIn,
  endCheckInSeries,
  getCalendarStatus,
  scheduleCheckIn,
} from '../api/checkins'
import useAccess from '../hooks/useAccess'
import EmptyState from './EmptyState'
import ScheduleCheckInDialog from './ScheduleCheckInDialog'
import SectionCard from './SectionCard'
import StatusPill from './StatusPill'
import TranscriptDialog from './TranscriptDialog'
import { CALENDAR_OUTCOMES } from './calendarOutcomes'
import { ChatIcon } from './icons'

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
  if (checkIn.status === 'NOT_HELD')
    return { label: 'Not held', tint: 'orange' }
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

const TRANSCRIPT_LABELS = {
  PENDING: 'Transcript pending',
  READY: 'Transcript ready',
  UNAVAILABLE: 'No transcript',
}

function CheckInRow({
  checkIn,
  showVenture,
  canManage,
  onMove,
  onCancel,
  onOpen,
}) {
  const upcoming = isUpcoming(checkIn)
  const happened = !upcoming && checkIn.status !== 'CANCELLED'
  const details = [
    // Only programme sessions follow the bi-weekly cycles.
    checkIn.session && checkIn.cycle_number && `Cycle ${checkIn.cycle_number}`,
    `${checkIn.durationMinutes} min`,
    showVenture && checkIn.venture?.name,
    checkIn.session &&
      `Programme session with ${(checkIn.staff ?? []).map(s => s.username).join(', ')}`,
    checkIn.series && 'Repeats',
    happened && TRANSCRIPT_LABELS[checkIn.transcript?.status],
    happened && checkIn.notes && 'Notes',
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
      {happened && (
        <Button variant="outlined" onClick={() => onOpen(checkIn)}>
          Transcript
        </Button>
      )}
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
    return 'Meet now, or schedule one for later. It goes on your Google Calendar with a Meet link, and every founder gets the invite.'
  }
  if (isStaff) {
    return 'Check-ins appear here once a programme session or the startup’s mentor schedules them.'
  }
  return 'Nothing is scheduled yet. Meetings with your mentor and programme sessions appear here, and on your Google Calendar.'
}

// A startup's check-ins (or, without `venture`, a founder's across
// startups): programme sessions and the mentor's own. The startup's mentor
// schedules, moves and cancels their own ones here.
export default function CheckInsSection({
  checkIns,
  venture,
  showVenture,
  title = 'Check-Ins',
  subtitle = 'Meetings on Google Meet.',
}) {
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
  const [open, setOpen] = useState(null)
  const [busy, setBusy] = useState(false)
  const [starting, setStarting] = useState(false)
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

  // A connection made before the portal could turn transcription on.
  const [needsTranscriptAccess, setNeedsTranscriptAccess] = useState(false)
  useEffect(() => {
    if (!canManage) {
      return undefined
    }
    let current = true
    getCalendarStatus().then(status => {
      if (current) {
        setNeedsTranscriptAccess(
          Boolean(status?.connected) &&
            !status.needsReconnect &&
            status.autoTranscripts === false
        )
      }
    })
    return () => {
      current = false
    }
  }, [canManage])

  const [showCancelled, setShowCancelled] = useState(false)

  const all = checkIns ?? []
  const upcoming = all.filter(isUpcoming)
  // Cancelled ones, even those that would have been next month, are kept out
  // of the way: they aren't happening and they haven't happened.
  const past = all
    .filter(c => !isUpcoming(c) && c.status !== 'CANCELLED')
    .reverse()
  const cancelled = all.filter(c => c.status === 'CANCELLED').reverse()
  const activeSeries = upcoming.find(c => c.series)?.series
  // The startup's programme sessions, so the mentor can see when scheduling
  // one of their own lands in a cycle that already has one.
  const programmeSessions = upcoming.filter(c => c.session)

  const done = () => {
    setDialog(null)
    revalidator.revalidate()
  }

  // Meet Now: a check-in starting this minute. Meet opens in a new tab, which
  // is opened before the request so the browser doesn't block it as a
  // pop-up; founders get the invite from Google Calendar.
  const meetNow = async () => {
    const tab = window.open('', '_blank')
    setStarting(true)
    setError('')
    const result = await scheduleCheckIn({
      ventureId: venture.id,
      startNow: true,
      durationMinutes: 30,
    })
    setStarting(false)
    if (result.error) {
      tab?.close()
      if (GOOGLE_CODES.includes(result.code)) {
        // The dialog asks them to connect their calendar.
        setDialog({ checkIn: null })
      } else {
        setError(result.error)
      }
      return
    }
    const meetUrl = result.checkIns?.[0]?.meetUrl
    if (tab && meetUrl) {
      tab.opener = null
      tab.location.href = meetUrl
    } else {
      tab?.close()
    }
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

  // A founder's record can hold an earlier startup's check-ins, and
  // programme meetings change only from the Programme page.
  const managesRow = checkIn =>
    canManage &&
    !checkIn.session &&
    String(checkIn.venture?._id ?? checkIn.venture) === String(venture.id)
  // Who writes a meeting's notes: its mentor, or a programme meeting's staff.
  const runsRow = checkIn =>
    checkIn.session
      ? canRunCheckIn(actor, checkIn.staff ?? [])
      : canManageCheckIns(actor, checkIn.mentor?._id ?? checkIn.mentor)

  const row = checkIn => (
    <CheckInRow
      key={checkIn._id}
      checkIn={checkIn}
      showVenture={showVenture}
      canManage={managesRow(checkIn)}
      onMove={c => setDialog({ checkIn: c })}
      onCancel={c => setConfirm({ kind: 'one', id: c._id })}
      onOpen={c => setOpen({ id: c._id, canManage: runsRow(c) })}
    />
  )

  return (
    <SectionCard
      icon={ChatIcon}
      title={title}
      subtitle={subtitle}
      action={
        canManage && (
          <>
            <Button
              variant="outlined"
              onClick={() => setDialog({ checkIn: null })}
            >
              Schedule
            </Button>
            <Button variant="contained" loading={starting} onClick={meetNow}>
              Meet Now
            </Button>
          </>
        )
      }
    >
      <Box sx={{ display: 'grid', gap: 3 }}>
        {outcome && canManage && (
          <Alert severity={outcome.severity}>{outcome.text}</Alert>
        )}
        {needsTranscriptAccess && (
          <Alert
            severity="info"
            action={
              <Button
                size="small"
                component="a"
                href={calendarConnectUrl(window.location.pathname)}
              >
                Reconnect
              </Button>
            }
          >
            Reconnect Google so your check-ins transcribe themselves. Until
            then, turn transcripts on in each meeting.
          </Alert>
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

        {checkIns && !upcoming.length && !past.length && (
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
                  onClick={() =>
                    setConfirm({ kind: 'series', id: activeSeries })
                  }
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

        {cancelled.length > 0 && (
          <Box sx={{ display: 'grid', gap: 1.5 }}>
            <Box>
              <Button
                variant="text"
                onClick={() => setShowCancelled(!showCancelled)}
              >
                {showCancelled
                  ? 'Hide Cancelled'
                  : `Show ${cancelled.length} Cancelled`}
              </Button>
            </Box>
            <Collapse in={showCancelled}>
              <Box sx={{ display: 'grid', gap: 1.5 }}>{cancelled.map(row)}</Box>
            </Collapse>
          </Box>
        )}
      </Box>

      {canManage && dialog && (
        <ScheduleCheckInDialog
          checkIn={dialog.checkIn}
          venture={venture}
          programmeSessions={programmeSessions}
          onClose={() => setDialog(null)}
          onDone={done}
        />
      )}
      {open && (
        <TranscriptDialog
          checkInId={open.id}
          canManage={open.canManage}
          onClose={() => setOpen(null)}
          onChanged={() => revalidator.revalidate()}
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

import { useState } from 'react'
import { useLoaderData } from 'react-router'

import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material'

import {
  clearSessions,
  saveProgramme,
  saveReportSchedule,
  sessionAction,
} from '../../api/programme'
import EmptyState from '../../components/EmptyState'
import PageHeader from '../../components/PageHeader'
import SectionCard from '../../components/SectionCard'
import StatusPill from '../../components/StatusPill'
import {
  LIMITS,
  TIME_ZONES,
  clockOf,
  dayOf,
  invitedCount,
  minutesOf,
  plural,
  sessionStatus,
  slotsPerStaff,
} from '../../components/programme/helpers'
import {
  HostNotice,
  InvitesCard,
  Meetings,
  StaffCard,
} from '../../components/programme/parts'
import useCalendarOutcome from '../../components/programme/useCalendarOutcome'
import { CalendarIcon, DocTextIcon } from '../../components/icons'

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

const NUMBER_FIELDS = [
  'weekday',
  'slotMinutes',
  'gapMinutes',
  'firstGapMinutes',
  'leadDays',
]

const DAY_MS = 24 * 60 * 60 * 1000

const problemsOf = form => {
  const problems = {}
  if (!form.startDate) {
    problems.startDate = 'Choose the date sessions start'
  }
  if (!form.startTime) {
    problems.startTime = 'Choose a start time'
  }
  if (!form.endTime) {
    problems.endTime = 'Choose an end time'
  } else if (
    form.startTime &&
    minutesOf(form.endTime) <= minutesOf(form.startTime)
  ) {
    problems.endTime = 'The session must end after it starts'
  }
  for (const [field, min, max, message, slotsOnly] of LIMITS) {
    const value = form[field]
    const shown = !slotsOnly || form.mode === 'SLOTS'
    if (shown && !(Number.isInteger(value) && value >= min && value <= max)) {
      problems[field] = message
    }
  }
  if (!form.timeZone) {
    problems.timeZone = 'Choose a valid time zone'
  }
  if (!form.staff.length) {
    problems.staff = 'Add at least one person to run the sessions'
  }
  return problems
}

const formFrom = programme => ({
  ...programme,
  startDate: programme.startDate ?? '',
  excludedVentures: new Set(programme.excludedVentures),
  excludedFounders: new Set(programme.excludedFounders),
})

const payloadOf = form => ({
  ...form,
  excludedVentures: [...form.excludedVentures],
  excludedFounders: [...form.excludedFounders],
})

// The form as one string, lists sorted, to tell whether anything changed.
const snapshotOf = form =>
  JSON.stringify(
    Object.entries(payloadOf(form))
      .map(([key, value]) => [
        key,
        Array.isArray(value) ? [...value].sort() : value,
      ])
      .sort(([a], [b]) => a.localeCompare(b))
  )

// ------------------------------------------------------------ settings

// A YYYY-MM-DD day as "16 Oct 2026".
const formatDay = ymd =>
  new Date(`${ymd}T00:00:00Z`).toLocaleDateString(undefined, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  })

// When the bi-weekly reports start. Saved on its own: the reports can open
// before or after the sessions, and no Google Calendar is needed.
function ReportsCard({ reports, onSaved }) {
  const [startDate, setStartDate] = useState(reports.startDate ?? '')
  const [timeZone, setTimeZone] = useState(reports.timeZone)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const changed =
    startDate !== (reports.startDate ?? '') || timeZone !== reports.timeZone

  const save = async () => {
    setSaving(true)
    setError(null)
    const result = await saveReportSchedule({ startDate, timeZone })
    setSaving(false)
    if (result.error) {
      setError(result)
      return
    }
    onSaved(result.page)
  }

  let subtitle =
    'Not set yet, so each startup’s reports count from the day it was created.'
  if (reports.startDate) {
    subtitle = `Cycle 1 of every startup’s reports opens on ${formatDay(reports.startDate)}, whenever the sessions start.`
  } else if (reports.startsAt) {
    // Midnight in the sessions' zone, which may be another day here.
    subtitle = `Not set yet, so the reports follow the sessions: cycle 1 starts on ${new Date(
      reports.startsAt
    ).toLocaleDateString(undefined, {
      dateStyle: 'medium',
      timeZone: reports.timeZone,
    })}.`
  }
  const fieldError = field => (error?.field === field ? error.error : '')

  return (
    <SectionCard
      icon={DocTextIcon}
      title="Bi-weekly Reports"
      subtitle={subtitle}
    >
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(3, minmax(0, 1fr))',
          },
          alignItems: 'start',
        }}
      >
        <TextField
          type="date"
          label="Reports start"
          value={startDate}
          onChange={e => {
            setError(null)
            setStartDate(e.target.value)
          }}
          error={Boolean(fieldError('startDate'))}
          helperText={
            fieldError('startDate') ||
            'Cycle 1 opens this day. Reports already filed keep their cycle.'
          }
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <Autocomplete
          disableClearable
          options={[...new Set([timeZone, ...TIME_ZONES])]}
          value={timeZone}
          onChange={(_, zone) => {
            setError(null)
            setTimeZone(zone)
          }}
          renderInput={params => (
            <TextField
              {...params}
              label="Time zone"
              error={Boolean(fieldError('timeZone'))}
              helperText={fieldError('timeZone') || 'Type to search'}
            />
          )}
        />
        <Box sx={{ pt: 1 }}>
          <Button
            variant="contained"
            loading={saving}
            disabled={!startDate || !changed}
            onClick={save}
          >
            Save Report Dates
          </Button>
        </Box>
      </Box>
      {error && !error.field && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error.error}
        </Alert>
      )}
    </SectionCard>
  )
}

function SettingsCard({ form, setField, fieldError, configured, saved, host }) {
  const slotMode = form.mode === 'SLOTS'
  const number = (field, label, helperText) => (
    <TextField
      type="number"
      label={label}
      value={form[field]}
      onChange={e => setField(field, Number(e.target.value))}
      error={Boolean(fieldError(field))}
      helperText={fieldError(field) || helperText}
      slotProps={{ htmlInput: { min: 0 } }}
    />
  )
  const startMoves = configured && form.startDate !== saved.startDate

  return (
    <SectionCard
      icon={CalendarIcon}
      title="Calendar"
      subtitle={
        host.connected
          ? `Sessions go on ${host.email}’s Google Calendar, every other week.`
          : 'One session every other week, for every startup.'
      }
    >
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(3, minmax(0, 1fr))',
          },
        }}
      >
        <TextField
          type="date"
          label="Sessions start"
          value={form.startDate}
          onChange={e => setField('startDate', e.target.value)}
          error={Boolean(fieldError('startDate'))}
          helperText={
            fieldError('startDate') ||
            (startMoves
              ? 'Changing this moves every session.'
              : 'The first session is on the chosen day, on or after this date.')
          }
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          select
          label="Day"
          value={form.weekday}
          onChange={e => setField('weekday', Number(e.target.value))}
        >
          {WEEKDAYS.map((day, i) => (
            <MenuItem key={day} value={i}>
              {day}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Mode"
          value={form.mode}
          onChange={e => setField('mode', e.target.value)}
          helperText={
            slotMode
              ? 'Each startup meets one staff member in its own slot.'
              : 'Everyone in one meeting.'
          }
        >
          <MenuItem value="SLOTS">Slots</MenuItem>
          <MenuItem value="GROUP">Group</MenuItem>
        </TextField>
        <TextField
          type="time"
          label="Starts"
          value={form.startTime}
          onChange={e => setField('startTime', e.target.value)}
          error={Boolean(fieldError('startTime'))}
          helperText={fieldError('startTime')}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          type="time"
          label="Ends"
          value={form.endTime}
          onChange={e => setField('endTime', e.target.value)}
          error={Boolean(fieldError('endTime'))}
          helperText={fieldError('endTime')}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <Autocomplete
          disableClearable
          options={[...new Set([form.timeZone, ...TIME_ZONES])]}
          value={form.timeZone}
          onChange={(_, zone) => setField('timeZone', zone)}
          renderInput={params => (
            <TextField
              {...params}
              label="Time zone"
              error={Boolean(fieldError('timeZone'))}
              helperText={fieldError('timeZone') || 'Type to search'}
            />
          )}
        />
        {slotMode && number('slotMinutes', 'Slot length (minutes)')}
        {slotMode && number('gapMinutes', 'Gap between slots (minutes)')}
        {slotMode &&
          number('firstGapMinutes', 'Gap before the first slot (minutes)')}
        {number(
          'leadDays',
          'Schedule ahead (days)',
          'Meetings are drawn, invited and emailed this many days before.'
        )}
      </Box>
    </SectionCard>
  )
}

// ------------------------------------------------------------ sessions

// The line under a session's date: its number and cycle, then what happens
// next to it.
const detailOf = (session, { next, leadDays, timeZone }) => {
  const parts = [`Session ${session.number}`]
  if (session.cycle_number) {
    parts.push(`Cycle ${session.cycle_number}`)
  }
  if (session.meetings.length) {
    parts.push(plural(session.meetings.length, 'startup'))
  } else if (
    session.status === 'PLANNED' &&
    new Date(session.startsAt) > new Date()
  ) {
    const drawn = new Date(
      new Date(session.startsAt).getTime() - leadDays * DAY_MS
    )
    parts.push(
      drawn > new Date()
        ? `Drawn and sent ${dayOf(drawn, timeZone)}`
        : 'Drawn within ten minutes'
    )
  }
  return `${next ? 'Next · ' : ''}${parts.join(' · ')}`
}

function SessionRow({
  session,
  next,
  timeZone,
  leadDays,
  mode,
  busy,
  locked,
  onAction,
}) {
  const [open, setOpen] = useState(false)
  const upcoming = new Date(session.startsAt) > new Date()
  const canSchedule = upcoming && session.status !== 'SCHEDULED'
  const canRedraw =
    upcoming && session.status === 'SCHEDULED' && mode === 'SLOTS'
  const canCancel = upcoming && session.status !== 'CANCELLED'
  const count = session.meetings.length

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: '14px',
        bgcolor: 'background.default',
        outline: next ? '2px solid' : 'none',
        outlineColor: 'primary.main',
        opacity: session.status === 'CANCELLED' ? 0.6 : 1,
      }}
    >
      <Box
        sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 200 }}>
          <Typography variant="subtitle1" component="p">
            {dayOf(session.startsAt, timeZone)},{' '}
            {clockOf(session.startsAt, timeZone)} –{' '}
            {clockOf(session.endsAt, timeZone)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {detailOf(session, { next, leadDays, timeZone })}
          </Typography>
        </Box>
        <StatusPill {...sessionStatus(session)} />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {count > 0 && (
            <Button variant="text" onClick={() => setOpen(!open)}>
              {open ? 'Hide Meetings' : `Meetings (${count})`}
            </Button>
          )}
          {canSchedule && (
            <Button
              variant="outlined"
              disabled={locked && busy !== 'schedule'}
              loading={busy === 'schedule'}
              onClick={() => onAction(session, 'schedule')}
            >
              Schedule Now
            </Button>
          )}
          {canRedraw && (
            <Button
              variant="outlined"
              disabled={locked && busy !== 'redraw'}
              loading={busy === 'redraw'}
              onClick={() => onAction(session, 'redraw')}
            >
              Redraw
            </Button>
          )}
          {canCancel && (
            <Button
              variant="text"
              color="error"
              disabled={locked}
              onClick={() => onAction(session, 'cancel')}
            >
              Cancel
            </Button>
          )}
        </Box>
      </Box>
      {session.problem && upcoming && (
        <Alert severity="warning" sx={{ mt: 1.5 }}>
          {session.problem}
        </Alert>
      )}
      {count > 0 && (
        <Collapse in={open}>
          <Box sx={{ pt: 1.5 }}>
            <Meetings meetings={session.meetings} timeZone={timeZone} />
          </Box>
        </Collapse>
      )}
    </Box>
  )
}

function SessionsCard({
  page,
  busy,
  notice,
  onCloseNotice,
  onAction,
  onClear,
}) {
  const { sessions, programme } = page
  const [showPast, setShowPast] = useState(false)
  const now = new Date()
  const upcoming = sessions.filter(s => new Date(s.endsAt) > now)
  const past = sessions.filter(s => new Date(s.endsAt) <= now)
  const nextId = upcoming.find(s => s.status !== 'CANCELLED')?._id
  const row = session => (
    <SessionRow
      key={session._id}
      session={session}
      next={session._id === nextId}
      timeZone={programme.timeZone}
      leadDays={programme.leadDays}
      mode={programme.mode}
      busy={busy?.id === session._id ? busy.action : null}
      locked={Boolean(busy)}
      onAction={onAction}
    />
  )

  return (
    <SectionCard
      icon={CalendarIcon}
      title="Sessions"
      subtitle={`Each session is drawn at random and sent ${plural(programme.leadDays, 'day')} before it.`}
      action={
        sessions.length > 0 && (
          <Button
            variant="text"
            color="error"
            disabled={Boolean(busy)}
            loading={busy?.action === 'clear'}
            onClick={onClear}
          >
            Clear All Meetings
          </Button>
        )
      }
    >
      {notice && (
        <Alert severity="error" onClose={onCloseNotice} sx={{ mb: 2 }}>
          {notice}
        </Alert>
      )}
      {sessions.length ? (
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          {upcoming.length ? (
            upcoming.map(row)
          ) : (
            <Typography variant="body2" color="text.secondary">
              Every session has taken place. Move the date sessions start to
              begin a new calendar.
            </Typography>
          )}
          {past.length > 0 && (
            <>
              <Box>
                <Button variant="text" onClick={() => setShowPast(!showPast)}>
                  {showPast
                    ? 'Hide Past Sessions'
                    : `Show ${plural(past.length, 'Past Session')}`}
                </Button>
              </Box>
              <Collapse in={showPast}>
                <Box sx={{ display: 'grid', gap: 1.5 }}>{past.map(row)}</Box>
              </Collapse>
            </>
          )}
        </Box>
      ) : (
        <EmptyState
          icon={CalendarIcon}
          title="No sessions yet"
          description="Save the programme and its 13 sessions appear here."
        />
      )}
    </SectionCard>
  )
}

// Pinned to the bottom of the screen while the settings differ from what's
// saved, so Save is never a scroll away.
function SaveBar({ configured, saving, error, blocked, onSave, onDiscard }) {
  return (
    <Paper
      elevation={3}
      sx={{
        position: 'sticky',
        bottom: 16,
        zIndex: 2,
        mt: 3,
        p: 2,
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flexWrap: 'wrap',
      }}
    >
      <Box sx={{ flexGrow: 1, minWidth: 220 }}>
        {error ? (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {configured
              ? 'Unsaved changes. Upcoming sessions follow them once saved, and only people whose meeting changes are emailed.'
              : 'Save to create the 13 sessions.'}
          </Typography>
        )}
      </Box>
      {configured && (
        <Button variant="text" disabled={saving} onClick={onDiscard}>
          Discard
        </Button>
      )}
      <Button
        variant="contained"
        disabled={blocked}
        loading={saving}
        onClick={onSave}
      >
        Save Programme
      </Button>
    </Paper>
  )
}

// ------------------------------------------------------------ the page

const DONE = {
  schedule: session => `Session ${session.number} is scheduled.`,
  redraw: session => `Session ${session.number} is drawn again.`,
  cancel: session => `Session ${session.number} is cancelled.`,
}

export default function PageProgramme() {
  const loaded = useLoaderData()
  const outcome = useCalendarOutcome()
  const [page, setPage] = useState(loaded)
  const [form, setForm] = useState(() => formFrom(loaded.programme))
  const [error, setError] = useState(null)
  const [sessionError, setSessionError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(null)
  const [confirmCancel, setConfirmCancel] = useState(null)
  const [confirmClear, setConfirmClear] = useState(false)

  // A change makes the server's last answer stale.
  const setField = (field, value) => {
    setError(null)
    setForm(f => ({ ...f, [field]: value }))
  }
  const problems = problemsOf(form)
  const fieldError = field =>
    problems[field] || (error?.field === field ? error.error : '')
  const dirty = snapshotOf(form) !== snapshotOf(formFrom(page.programme))
  const startups = invitedCount(page.invites, form)
  const overCapacity =
    form.mode === 'SLOTS' &&
    !problems.endTime &&
    slotsPerStaff(form) * form.staff.length < startups
  const invalid = Object.keys(problems).length > 0
  const blocked = invalid || overCapacity
  let barError = error?.error
  if (invalid) {
    barError = 'Fix the highlighted fields to save.'
  } else if (overCapacity) {
    barError = 'Not every invited startup fits. See Meeting Staff.'
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    const payload = payloadOf(form)
    NUMBER_FIELDS.forEach(f => (payload[f] = Number(payload[f])))
    const result = await saveProgramme(payload)
    setSaving(false)
    if (result.error) {
      setError(result)
      return
    }
    setPage(result.page)
    setForm(formFrom(result.page.programme))
    setMessage('Programme saved.')
  }

  const discard = () => {
    setError(null)
    setForm(formFrom(page.programme))
  }

  const runAction = async (session, action) => {
    setBusy({ id: session._id, action })
    setSessionError('')
    const result = await sessionAction(session._id, action)
    setBusy(null)
    if (result.error) {
      setSessionError(result.error)
      return
    }
    setPage(result.page)
    // Google may have refused it: the session then shows why.
    const after = result.page.sessions.find(s => s._id === session._id)
    if (after?.problem) {
      setMessage(
        `Session ${session.number} couldn’t be updated. See the warning on it.`
      )
      return
    }
    setMessage(DONE[action](session))
  }

  const clearAll = async () => {
    setBusy({ action: 'clear' })
    setSessionError('')
    const result = await clearSessions()
    setBusy(null)
    setConfirmClear(false)
    if (result.error) {
      setSessionError(result.error)
      return
    }
    setPage(result.page)
    setMessage('Every meeting is cleared, and the sessions start again.')
  }

  const onAction = (session, action) =>
    action === 'cancel' ? setConfirmCancel(session) : runAction(session, action)

  const sessions = (
    <SessionsCard
      page={page}
      busy={busy}
      notice={sessionError}
      onCloseNotice={() => setSessionError('')}
      onAction={onAction}
      onClear={() => setConfirmClear(true)}
    />
  )

  return (
    <Box sx={{ maxWidth: 1080, mx: 'auto' }}>
      <PageHeader
        breadcrumbs={[
          { label: 'Overview', to: '/admin' },
          { label: 'Programme' },
        ]}
        title="Programme"
        subtitle="Bi-weekly sessions for every startup, on one calendar."
      />

      <Box
        sx={{
          display: 'grid',
          gap: { xs: 2, sm: 3 },
          gridTemplateColumns: 'minmax(0, 1fr)',
        }}
      >
        {outcome && <Alert severity={outcome.severity}>{outcome.text}</Alert>}
        <ReportsCard
          key={`${page.reports.startDate}-${page.reports.timeZone}`}
          reports={page.reports}
          onSaved={next => {
            setPage(next)
            setMessage('Report dates saved.')
          }}
        />
        <HostNotice host={page.host} returnTo="/admin/programme" />

        {page.configured && sessions}
        <SettingsCard
          form={form}
          setField={setField}
          fieldError={fieldError}
          configured={page.configured}
          saved={page.programme}
          host={page.host}
        />
        <StaffCard
          form={form}
          setField={setField}
          fieldError={fieldError}
          options={page.staffOptions}
          startups={startups}
        />
        <InvitesCard invites={page.invites} form={form} setField={setField} />
        {!page.configured && sessions}
      </Box>

      {(dirty || !page.configured) && (
        <SaveBar
          configured={page.configured}
          saving={saving}
          error={barError}
          blocked={blocked}
          onSave={save}
          onDiscard={discard}
        />
      )}

      <Snackbar
        open={Boolean(message)}
        autoHideDuration={4000}
        onClose={() => setMessage('')}
        message={message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      <Dialog
        open={Boolean(confirmCancel)}
        onClose={() => setConfirmCancel(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Cancel This Session?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Every meeting in it comes off the calendars, and everyone invited
            gets a cancellation email. You can schedule it again later.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setConfirmCancel(null)}>
            Keep It
          </Button>
          <Button
            variant="outlined"
            color="error"
            loading={busy?.action === 'cancel'}
            onClick={async () => {
              await runAction(confirmCancel, 'cancel')
              setConfirmCancel(null)
            }}
          >
            Cancel Session
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmClear}
        onClose={() => !busy && setConfirmClear(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Clear All Meetings?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Every upcoming bi-weekly meeting comes off the Google Calendars, and
            everyone in one gets a cancellation email. The 13 sessions then
            start again from the settings, all planned: each is drawn{' '}
            {plural(page.programme.leadDays, 'day')} before it, or when you
            press Schedule Now. Meetings already held stay in the startups’
            check-ins, and extra sessions stay as they are.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            disabled={Boolean(busy)}
            onClick={() => setConfirmClear(false)}
          >
            Keep Them
          </Button>
          <Button
            variant="contained"
            color="error"
            loading={busy?.action === 'clear'}
            onClick={clearAll}
          >
            Clear All
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

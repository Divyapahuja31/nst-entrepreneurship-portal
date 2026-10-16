import { useState } from 'react'
import { useLoaderData } from 'react-router'

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
  MenuItem,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material'

import {
  cancelExtraSession,
  createExtraSession,
  updateExtraSession,
} from '../../api/extraSessions'
import EmptyState from '../../components/EmptyState'
import PageHeader from '../../components/PageHeader'
import SectionCard from '../../components/SectionCard'
import StatusPill from '../../components/StatusPill'
import { CalendarIcon, PlusIcon } from '../../components/icons'
import {
  LIMITS,
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

// One-off sessions on any day, apart from the bi-weekly calendar: no
// programme is needed. Each runs like a bi-weekly session (slots or one group
// meeting) with its own staff and invitations, on the calendar host's Google
// Calendar, the same connection the Programme page uses. For admins and the
// academic board; the API checks the same.

const SLOT_FIELDS = ['slotMinutes', 'gapMinutes', 'firstGapMinutes']

// "YYYY-MM-DD" and "HH:MM" of a moment in timeZone, for the date and time
// fields.
const ymdIn = (date, timeZone) =>
  new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(date))
const hhmmIn = (date, timeZone) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(date))

// A new session starts from the programme's settings.
const newForm = defaults => ({
  title: '',
  date: '',
  startTime: defaults.startTime,
  endTime: defaults.endTime,
  mode: defaults.mode,
  slotMinutes: defaults.slotMinutes,
  gapMinutes: defaults.gapMinutes,
  firstGapMinutes: defaults.firstGapMinutes,
  staff: defaults.staff,
  excludedVentures: new Set(defaults.excludedVentures),
  excludedFounders: new Set(defaults.excludedFounders),
})

const formOf = (session, timeZone) => ({
  title: session.extra.title,
  date: ymdIn(session.startsAt, timeZone),
  startTime: hhmmIn(session.startsAt, timeZone),
  endTime: hhmmIn(session.endsAt, timeZone),
  mode: session.extra.mode,
  slotMinutes: session.extra.slotMinutes,
  gapMinutes: session.extra.gapMinutes,
  firstGapMinutes: session.extra.firstGapMinutes,
  staff: session.extra.staff,
  excludedVentures: new Set(session.extra.excludedVentures),
  excludedFounders: new Set(session.extra.excludedFounders),
})

const payloadOf = form => ({
  ...form,
  excludedVentures: [...form.excludedVentures],
  excludedFounders: [...form.excludedFounders],
})

// The server's checks, run as the form changes: field -> what's wrong.
const problemsOf = (form, startups) => {
  const problems = {}
  if (form.title.trim().length > 80) {
    problems.title = 'Keep the title to 80 characters'
  }
  if (!form.date) {
    problems.date = 'Choose the day'
  }
  if (!form.startTime || !form.endTime) {
    problems.startTime = 'Choose a start and end time'
  } else if (minutesOf(form.endTime) <= minutesOf(form.startTime)) {
    problems.endTime = 'The session must end after it starts'
  }
  if (form.mode === 'SLOTS') {
    for (const [field, min, max, message] of LIMITS) {
      const value = form[field]
      if (
        SLOT_FIELDS.includes(field) &&
        !(Number.isInteger(value) && value >= min && value <= max)
      ) {
        problems[field] = message
      }
    }
  }
  if (!form.staff.length) {
    problems.staff = 'Add at least one person to run it'
  }
  if (!startups) {
    problems.invites = 'Invite at least one startup'
  }
  return problems
}

const titleOf = session => session.extra.title || 'Programme session'

// A session's day and times are in the zone it was made in, which the
// server reads them in when it's changed; new ones use the page's.
const zoneOf = (session, page) => session.extra.timeZone || page.timeZone

// ------------------------------------------------------------ the editor

function DetailsCard({ form, setField, fieldError, editing }) {
  const slotMode = form.mode === 'SLOTS'
  const number = (field, label) => (
    <TextField
      type="number"
      label={label}
      value={form[field]}
      onChange={e => setField(field, Number(e.target.value))}
      error={Boolean(fieldError(field))}
      helperText={fieldError(field)}
      slotProps={{ htmlInput: { min: 0 } }}
    />
  )
  return (
    <SectionCard
      icon={CalendarIcon}
      title={editing ? 'Change Session' : 'New Session'}
      subtitle="One day, run like a bi-weekly session. It’s scheduled as soon as you save it."
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
          label="Title"
          value={form.title}
          onChange={e => setField('title', e.target.value)}
          error={Boolean(fieldError('title'))}
          helperText={
            fieldError('title') || 'Shown in invites, e.g. “Demo day rehearsal”'
          }
          sx={{ gridColumn: { md: 'span 2' } }}
        />
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
          type="date"
          label="Day"
          value={form.date}
          onChange={e => setField('date', e.target.value)}
          error={Boolean(fieldError('date'))}
          helperText={fieldError('date')}
          slotProps={{ inputLabel: { shrink: true } }}
        />
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
        {slotMode && number('slotMinutes', 'Slot length (minutes)')}
        {slotMode && number('gapMinutes', 'Gap between slots (minutes)')}
        {slotMode &&
          number('firstGapMinutes', 'Gap before the first slot (minutes)')}
      </Box>
    </SectionCard>
  )
}

// ------------------------------------------------------------ the list

function SessionRow({ session, timeZone, busy, onEdit, onCancel }) {
  const [open, setOpen] = useState(false)
  const upcoming = new Date(session.startsAt) > new Date()
  const count = session.meetings.length
  const details = [
    session.extra.mode === 'GROUP' ? 'Group' : 'Slots',
    count && plural(count, 'startup'),
    session.cycle_number && `Cycle ${session.cycle_number}`,
    session.extra.createdBy?.username &&
      `Added by ${session.extra.createdBy.username}`,
  ].filter(Boolean)

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: '14px',
        bgcolor: 'background.default',
        opacity: session.status === 'CANCELLED' ? 0.6 : 1,
      }}
    >
      <Box
        sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 200 }}>
          <Typography variant="subtitle1" component="p">
            {titleOf(session)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {dayOf(session.startsAt, timeZone)},{' '}
            {clockOf(session.startsAt, timeZone)} –{' '}
            {clockOf(session.endsAt, timeZone)} · {details.join(' · ')}
          </Typography>
        </Box>
        <StatusPill {...sessionStatus(session)} />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {count > 0 && (
            <Button variant="text" onClick={() => setOpen(!open)}>
              {open ? 'Hide Meetings' : `Meetings (${count})`}
            </Button>
          )}
          {upcoming && (
            <Button
              variant="outlined"
              disabled={busy}
              onClick={() => onEdit(session)}
            >
              {session.status === 'CANCELLED' ? 'Schedule Again' : 'Change'}
            </Button>
          )}
          {upcoming && session.status !== 'CANCELLED' && (
            <Button
              variant="text"
              color="error"
              disabled={busy}
              onClick={() => onCancel(session)}
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

function SessionsList({ page, busy, onEdit, onCancel }) {
  const [showPast, setShowPast] = useState(false)
  const now = new Date()
  // Soonest first; the server sends the newest first.
  const upcoming = page.sessions.filter(s => new Date(s.endsAt) > now).reverse()
  const past = page.sessions.filter(s => new Date(s.endsAt) <= now)
  const row = session => (
    <SessionRow
      key={session._id}
      session={session}
      timeZone={zoneOf(session, page)}
      busy={busy}
      onEdit={onEdit}
      onCancel={onCancel}
    />
  )

  return (
    <SectionCard
      icon={CalendarIcon}
      title="Sessions"
      subtitle="Every extra session, on the host’s Google Calendar."
    >
      {page.sessions.length ? (
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          {upcoming.length ? (
            upcoming.map(row)
          ) : (
            <Typography variant="body2" color="text.secondary">
              No extra session is coming up.
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
          title="No extra sessions yet"
          description="Add one for any day, such as a demo day rehearsal or a one-off review."
        />
      )}
    </SectionCard>
  )
}

// ------------------------------------------------------------ the page

export default function PageExtraSessions() {
  const loaded = useLoaderData()
  const outcome = useCalendarOutcome()
  const [page, setPage] = useState(loaded)
  // { id, form, timeZone } while adding (id null) or changing a session.
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [notice, setNotice] = useState(null)
  const [message, setMessage] = useState('')

  const form = editing?.form
  const startups = form ? invitedCount(page.invites, form) : 0
  const problems = form ? problemsOf(form, startups) : {}
  const overCapacity =
    form?.mode === 'SLOTS' &&
    !problems.endTime &&
    slotsPerStaff(form) * form.staff.length < startups
  const fieldError = field =>
    problems[field] || (error?.field === field ? error.error : '')
  const blocked = Object.keys(problems).length > 0 || overCapacity

  const setField = (field, value) => {
    setError(null)
    setEditing(e => ({ ...e, form: { ...e.form, [field]: value } }))
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    const payload = payloadOf(form)
    const result = editing.id
      ? await updateExtraSession(editing.id, payload)
      : await createExtraSession(payload)
    setSaving(false)
    if (result.error) {
      setError(result)
      return
    }
    setPage(result.page)
    setEditing(null)
    setMessage(
      editing.id
        ? 'Session changed. Only people whose meeting moved are emailed.'
        : 'Session added. Everyone in it is invited and emailed.'
    )
  }

  const cancel = async () => {
    setCancelling(true)
    const result = await cancelExtraSession(confirmCancel._id)
    setCancelling(false)
    setConfirmCancel(null)
    if (result.error) {
      setNotice(result.error)
      return
    }
    setPage(result.page)
    setMessage('Session cancelled. Everyone in it is told.')
  }

  let barError = error && !error.field ? error.error : ''
  if (problems.invites) {
    barError = problems.invites
  } else if (overCapacity) {
    barError = 'Not every invited startup fits. See Meeting Staff.'
  }

  return (
    <Box sx={{ maxWidth: 1080, mx: 'auto' }}>
      <PageHeader
        breadcrumbs={[
          { label: 'Overview', to: '/admin' },
          { label: 'Extra Sessions' },
        ]}
        title="Extra Sessions"
        subtitle="One-off sessions on any day, run like the bi-weekly ones."
        action={
          !editing && (
            <Button
              variant="contained"
              startIcon={<PlusIcon />}
              disabled={!page.host.connected}
              onClick={() => {
                setError(null)
                setEditing({
                  id: null,
                  form: newForm(page.defaults),
                  timeZone: page.timeZone,
                })
              }}
            >
              New Session
            </Button>
          )
        }
      />

      <Box
        sx={{
          display: 'grid',
          gap: { xs: 2, sm: 3 },
          gridTemplateColumns: 'minmax(0, 1fr)',
        }}
      >
        {outcome && <Alert severity={outcome.severity}>{outcome.text}</Alert>}
        <HostNotice host={page.host} returnTo="/admin/sessions" />
        {notice && (
          <Alert severity="error" onClose={() => setNotice(null)}>
            {notice}
          </Alert>
        )}

        {editing && (
          <>
            <DetailsCard
              form={form}
              setField={setField}
              fieldError={fieldError}
              editing={Boolean(editing.id)}
            />
            <StaffCard
              form={form}
              setField={setField}
              fieldError={fieldError}
              options={page.staffOptions}
              startups={startups}
            />
            <InvitesCard
              invites={page.invites}
              form={form}
              setField={setField}
            />
            <Paper
              elevation={3}
              sx={{
                position: 'sticky',
                bottom: 16,
                zIndex: 2,
                p: 2,
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                flexWrap: 'wrap',
              }}
            >
              <Box sx={{ flexGrow: 1, minWidth: 220 }}>
                <Typography
                  variant="body2"
                  color={barError ? 'error' : 'text.secondary'}
                >
                  {barError || `Times are in ${editing.timeZone}.`}
                </Typography>
              </Box>
              <Button
                variant="text"
                disabled={saving}
                onClick={() => setEditing(null)}
              >
                Discard
              </Button>
              <Button
                variant="contained"
                disabled={blocked}
                loading={saving}
                onClick={save}
              >
                {editing.id ? 'Save Changes' : 'Add Session'}
              </Button>
            </Paper>
          </>
        )}

        <SessionsList
          page={page}
          busy={Boolean(editing) || cancelling}
          onEdit={session => {
            setError(null)
            const timeZone = zoneOf(session, page)
            setEditing({
              id: session._id,
              form: formOf(session, timeZone),
              timeZone,
            })
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          onCancel={setConfirmCancel}
        />
      </Box>

      <Snackbar
        open={Boolean(message)}
        autoHideDuration={4000}
        onClose={() => setMessage('')}
        message={message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      <Dialog
        open={Boolean(confirmCancel)}
        onClose={() => !cancelling && setConfirmCancel(null)}
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
          <Button
            variant="outlined"
            disabled={cancelling}
            onClick={() => setConfirmCancel(null)}
          >
            Keep It
          </Button>
          <Button
            variant="outlined"
            color="error"
            loading={cancelling}
            onClick={cancel}
          >
            Cancel Session
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

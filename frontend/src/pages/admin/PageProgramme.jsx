import { useEffect, useState } from 'react'
import { useLoaderData, useSearchParams } from 'react-router'

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
  FormControlLabel,
  Link,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@mui/material'

import { calendarConnectUrl } from '../../api/checkins'
import { saveProgramme, sessionAction } from '../../api/programme'
import EmptyState from '../../components/EmptyState'
import PageHeader from '../../components/PageHeader'
import SectionCard from '../../components/SectionCard'
import StatusPill from '../../components/StatusPill'
import { CALENDAR_OUTCOMES } from '../../components/calendarOutcomes'
import { CalendarIcon, PeopleIcon, ShieldIcon } from '../../components/icons'

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

const minutesOf = time => {
  const [h, m] = (time || '0:0').split(':').map(Number)
  return h * 60 + m
}

// The same sum as the server: how many slots one person can run.
const slotsPerStaff = form => {
  const window =
    minutesOf(form.endTime) - minutesOf(form.startTime) - form.firstGapMinutes
  if (window < form.slotMinutes || form.slotMinutes <= 0) {
    return 0
  }
  return Math.floor(
    (window + form.gapMinutes) / (form.slotMinutes + form.gapMinutes)
  )
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

const invitedCount = (invites, form) =>
  invites.filter(
    s =>
      !form.excludedVentures.has(String(s.venture._id)) &&
      s.founders.some(f => !form.excludedFounders.has(String(f._id)))
  ).length

const toggle = (set, id, on) => {
  const next = new Set(set)
  if (on) {
    next.delete(id)
  } else {
    next.add(id)
  }
  return next
}

// ------------------------------------------------------------ settings

function HostNotice({ host }) {
  if (host.connected) {
    return null
  }
  return (
    <Alert
      severity="warning"
      action={
        host.isYou && (
          <Button
            variant="outlined"
            component="a"
            href={calendarConnectUrl('/admin/programme')}
          >
            Connect Google Calendar
          </Button>
        )
      }
    >
      Sessions go on {host.isYou ? 'your' : `${host.username}’s`} Google
      Calendar. {host.isYou ? 'Connect it' : 'Ask them to connect it'} so
      sessions can be scheduled.
    </Alert>
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
          label="Cycle 1 starts"
          value={form.startDate}
          onChange={e => setField('startDate', e.target.value)}
          error={Boolean(fieldError('startDate'))}
          helperText={
            fieldError('startDate') ||
            (startMoves
              ? 'Changing this moves every startup’s bi-weekly cycles.'
              : 'Every startup’s bi-weekly cycles count from this day.')
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
        <TextField
          label="Time zone"
          value={form.timeZone}
          onChange={e => setField('timeZone', e.target.value)}
          error={Boolean(fieldError('timeZone'))}
          helperText={fieldError('timeZone') || 'For example Asia/Kolkata'}
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

function StaffCard({ form, setField, fieldError, options }) {
  const value = options.filter(o => form.staff.includes(String(o._id)))
  return (
    <SectionCard
      icon={ShieldIcon}
      title="Meeting Staff"
      subtitle="The people who run the sessions. Whoever mentors a startup doesn’t matter here."
    >
      <Autocomplete
        multiple
        options={options}
        value={value}
        onChange={(_, picked) =>
          setField(
            'staff',
            picked.map(p => String(p._id))
          )
        }
        getOptionLabel={o => `${o.username} · ${o.email}`}
        isOptionEqualToValue={(a, b) => String(a._id) === String(b._id)}
        renderInput={params => (
          <TextField
            {...params}
            label="Staff"
            error={Boolean(fieldError('staff'))}
            helperText={
              fieldError('staff') ||
              'Admins, academic board and mentors, including you. At least one.'
            }
          />
        )}
      />
    </SectionCard>
  )
}

function InvitesCard({ invites, form, setField }) {
  if (!invites.length) {
    return (
      <SectionCard icon={PeopleIcon} title="Invited">
        <EmptyState
          icon={PeopleIcon}
          title="No startups yet"
          description="Startups with active founders appear here, invited by default."
        />
      </SectionCard>
    )
  }
  return (
    <SectionCard
      icon={PeopleIcon}
      title="Invited"
      subtitle="Every startup and founder is invited unless you switch them off. New ones are invited automatically."
    >
      <Box sx={{ display: 'grid', gap: 1.5 }}>
        {invites.map(({ venture, founders }) => {
          const ventureId = String(venture._id)
          const ventureIn = !form.excludedVentures.has(ventureId)
          return (
            <Box
              key={ventureId}
              sx={{ p: 2, borderRadius: '14px', bgcolor: 'background.default' }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={ventureIn}
                    onChange={e =>
                      setField(
                        'excludedVentures',
                        toggle(form.excludedVentures, ventureId, e.target.checked)
                      )
                    }
                  />
                }
                label={<Typography variant="subtitle1">{venture.name}</Typography>}
              />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, pl: 6 }}>
                {founders.map(founder => {
                  const founderId = String(founder._id)
                  return (
                    <FormControlLabel
                      key={founderId}
                      disabled={!ventureIn}
                      control={
                        <Switch
                          size="small"
                          checked={
                            ventureIn && !form.excludedFounders.has(founderId)
                          }
                          onChange={e =>
                            setField(
                              'excludedFounders',
                              toggle(
                                form.excludedFounders,
                                founderId,
                                e.target.checked
                              )
                            )
                          }
                        />
                      }
                      label={
                        <Typography variant="body2">{founder.username}</Typography>
                      }
                    />
                  )
                })}
              </Box>
            </Box>
          )
        })}
      </Box>
    </SectionCard>
  )
}

// ------------------------------------------------------------ sessions

const sessionStatus = session => {
  const over = new Date(session.endsAt) < new Date()
  if (session.status === 'CANCELLED') {
    return { label: 'Cancelled', tint: 'gray', plain: true }
  }
  if (session.problem && !over) {
    return { label: 'Needs attention', tint: 'orange' }
  }
  if (session.status === 'SCHEDULED') {
    return over
      ? { label: 'Held', tint: 'green' }
      : { label: 'Scheduled', tint: 'blue' }
  }
  return over
    ? { label: 'Not scheduled', tint: 'gray', plain: true }
    : { label: 'Planned', tint: 'gray', plain: true }
}

const formatIn = (date, timeZone, options) =>
  new Intl.DateTimeFormat(undefined, { timeZone, ...options }).format(
    new Date(date)
  )

const dayOf = (date, timeZone) =>
  formatIn(date, timeZone, { weekday: 'short', day: 'numeric', month: 'short' })

const clockOf = (date, timeZone) =>
  formatIn(date, timeZone, { hour: 'numeric', minute: '2-digit' })

const spanOf = (meeting, timeZone) => {
  const end = new Date(
    new Date(meeting.scheduledAt).getTime() + meeting.durationMinutes * 60000
  )
  return `${clockOf(meeting.scheduledAt, timeZone)} – ${clockOf(end, timeZone)}`
}

function Meetings({ meetings, timeZone }) {
  if (!meetings.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        The meetings are drawn when the session is scheduled.
      </Typography>
    )
  }
  if (meetings[0].group) {
    return (
      <Typography variant="body2">
        Group meeting, {spanOf(meetings[0], timeZone)}, with{' '}
        {meetings.map(m => m.venture?.name).join(', ')}. Run by{' '}
        {meetings[0].staff.map(s => s.username).join(', ')}.{' '}
        {meetings[0].meetUrl && (
          <Link href={meetings[0].meetUrl} target="_blank" rel="noopener noreferrer">
            Join Meet
          </Link>
        )}
      </Typography>
    )
  }
  return (
    <Box sx={{ display: 'grid', gap: 0.75 }}>
      {meetings.map(m => (
        <Typography key={m._id} variant="body2">
          <Box component="span" sx={{ color: 'text.secondary' }}>
            {spanOf(m, timeZone)}
          </Box>{' '}
          {m.venture?.name} with {m.staff.map(s => s.username).join(', ')}{' '}
          {m.meetUrl && (
            <Link href={m.meetUrl} target="_blank" rel="noopener noreferrer">
              Meet
            </Link>
          )}
        </Typography>
      ))}
    </Box>
  )
}

function SessionRow({ session, timeZone, busy, onAction }) {
  const [open, setOpen] = useState(false)
  const upcoming = new Date(session.startsAt) > new Date()
  const canSchedule = upcoming && session.status !== 'SCHEDULED'
  const canRedraw = upcoming && session.status === 'SCHEDULED'
  const canCancel = upcoming && session.status !== 'CANCELLED'

  return (
    <Box sx={{ p: 2, borderRadius: '14px', bgcolor: 'background.default' }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
        <Box sx={{ flexGrow: 1, minWidth: 200 }}>
          <Typography variant="subtitle1" component="p">
            {dayOf(session.startsAt, timeZone)},{' '}
            {clockOf(session.startsAt, timeZone)} –{' '}
            {clockOf(session.endsAt, timeZone)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Session {session.number}
            {session.cycle_number && ` · Cycle ${session.cycle_number}`}
            {session.meetings.length > 0 &&
              ` · ${session.meetings.length} startups`}
          </Typography>
        </Box>
        <StatusPill {...sessionStatus(session)} />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="text" onClick={() => setOpen(!open)}>
            {open ? 'Hide' : 'Meetings'}
          </Button>
          {canSchedule && (
            <Button
              variant="outlined"
              loading={busy === 'schedule'}
              onClick={() => onAction(session, 'schedule')}
            >
              Schedule Now
            </Button>
          )}
          {canRedraw && (
            <Button
              variant="outlined"
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
      <Collapse in={open}>
        <Box sx={{ pt: 1.5 }}>
          <Meetings meetings={session.meetings} timeZone={timeZone} />
        </Box>
      </Collapse>
    </Box>
  )
}

function SessionsCard({ page, onAction, busy }) {
  const { sessions, programme } = page
  return (
    <SectionCard
      icon={CalendarIcon}
      title="Sessions"
      subtitle={`Each session is drawn and sent ${programme.leadDays} days before. Every draw is random.`}
    >
      {sessions.length ? (
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          {sessions.map(session => (
            <SessionRow
              key={session._id}
              session={session}
              timeZone={programme.timeZone}
              busy={busy?.id === session._id ? busy.action : null}
              onAction={onAction}
            />
          ))}
        </Box>
      ) : (
        <EmptyState
          icon={CalendarIcon}
          title="No sessions yet"
          description="Save the calendar above and its 13 sessions appear here."
        />
      )}
    </SectionCard>
  )
}

// ------------------------------------------------------------ the page

// Shows the outcome of connecting Google once, then drops it from the URL.
function useCalendarOutcome() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [outcome] = useState(
    () => CALENDAR_OUTCOMES[searchParams.get('calendar')]
  )
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
  return outcome
}

export default function PageProgramme() {
  const loaded = useLoaderData()
  const outcome = useCalendarOutcome()
  const [page, setPage] = useState(loaded)
  const [form, setForm] = useState(() => formFrom(loaded.programme))
  const [error, setError] = useState(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(null)
  const [confirmCancel, setConfirmCancel] = useState(null)

  const setField = (field, value) => setForm(f => ({ ...f, [field]: value }))
  const fieldError = field => (error?.field === field ? error.error : '')

  const perStaff = slotsPerStaff(form)
  const startups = invitedCount(page.invites, form)
  const capacity =
    form.mode === 'SLOTS'
      ? `${perStaff} slots each × ${form.staff.length} staff = ${
          perStaff * form.staff.length
        } for ${startups} startups.`
      : `${startups} startups in one meeting.`

  const save = async () => {
    setSaving(true)
    setError(null)
    setMessage('')
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
    setMessage(
      'Saved. Upcoming sessions follow the new settings, and only people whose meeting changed are emailed.'
    )
  }

  const runAction = async (session, action) => {
    setBusy({ id: session._id, action })
    setError(null)
    setMessage('')
    const result = await sessionAction(session._id, action)
    setBusy(null)
    if (result.error) {
      setError(result)
      return
    }
    setPage(result.page)
  }

  const onAction = (session, action) =>
    action === 'cancel' ? setConfirmCancel(session) : runAction(session, action)

  const generalError =
    error && !['startDate', 'startTime', 'endTime', 'timeZone', 'staff', ...NUMBER_FIELDS].includes(error.field)
      ? error.error
      : ''

  return (
    <Box sx={{ maxWidth: 1080, mx: 'auto' }}>
      <PageHeader
        breadcrumbs={[{ label: 'Overview', to: '/admin' }, { label: 'Programme' }]}
        title="Programme"
        subtitle="Bi-weekly sessions for every startup, on one calendar."
        action={
          <Button variant="contained" loading={saving} onClick={save}>
            Save Programme
          </Button>
        }
      />

      <Box sx={{ display: 'grid', gap: { xs: 2, sm: 3 }, gridTemplateColumns: 'minmax(0, 1fr)' }}>
        {outcome && <Alert severity={outcome.severity}>{outcome.text}</Alert>}
        <HostNotice host={page.host} />
        {message && (
          <Alert severity="success" onClose={() => setMessage('')}>
            {message}
          </Alert>
        )}
        {generalError && (
          <Alert severity="error" onClose={() => setError(null)}>
            {generalError}
          </Alert>
        )}

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
        />
        <InvitesCard invites={page.invites} form={form} setField={setField} />
        <Typography variant="body2" color="text.secondary">
          {capacity}
        </Typography>
        <SessionsCard page={page} onAction={onAction} busy={busy} />
      </Box>

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
    </Box>
  )
}

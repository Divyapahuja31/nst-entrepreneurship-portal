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
  Paper,
  Snackbar,
  Switch,
  TextField,
  Typography,
} from '@mui/material'

import { calendarConnectUrl } from '../../api/checkins'
import {
  clearSessions,
  saveProgramme,
  sessionAction,
} from '../../api/programme'
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

const DAY_MS = 24 * 60 * 60 * 1000

const TIME_ZONES = Intl.supportedValuesOf?.('timeZone') ?? []

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

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

// The server's checks, run as the admin types: field -> what's wrong. Slot
// fields count only in slot mode, where they show.
const LIMITS = [
  ['slotMinutes', 5, 120, 'A slot lasts 5 to 120 minutes', true],
  ['gapMinutes', 0, 60, 'The gap between slots is 0 to 60 minutes', true],
  [
    'firstGapMinutes',
    0,
    120,
    'The gap before the first slot is 0 to 120 minutes',
    true,
  ],
  ['leadDays', 1, 13, 'Schedule each session 1 to 13 days ahead', false],
]

const problemsOf = form => {
  const problems = {}
  if (!form.startDate) {
    problems.startDate = 'Choose the date cycle 1 starts'
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

// Whether the invited startups fit, recomputed as the form changes.
function CapacityNotice({ form, startups }) {
  if (form.mode !== 'SLOTS') {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        {plural(startups, 'startup')} in one group meeting.
      </Alert>
    )
  }
  const perStaff = slotsPerStaff(form)
  const room = perStaff * form.staff.length
  const sum = `${plural(form.staff.length, 'staff member')} × ${plural(perStaff, 'slot')} each = room for ${room}`
  return room >= startups ? (
    <Alert severity="success" sx={{ mt: 2 }}>
      {sum}. All {plural(startups, 'invited startup')} fit.
    </Alert>
  ) : (
    <Alert severity="warning" sx={{ mt: 2 }}>
      {sum}, but {plural(startups, 'startup')} {startups === 1 ? 'is' : 'are'}{' '}
      invited. Add staff, shorten the slots or widen the session window.
    </Alert>
  )
}

function StaffCard({ form, setField, fieldError, options, startups }) {
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
      <CapacityNotice form={form} startups={startups} />
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
                        toggle(
                          form.excludedVentures,
                          ventureId,
                          e.target.checked
                        )
                      )
                    }
                  />
                }
                label={
                  <Typography variant="subtitle1">{venture.name}</Typography>
                }
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
                        <Typography variant="body2">
                          {founder.username}
                        </Typography>
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
  const now = new Date()
  const started = new Date(session.startsAt) <= now
  const over = new Date(session.endsAt) <= now
  if (session.status === 'CANCELLED') {
    return { label: 'Cancelled', tint: 'gray', plain: true }
  }
  if (session.problem && !over) {
    return { label: 'Needs attention', tint: 'orange' }
  }
  if (session.status === 'SCHEDULED') {
    if (over) {
      return { label: 'Held', tint: 'green' }
    }
    return started
      ? { label: 'In progress', tint: 'green' }
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
  if (meetings[0].group) {
    return (
      <Typography variant="body2">
        Group meeting, {spanOf(meetings[0], timeZone)}, with{' '}
        {meetings.map(m => m.venture?.name).join(', ')}. Run by{' '}
        {meetings[0].staff.map(s => s.username).join(', ')}.{' '}
        {meetings[0].meetUrl && (
          <Link
            href={meetings[0].meetUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
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
              Every session has taken place. Move cycle 1 to start a new
              calendar.
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
        <HostNotice host={page.host} />

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
            Every upcoming meeting comes off the Google Calendars, and everyone
            in one gets a cancellation email. The 13 sessions then start again
            from the settings, all planned: each is drawn{' '}
            {plural(page.programme.leadDays, 'day')} before it, or when you
            press Schedule Now. Meetings already held stay in the startups’
            check-ins.
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

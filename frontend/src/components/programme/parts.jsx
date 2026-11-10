import {
  Alert,
  Autocomplete,
  Box,
  Button,
  FormControlLabel,
  Link,
  Switch,
  TextField,
  Typography,
} from '@mui/material'

import { calendarConnectUrl } from '../../api/checkins'
import EmptyState from '../EmptyState'
import SectionCard from '../SectionCard'
import { PeopleIcon, ShieldIcon } from '../icons'
import { plural, slotsPerStaff, spanOf, toggle } from './helpers'

// Cards shared by the Programme and Extra Sessions pages.

// Whether the invited startups fit, recomputed as the form changes.
export function CapacityNotice({ form, startups }) {
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

export function StaffCard({ form, setField, fieldError, options, startups }) {
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

export function InvitesCard({ invites, form, setField }) {
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

export function Meetings({ meetings, timeZone }) {
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

// The Google Calendar every session goes on, bi-weekly and extra: one
// admin's, connected from this page or the other one alike. The academic
// board schedules through it. returnTo: the page to come back to.
export function HostNotice({ host, returnTo }) {
  if (host.connected && host.autoTranscripts) {
    return null
  }
  const connect = label =>
    host.canConnect && (
      <Button
        variant="outlined"
        component="a"
        href={calendarConnectUrl(returnTo)}
      >
        {label}
      </Button>
    )
  if (host.connected) {
    return (
      <Alert severity="info" action={host.isYou && connect('Reconnect')}>
        {host.isYou
          ? 'Reconnect your Google Calendar so every session transcribes itself.'
          : `Ask ${host.username} to reconnect their Google Calendar so every session transcribes itself.`}{' '}
        Until then, someone has to turn transcripts on in each meeting.
      </Alert>
    )
  }
  let text =
    'Sessions go on an admin’s Google Calendar. Ask an admin to connect theirs on Programme or Extra Sessions; you can then schedule through it.'
  if (host.isYou) {
    text =
      'Every session, bi-weekly and extra, goes on your Google Calendar. Connect it here or on the other page; the academic board schedules through it too.'
  } else if (host.canConnect) {
    text = `Sessions went on ${host.username}’s Google Calendar, which can’t be used any more. Connect yours to host them from now on: the upcoming meetings move to your calendar.`
  } else if (host.id) {
    text = `Sessions went on ${host.username}’s Google Calendar, which can’t be used any more. Ask an admin to connect theirs.`
  }
  return (
    <Alert severity="warning" action={connect('Connect Google Calendar')}>
      {text}
    </Alert>
  )
}

import { randomUUID } from 'node:crypto'
import { CYCLES, cycleForDate } from '@nst/shared/biweeklyCycles.js'

import CheckIn from '../models/checkIn.js'
import CheckInSeries from '../models/checkInSeries.js'
import GoogleCredential from '../models/googleCredential.js'
import { findCoFounders } from './biweeklyHelper.js'
import { GoogleError, getGoogleWorkspace } from './googleWorkspace.js'
import { appUrl } from './kpiLockEmails.js'
import { decryptToken } from './tokenCrypto.js'

export const NOT_CONNECTED = 'GOOGLE_NOT_CONNECTED'
export const RECONNECT = 'GOOGLE_RECONNECT'

const MINUTE_MS = 60 * 1000

// Calls Google as a mentor: google('createEvent', event). A token Google
// refuses marks the connection for reconnecting. Throws a GoogleError with
// code NOT_CONNECTED or RECONNECT when the mentor can't be reached.
export const googleFor = async mentorId => {
  const credential = await GoogleCredential.findOne({ user: mentorId }).select(
    '+refreshToken'
  )
  if (!credential) {
    throw new GoogleError('Connect your Google Calendar first', {
      status: 409,
      code: NOT_CONNECTED,
    })
  }
  if (credential.needsReconnect) {
    throw new GoogleError(
      'Google no longer accepts your connection. Connect your Google Calendar again.',
      { status: 409, code: RECONNECT }
    )
  }
  const refreshToken = decryptToken(credential.refreshToken)
  const workspace = getGoogleWorkspace()

  return async (method, ...args) => {
    try {
      return await workspace[method](refreshToken, ...args)
    } catch (error) {
      if (error.reconnect) {
        await GoogleCredential.updateOne(
          { _id: credential._id },
          { $set: { needsReconnect: true } }
        )
        throw new GoogleError(
          'Google no longer accepts your connection. Connect your Google Calendar again.',
          { status: 409, code: RECONNECT }
        )
      }
      throw error
    }
  }
}

// The startup's active founders, as check-in attendees.
export const findAttendees = async ventureId =>
  (await findCoFounders(ventureId))
    .filter(user => user.email)
    .map(user => ({ user: user._id, email: user.email }))

const eventTimes = (startAt, durationMinutes, timeZone) => ({
  start: { dateTime: startAt.toISOString(), timeZone },
  end: {
    dateTime: new Date(
      startAt.getTime() + durationMinutes * MINUTE_MS
    ).toISOString(),
    timeZone,
  },
})

const eventAttendees = attendees => attendees.map(({ email }) => ({ email }))

// The calendar event for a check-in, with a new Meet link. `occurrences`
// above 1 repeats it every two weeks.
export const checkInEvent = ({
  venture,
  startAt,
  durationMinutes,
  timeZone,
  attendees,
  occurrences = 1,
}) => ({
  summary: `${venture.name}: bi-weekly check-in`,
  description: `Bi-weekly mentor check-in for ${venture.name}.\n\nSee every check-in: ${appUrl()}/checkins`,
  ...eventTimes(startAt, durationMinutes, timeZone),
  attendees: eventAttendees(attendees),
  guestsCanModify: false,
  conferenceData: {
    createRequest: {
      requestId: randomUUID(),
      conferenceSolutionKey: { type: 'hangoutsMeet' },
    },
  },
  ...(occurrences > 1 && {
    recurrence: [`RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=${occurrences}`],
  }),
})

// The new times (and current founders) for an occurrence being moved.
export const rescheduledEvent = ({
  startAt,
  durationMinutes,
  timeZone,
  attendees,
}) => ({
  ...eventTimes(startAt, durationMinutes, timeZone),
  attendees: eventAttendees(attendees),
})

// Google usually adds the Meet link while creating the event; when it is
// still pending, read the event back once.
export const withMeetLink = async (google, event) => {
  if (event.hangoutLink) {
    return event
  }
  return google('getEvent', event.id)
}

const meetFields = event => ({
  meetUrl: event.hangoutLink ?? null,
  meetingCode: event.conferenceData?.conferenceId ?? null,
})

const eventStart = event => new Date(event.start?.dateTime ?? event.start?.date)

// The CheckIn fields for an event or for one occurrence of a series.
export const checkInFields = ({
  venture,
  event,
  durationMinutes,
  timeZone,
}) => {
  const scheduledAt = eventStart(event)
  return {
    venture: venture._id,
    mentor: venture.mentor,
    cycle_number: cycleForDate(venture.createdAt, scheduledAt),
    scheduledAt,
    originalStartAt: event.originalStartTime
      ? new Date(event.originalStartTime.dateTime)
      : scheduledAt,
    durationMinutes,
    timeZone,
    googleEventId: event.id,
    ...meetFields(event),
  }
}

// How many occurrences a series started in `cycle` gets: one per cycle
// through the last.
export const occurrencesFrom = cycle => CYCLES - cycle + 1

// Google's UNTIL format: 20261012T043000Z.
const rruleUntil = date =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')

// Stops a series before its next occurrence. Earlier occurrences stay on the
// calendars as a record; attendees get one update, not one per occurrence.
// Returns the ids of the check-ins it cancelled.
export const endSeries = async (series, google, now = new Date()) => {
  const upcoming = await CheckIn.find({
    series: series._id,
    status: 'SCHEDULED',
    scheduledAt: { $gt: now },
  }).sort({ originalStartAt: 1 })

  if (google) {
    const anyEarlier = await CheckIn.exists({
      series: series._id,
      scheduledAt: { $lte: now },
    })
    if (!anyEarlier) {
      await google('deleteEvent', series.googleEventId)
    } else if (upcoming.length) {
      const cutoff = new Date(
        Math.min(...upcoming.map(c => c.originalStartAt.getTime())) - 1000
      )
      await google('patchEvent', series.googleEventId, {
        recurrence: [
          `RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=${rruleUntil(cutoff)}`,
        ],
      })
    }
  }

  const ids = upcoming.map(c => c._id)
  await Promise.all([
    CheckIn.updateMany(
      { _id: { $in: ids } },
      { $set: { status: 'CANCELLED', cancelledAt: now } }
    ),
    CheckInSeries.updateOne(
      { _id: series._id },
      { $set: { status: 'ENDED', endedAt: now } }
    ),
  ])
  return ids
}

// Ends a series once none of its occurrences are left to happen.
export const endSeriesIfFinished = async seriesId => {
  if (!seriesId) {
    return
  }
  const left = await CheckIn.exists({
    series: seriesId,
    status: 'SCHEDULED',
    scheduledAt: { $gt: new Date() },
  })
  if (!left) {
    await CheckInSeries.updateOne(
      { _id: seriesId, status: 'ACTIVE' },
      { $set: { status: 'ENDED', endedAt: new Date() } }
    )
  }
}

const googleOrNull = async mentorId => {
  try {
    return await googleFor(mentorId)
  } catch {
    return null
  }
}

// Cancels the upcoming check-ins matching `filter` (e.g. a startup whose
// mentor changed, or a mentor who left). Removing them from Google is best
// effort: the portal's record is cancelled either way.
export const cancelFutureCheckIns = async filter => {
  const now = new Date()
  const upcoming = await CheckIn.find({
    ...filter,
    status: 'SCHEDULED',
    scheduledAt: { $gt: now },
  })
  const seriesIds = [
    ...new Set(upcoming.filter(c => c.series).map(c => String(c.series))),
  ]
  const singles = upcoming.filter(c => !c.series)

  for (const series of await CheckInSeries.find({ _id: { $in: seriesIds } })) {
    const google = await googleOrNull(series.mentor)
    try {
      await endSeries(series, google, now)
    } catch (error) {
      console.error('Could not end check-in series on Google:', error.message)
      await endSeries(series, null, now)
    }
  }

  for (const checkIn of singles) {
    const google = await googleOrNull(checkIn.mentor)
    try {
      await google?.('deleteEvent', checkIn.googleEventId)
    } catch (error) {
      console.error('Could not cancel check-in on Google:', error.message)
    }
  }
  await CheckIn.updateMany(
    { _id: { $in: singles.map(c => c._id) } },
    { $set: { status: 'CANCELLED', cancelledAt: now } }
  )
}

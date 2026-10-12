import CheckIn from '../models/checkIn.js'
import CheckInSeries from '../models/checkInSeries.js'
import ProgrammeSession from '../models/programmeSession.js'
import { findAttendees, googleFor } from './checkInHelper.js'
import { runSession, withSession } from './programmeScheduler.js'

// When a founder joins or leaves a startup, its upcoming meetings invite the
// founders it has now: the mentor's check-ins on the mentor's calendar, and
// the programme sessions already drawn. Best effort: a failure is logged and
// the join or leave goes ahead.

const emailsOf = attendees =>
  attendees
    .map(a => a.email)
    .sort()
    .join(',')

const refreshMentorCheckIns = async ventureId => {
  const [upcoming, attendees] = await Promise.all([
    CheckIn.find({
      venture: ventureId,
      session: null,
      status: 'SCHEDULED',
      scheduledAt: { $gt: new Date() },
    }),
    findAttendees(ventureId),
  ])
  // With nobody left to invite, the check-ins stay as they are.
  const stale = upcoming.filter(
    c => emailsOf(c.attendees) !== emailsOf(attendees)
  )
  if (!stale.length || !attendees.length) {
    return
  }
  const body = { attendees: attendees.map(({ email }) => ({ email })) }

  for (const mentorId of new Set(stale.map(c => String(c.mentor)))) {
    const google = await googleFor(mentorId)
    const own = stale.filter(c => String(c.mentor) === mentorId)
    // A series is one event, so its founders get one update. Occurrences
    // moved on their own carry their own invite list.
    const series = new Set()
    for (const checkIn of own) {
      const moved =
        checkIn.scheduledAt.getTime() !== checkIn.originalStartAt?.getTime()
      if (checkIn.series && !moved) {
        series.add(String(checkIn.series))
      } else {
        await google('patchEvent', checkIn.googleEventId, body)
      }
    }
    for (const { googleEventId } of await CheckInSeries.find({
      _id: { $in: [...series] },
    })) {
      await google('patchEvent', googleEventId, body)
    }
    await CheckIn.updateMany(
      { _id: { $in: own.map(c => c._id) } },
      { $set: { attendees } }
    )
  }
}

// Each session already drawn is brought in line; only what changed is
// touched, and only its people are emailed.
const refreshProgrammeSessions = async () => {
  const sessions = await ProgrammeSession.find({
    status: 'SCHEDULED',
    startsAt: { $gt: new Date() },
  }).select('_id')
  for (const { _id } of sessions) {
    await withSession(_id, session => runSession(session))
  }
}

export const refreshMeetingInvites = async ventureId => {
  const steps = [
    ['check-in', () => refreshMentorCheckIns(ventureId)],
    ['programme session', refreshProgrammeSessions],
  ]
  for (const [what, refresh] of steps) {
    try {
      await refresh()
    } catch (error) {
      console.error(`${what} invites not refreshed:`, error.message)
    }
  }
}

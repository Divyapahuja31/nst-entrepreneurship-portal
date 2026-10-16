import { cycleForDate } from '@nst/shared/biweeklyCycles.js'

import CheckIn from '../models/checkIn.js'
import Programme from '../models/programme.js'
import ProgrammeSession, { REGULAR } from '../models/programmeSession.js'
import {
  googleFor,
  meetFields,
  newMeet,
  transcriptDueAt,
  withMeetLink,
} from './checkInHelper.js'
import { getHostId } from './calendarHost.js'
import { appUrl } from './kpiLockEmails.js'
import {
  activeStaff,
  capacityProblem,
  drawAssignment,
  extraTitle,
  getProgramme,
  invitedStartups,
  keepAssignment,
  reportsOrigin,
  sessionDates,
  settingsFor,
  slotTimes,
} from './programme.js'
import {
  digest,
  revisionOf,
  sendCancellations,
  sendSessionEmails,
} from './programmeEmails.js'

// Puts programme sessions on the calendars. A session is scheduled
// `leadDays` before it: its meetings are drawn, created as events on the
// admin's (host's) Google Calendar with the staff and founders invited,
// saved as CheckIns and emailed. A later change (settings, staff, who is
// invited, or a redraw) is applied as a difference, so only the meetings
// that changed are touched and only their people are emailed.

const MINUTE_MS = 60 * 1000
const DAY_MS = 24 * 60 * MINUTE_MS
const LEASE_MS = 10 * MINUTE_MS

const minutesBetween = (from, to) => Math.round((to - from) / MINUTE_MS)

// Staff (ids or users) or attendees ({ user }), as one comparable string.
const idOf = item => {
  const target = item?.user ?? item
  return String(target?._id ?? target)
}
const idsOf = list => list.map(idOf).sort().join(',')

const eventBody = ({
  session,
  summary,
  startsAt,
  endsAt,
  timeZone,
  emails,
}) => ({
  summary,
  description: `${session.extra ? `${extraTitle(session)}.` : 'Bi-weekly programme session.'}\n\nYour check-ins: ${appUrl()}/checkins`,
  start: { dateTime: startsAt.toISOString(), timeZone },
  end: { dateTime: endsAt.toISOString(), timeZone },
  attendees: [...new Set(emails)].map(email => ({ email })),
  guestsCanModify: false,
})

// ----------------------------------------------------------- the plan

// The meetings a session should have: their staff, startups and times.
const planSession = ({ session, programme, startups, staff, assignment }) => {
  if (programme.mode === 'GROUP') {
    return startups.length
      ? [
          {
            staff,
            startups,
            startsAt: session.startsAt,
            endsAt: session.endsAt,
          },
        ]
      : []
  }
  const staffById = new Map(staff.map(s => [String(s._id), s]))
  const startupById = new Map(startups.map(s => [String(s.venture._id), s]))
  return slotTimes(assignment, session, programme).map(meeting => ({
    staff: [staffById.get(meeting.staffId)],
    startups: [startupById.get(meeting.ventureId)],
    startsAt: meeting.startsAt,
    endsAt: meeting.endsAt,
  }))
}

// Who met whom last time, in slot order: staff id -> startup ids.
const previousAssignment = rows => {
  const assignment = new Map()
  for (const row of rows.filter(r => !r.group)) {
    const staffId = String(row.mentor)
    if (!assignment.has(staffId)) {
      assignment.set(staffId, [])
    }
    if (row.venture) {
      assignment.get(staffId).push(String(row.venture._id))
    }
  }
  return assignment
}

// A session's rows by startup. A row whose startup was deleted keys on its
// own id, so it never matches the plan and is cancelled.
const rowsByVenture = rows =>
  new Map(rows.map(r => [String(r.venture?._id ?? r._id), r]))

// ------------------------------------------------------ people to tell

const founderLeaving = (row, attendee) => ({
  email: attendee.email,
  userId: attendee.user?._id ?? attendee.user,
  name: attendee.user?.username,
  ventureName: row.venture?.name,
  startsAt: row.scheduledAt,
  endsAt: new Date(row.scheduledAt.getTime() + row.durationMinutes * MINUTE_MS),
  key: `${row._id}:${attendee.user?._id ?? attendee.user}:${attendee.invitedAt?.getTime()}:cancelled`,
})

const staffLeaving = (row, member) => ({
  staff: true,
  email: member.email,
  userId: member._id,
  name: member.username,
  ventureName: row.venture?.name,
  startsAt: row.scheduledAt,
  endsAt: new Date(row.scheduledAt.getTime() + row.durationMinutes * MINUTE_MS),
  key: `${row._id}:${member._id}:${row.scheduledAt.toISOString()}${revisionOf(row)}:cancelled`,
})

// Keeps when each founder was first invited, so only new ones are new.
const attendeesFor = (founders, row) => {
  const before = new Map(
    (row?.attendees ?? []).map(a => [String(a.user?._id ?? a.user), a])
  )
  return founders.map(founder => ({
    user: founder._id,
    email: founder.email,
    invitedAt: before.get(String(founder._id))?.invitedAt ?? new Date(),
  }))
}

const removedFounders = (row, attendees) => {
  const kept = new Set(attendees.map(a => String(a.user)))
  return row.attendees.filter(a => !kept.has(String(a.user?._id ?? a.user)))
}

// ----------------------------------------------------- applying a plan

const rowFields = ({ session, programme, meeting, startup, attendees }) => ({
  venture: startup.venture._id,
  mentor: meeting.staff[0]._id,
  staff: meeting.staff.map(s => s._id),
  host: programme.host,
  session: session._id,
  group: programme.mode === 'GROUP',
  cycle_number: session.cycle_number,
  scheduledAt: meeting.startsAt,
  originalStartAt: meeting.startsAt,
  durationMinutes: minutesBetween(meeting.startsAt, meeting.endsAt),
  timeZone: programme.timeZone,
  attendees,
})

const createEvent = async (google, body) => {
  const event = await withMeetLink(
    google,
    await google('createEvent', { ...body, conferenceData: newMeet() })
  )
  return { googleEventId: event.id, ...meetFields(event) }
}

// Whether the meeting itself moves: its time, length or staff.
const isMoved = (row, meeting) =>
  row.scheduledAt.getTime() !== meeting.startsAt.getTime() ||
  row.durationMinutes !== minutesBetween(meeting.startsAt, meeting.endsAt) ||
  idsOf(row.staff) !== idsOf(meeting.staff)

const isChanged = (row, meeting, attendees) =>
  isMoved(row, meeting) || idsOf(row.attendees) !== idsOf(attendees)

const updateRow = async (row, meeting, fields) => {
  row.set({
    ...fields,
    revision: row.revision + (isMoved(row, meeting) ? 1 : 0),
    'transcript.nextPollAt': transcriptDueAt(
      fields.scheduledAt,
      fields.durationMinutes
    ),
  })
  await row.save()
}

// Cancels rows, deleting their events when `deleteEvents` (a group's event
// stays while other startups still meet in it). Collects who to tell.
const removeRows = async (rows, { google, tell, deleteEvents }) => {
  if (deleteEvents && google) {
    for (const eventId of new Set(rows.map(r => r.googleEventId))) {
      try {
        await google('deleteEvent', eventId)
      } catch (error) {
        console.error('Programme event not deleted:', error.message)
      }
    }
  }
  for (const row of rows) {
    tell.push(...row.attendees.map(a => founderLeaving(row, a)))
    if (deleteEvents) {
      tell.push(...row.staff.map(member => staffLeaving(row, member)))
    }
  }
  await CheckIn.updateMany(
    { _id: { $in: rows.map(r => r._id) } },
    { $set: { status: 'CANCELLED', cancelledAt: new Date() } }
  )
}

const applySlots = async (ctx, rows) => {
  const { google, programme, session, plan, tell } = ctx
  const kind = session.extra ? extraTitle(session) : 'bi-weekly check-in'
  const byVenture = rowsByVenture(rows)
  for (const meeting of plan) {
    const [startup] = meeting.startups
    const [member] = meeting.staff
    const row = byVenture.get(String(startup.venture._id))
    byVenture.delete(String(startup.venture._id))
    const attendees = attendeesFor(startup.founders, row)
    const body = eventBody({
      session,
      summary: `${startup.venture.name}: ${kind} with ${member.username}`,
      startsAt: meeting.startsAt,
      endsAt: meeting.endsAt,
      timeZone: programme.timeZone,
      emails: [member.email, ...attendees.map(a => a.email)],
    })
    const fields = rowFields({ ...ctx, meeting, startup, attendees })
    if (!row) {
      const event = await createEvent(google, body)
      await CheckIn.create({
        ...fields,
        ...event,
        transcript: {
          nextPollAt: transcriptDueAt(
            fields.scheduledAt,
            fields.durationMinutes
          ),
        },
      })
      continue
    }
    tell.push(
      ...removedFounders(row, attendees).map(a => founderLeaving(row, a))
    )
    if (!isChanged(row, meeting, attendees)) {
      continue
    }
    // A staff member taken off the meeting is told it's off for them.
    const staying = new Set(meeting.staff.map(s => String(s._id)))
    tell.push(
      ...row.staff
        .filter(s => !staying.has(String(s._id)))
        .map(s => staffLeaving(row, s))
    )
    await google('patchEvent', row.googleEventId, body)
    await updateRow(row, meeting, fields)
  }
  await removeRows([...byVenture.values()], { ...ctx, deleteEvents: true })
}

const applyGroup = async (ctx, rows) => {
  const { google, programme, session, plan } = ctx
  const [meeting] = plan
  if (!meeting) {
    await removeRows(rows, { ...ctx, deleteEvents: true })
    return
  }
  const byVenture = rowsByVenture(rows)
  const planned = meeting.startups.map(startup => ({
    startup,
    row: byVenture.get(String(startup.venture._id)),
  }))
  const everyone = planned.map(({ startup, row }) => ({
    startup,
    row,
    attendees: attendeesFor(startup.founders, row),
  }))
  const body = eventBody({
    session,
    summary: session.extra ? extraTitle(session) : 'Bi-weekly group session',
    startsAt: meeting.startsAt,
    endsAt: meeting.endsAt,
    timeZone: programme.timeZone,
    emails: [
      ...meeting.staff.map(s => s.email),
      ...everyone.flatMap(e => e.attendees.map(a => a.email)),
    ],
  })

  const event = rows.length
    ? {
        googleEventId: rows[0].googleEventId,
        meetUrl: rows[0].meetUrl,
        meetingCode: rows[0].meetingCode,
      }
    : await createEvent(google, body)
  const changed =
    rows.length !== everyone.length ||
    everyone.some(e => !e.row || isChanged(e.row, meeting, e.attendees))
  if (rows.length && changed) {
    await google('patchEvent', event.googleEventId, body)
  }

  for (const { startup, row, attendees } of everyone) {
    byVenture.delete(String(startup.venture._id))
    const fields = rowFields({ ...ctx, meeting, startup, attendees })
    if (!row) {
      await CheckIn.create({
        ...fields,
        ...event,
        transcript: {
          nextPollAt: transcriptDueAt(
            fields.scheduledAt,
            fields.durationMinutes
          ),
        },
      })
      continue
    }
    ctx.tell.push(
      ...removedFounders(row, attendees).map(a => founderLeaving(row, a))
    )
    if (isChanged(row, meeting, attendees)) {
      await updateRow(row, meeting, fields)
    }
  }
  // Startups no longer invited leave; the event stays for the rest.
  await removeRows([...byVenture.values()], { ...ctx, deleteEvents: false })
}

const loadRows = session =>
  CheckIn.find({ session: session._id, status: 'SCHEDULED' })
    .sort({ scheduledAt: 1 })
    .populate('venture', 'name')
    .populate('staff', 'username email')
    .populate('attendees.user', 'username')

// -------------------------------------------------- scheduling a session

const failure = async (session, problem, rows) => {
  session.set({ problem, status: rows.length ? 'SCHEDULED' : session.status })
  await session.save()
  return { problem }
}

const hostProblem =
  'An admin needs to connect Google Calendar on the Programme or Extra Sessions page.'

// The calendar host's Google, or null when there is none or they can't be
// reached.
const hostGoogle = async hostId => {
  try {
    return hostId ? await googleFor(hostId) : null
  } catch {
    return null
  }
}

// The draw as one string: each staff member's startups, in order.
const drawKey = assignment =>
  [...assignment]
    .filter(([, ventureIds]) => ventureIds.length)
    .map(([staffId, ventureIds]) => `${staffId}=${ventureIds.join(',')}`)
    .sort()
    .join(';')

const DRAW_TRIES = 20

// A new draw that differs from the previous one whenever another is
// possible, so Redraw always visibly redraws.
const redraw = (previous, ventureIds, staffIds) => {
  let draw
  for (let i = 0; i < DRAW_TRIES; i++) {
    draw = drawAssignment(ventureIds, staffIds)
    if (drawKey(draw) !== drawKey(previous)) {
      break
    }
  }
  return draw
}

// Everything needed to apply a session's plan, or { problem }. An extra
// session runs with its own settings on the programme's calendar.
const prepare = async (session, rows, fresh) => {
  const saved = await getProgramme()
  if (!saved && !session.extra) {
    return { problem: 'Set up the programme first.' }
  }
  const hostId = await getHostId()
  const programme = { ...settingsFor(saved, session), host: hostId }
  const [staff, startups] = await Promise.all([
    activeStaff(programme.staff),
    invitedStartups(programme),
  ])
  if (!staff.length) {
    return { problem: 'Add an active staff member to run the sessions.' }
  }
  const ventureIds = startups.map(s => String(s.venture._id))
  const staffIds = staff.map(s => String(s._id))
  const previous = previousAssignment(rows)
  let assignment
  if (!previous.size) {
    assignment = drawAssignment(ventureIds, staffIds)
  } else if (fresh) {
    assignment = redraw(previous, ventureIds, staffIds)
  } else {
    assignment = keepAssignment(previous, ventureIds, staffIds)
  }
  const plan = planSession({ session, programme, startups, staff, assignment })
  if (plan.some(meeting => meeting.endsAt > session.endsAt)) {
    return {
      problem:
        capacityProblem({ ...programme, staff: staffIds }, startups.length) ??
        'The meetings don’t fit in the session.',
    }
  }
  const google = await hostGoogle(hostId)
  return google ? { programme, plan, google } : { problem: hostProblem }
}

// Brings one session's meetings in line with the programme. `fresh` draws
// who meets whom again; otherwise the last draw is kept as far as it can
// be. Returns { problem } when it couldn't finish.
export const runSession = async (session, { fresh = false } = {}) => {
  const rows = await loadRows(session)
  const prepared = await prepare(session, rows, fresh)
  if (prepared.problem) {
    return failure(session, prepared.problem, rows)
  }
  const { programme, plan, google } = prepared

  const tell = []
  const ctx = { google, programme, session, plan, tell }
  const isGroup = programme.mode === 'GROUP'
  try {
    // A change of mode starts the session's meetings afresh.
    await removeRows(
      rows.filter(r => r.group !== isGroup),
      { ...ctx, deleteEvents: true }
    )
    const current = rows.filter(r => r.group === isGroup)
    await (isGroup ? applyGroup(ctx, current) : applySlots(ctx, current))
  } catch (error) {
    await sendCancellations(tell, programme, session)
    console.error(
      `Programme session ${session.number ?? extraTitle(session)} not scheduled:`,
      error
    )
    return failure(
      session,
      `Google Calendar refused a change: ${error.message}`,
      await loadRows(session)
    )
  }

  session.set({
    status: 'SCHEDULED',
    scheduledAt: session.scheduledAt ?? new Date(),
    problem: null,
  })
  await session.save()
  await sendCancellations(await stillLeaving(session, tell), programme, session)
  await sendSessionEmails(session, programme)
  return {}
}

// A staff member taken off one meeting but still running another in the
// session isn't told it's cancelled: their session email lists what they
// run now, and replaces the last one.
const stillLeaving = async (session, tell) => {
  const running = new Set(
    (await loadRows(session)).flatMap(row =>
      row.staff.map(member => String(member._id ?? member))
    )
  )
  return tell.filter(
    person => !(person.staff && running.has(String(person.userId)))
  )
}

// Cancels a session: its events come off the calendars and everyone in it
// is told once.
export const cancelSession = async session => {
  const saved = await getProgramme()
  const programme = saved || session.extra ? settingsFor(saved, session) : null
  const rows = await loadRows(session)
  const google = await hostGoogle(await getHostId())
  const tell = []
  await removeRows(rows, { google, tell, deleteEvents: false })
  if (google) {
    for (const eventId of new Set(rows.map(r => r.googleEventId))) {
      await google('deleteEvent', eventId).catch(error =>
        console.error('Programme event not deleted:', error.message)
      )
    }
  }
  // Staff hear once about the whole session, not once per startup.
  const staff = new Map(
    rows.flatMap(r => r.staff).map(member => [String(member._id), member])
  )
  // The meetings in the key: cancelled again after Schedule Now, the new
  // meetings are new news.
  const meetings = digest(
    rows
      .map(r => String(r._id))
      .sort()
      .join(',')
  )
  for (const member of staff.values()) {
    tell.push({
      email: member.email,
      userId: member._id,
      name: member.username,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      key: `${session._id}:${member._id}:${session.startsAt.toISOString()}:${meetings}:cancelled`,
    })
  }
  session.set({ status: 'CANCELLED', problem: null })
  await session.save()
  if (programme) {
    await sendCancellations(tell, programme, session)
  }
}

// ------------------------------------------------------ claims and jobs

// Runs `work` on the session while holding it, so two jobs (or a job and an
// admin) never change the same session at once. Returns null when another
// holds it.
export const withSession = async (sessionId, work, now = new Date()) => {
  const session = await ProgrammeSession.findOneAndUpdate(
    {
      _id: sessionId,
      $or: [{ claimedUntil: null }, { claimedUntil: { $lt: now } }],
    },
    { $set: { claimedUntil: new Date(now.getTime() + LEASE_MS) } },
    { returnDocument: 'after' }
  )
  if (!session) {
    return null
  }
  try {
    return await work(session)
  } finally {
    await ProgrammeSession.updateOne(
      { _id: sessionId },
      { $set: { claimedUntil: null } }
    )
  }
}

// Someone who can no longer run sessions (deactivated, or no longer staff)
// leaves the programme's staff, and the upcoming sessions they were in move
// their startups to the others, emailing only the people whose meeting
// changed.
export const removeProgrammeStaff = async (userId, now = new Date()) => {
  const [programme, extras] = await Promise.all([
    Programme.findOneAndUpdate(
      { key: 'programme', staff: userId },
      { $pull: { staff: userId } },
      { returnDocument: 'after' }
    ),
    ProgrammeSession.updateMany(
      { 'extra.staff': userId },
      { $pull: { 'extra.staff': userId } }
    ),
  ])
  if (!programme && !extras.modifiedCount) {
    return 0
  }
  const affected = await CheckIn.distinct('session', {
    session: { $ne: null },
    staff: userId,
    status: 'SCHEDULED',
    scheduledAt: { $gt: now },
  })
  let moved = 0
  for (const sessionId of affected) {
    const result = await withSession(sessionId, session =>
      session.status === 'SCHEDULED' ? runSession(session) : null
    )
    if (result && !result.problem) {
      moved += 1
    }
  }
  return moved
}

// Schedules the sessions now within their lead time, and retries scheduled
// ones a change couldn't finish. Run by the background job.
export const scheduleDueSessions = async (now = new Date()) => {
  // Extra sessions need no programme; they use its lead time when it has one.
  const programme = await getProgramme()
  const leadDays = programme?.leadDays ?? 7
  const horizon = new Date(now.getTime() + leadDays * DAY_MS)
  const due = await ProgrammeSession.find({
    startsAt: { $gt: now },
    $or: [
      { status: 'PLANNED', startsAt: { $lte: horizon } },
      { status: 'SCHEDULED', problem: { $ne: null } },
    ],
  }).sort({ startsAt: 1 })

  let done = 0
  for (const { _id, status } of due) {
    const result = await withSession(
      _id,
      session => runSession(session, { fresh: status === 'PLANNED' }),
      now
    )
    if (result && !result.problem) {
      done += 1
    }
  }
  return done
}

// After the settings change: sessions still to come get their new dates,
// and those already scheduled are brought in line (keeping the draw).
export const syncSessions = async (programme, now = new Date()) => {
  const toUpdate = []
  const origin = await reportsOrigin()
  for (const date of sessionDates(programme, origin)) {
    let session = await ProgrammeSession.findOne({ number: date.number })
    // A session already over stays as it was, unless the new dates put it
    // ahead (cycle 1 moved later): then the old one belonged to the old
    // calendar and a new one takes its place. Its meetings stay in the
    // startups' check-ins.
    if (session && session.startsAt <= now) {
      if (date.startsAt <= now) {
        continue
      }
      await ProgrammeSession.deleteOne({ _id: session._id })
      session = null
    }
    if (!session) {
      await ProgrammeSession.create(date)
      continue
    }
    session.set(date)
    await session.save()
    if (session.status !== 'SCHEDULED') {
      continue
    }
    // Moved into the past (cycle 1 moved earlier), it can't take place.
    if (date.startsAt <= now) {
      await withSession(session._id, cancelSession, now)
    } else {
      toUpdate.push(session._id)
    }
  }
  for (const id of toUpdate) {
    await withSession(id, session => runSession(session), now)
  }
  await scheduleDueSessions(now)
}

// Takes every upcoming meeting off the calendars, telling their people, and
// starts the sessions again from the settings, all planned. Meetings already
// held stay in the startups' check-ins. Returns false while a session is
// being updated; sessions cancelled by then stay cancelled, and clearing
// again finishes the job.
export const clearSessions = async (programme, now = new Date()) => {
  const busy = await ProgrammeSession.exists({ claimedUntil: { $gt: now } })
  if (busy) {
    return false
  }
  const scheduled = await ProgrammeSession.find({
    ...REGULAR,
    startsAt: { $gt: now },
    status: 'SCHEDULED',
  }).sort({ startsAt: 1 })
  for (const { _id } of scheduled) {
    if ((await withSession(_id, cancelSession, now)) === null) {
      return false
    }
  }
  // Extra sessions are left as they are.
  await ProgrammeSession.deleteMany(REGULAR)
  await ProgrammeSession.insertMany(
    sessionDates(programme, await reportsOrigin())
  )
  return true
}

// After the reports' start moves: each session, and its meetings in the
// startups' check-ins, is labelled with the report cycle it now falls in.
// The meetings themselves don't move.
export const relabelSessionCycles = async () => {
  const origin = await reportsOrigin()
  const sessions = await ProgrammeSession.find().select('startsAt cycle_number')
  for (const session of sessions) {
    const cycle = origin ? cycleForDate(origin, session.startsAt) : null
    if (cycle === session.cycle_number) {
      continue
    }
    await ProgrammeSession.updateOne(
      { _id: session._id },
      { $set: { cycle_number: cycle } }
    )
    await CheckIn.updateMany(
      { session: session._id },
      { $set: { cycle_number: cycle } }
    )
  }
}

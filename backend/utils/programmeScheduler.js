import CheckIn from '../models/checkIn.js'
import ProgrammeSession from '../models/programmeSession.js'
import {
  googleFor,
  meetFields,
  newMeet,
  transcriptDueAt,
  withMeetLink,
} from './checkInHelper.js'
import { appUrl } from './kpiLockEmails.js'
import {
  activeStaff,
  capacityProblem,
  drawAssignment,
  getProgramme,
  invitedStartups,
  keepAssignment,
  sessionDates,
  slotTimes,
} from './programme.js'
import { sendCancellations, sendSessionEmails } from './programmeEmails.js'

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

const eventBody = ({ summary, startsAt, endsAt, timeZone, emails }) => ({
  summary,
  description: `Bi-weekly programme session.\n\nYour check-ins: ${appUrl()}/checkins`,
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
    assignment.get(staffId).push(String(row.venture?._id ?? row.venture))
  }
  return assignment
}

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
  email: member.email,
  userId: member._id,
  name: member.username,
  ventureName: row.venture?.name,
  startsAt: row.scheduledAt,
  endsAt: new Date(row.scheduledAt.getTime() + row.durationMinutes * MINUTE_MS),
  key: `${row._id}:${member._id}:${row.scheduledAt.toISOString()}:cancelled`,
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

const isChanged = (row, meeting, attendees) =>
  row.scheduledAt.getTime() !== meeting.startsAt.getTime() ||
  row.durationMinutes !== minutesBetween(meeting.startsAt, meeting.endsAt) ||
  idsOf(row.staff) !== idsOf(meeting.staff) ||
  idsOf(row.attendees) !== idsOf(attendees)

const updateRow = async (row, fields) => {
  row.set({
    ...fields,
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
  const { google, programme, plan, tell } = ctx
  const byVenture = new Map(rows.map(r => [String(r.venture._id), r]))
  for (const meeting of plan) {
    const [startup] = meeting.startups
    const [member] = meeting.staff
    const row = byVenture.get(String(startup.venture._id))
    byVenture.delete(String(startup.venture._id))
    const attendees = attendeesFor(startup.founders, row)
    const body = eventBody({
      summary: `${startup.venture.name}: bi-weekly check-in with ${member.username}`,
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
    await updateRow(row, fields)
  }
  await removeRows([...byVenture.values()], { ...ctx, deleteEvents: true })
}

const applyGroup = async (ctx, rows) => {
  const { google, programme, plan } = ctx
  const [meeting] = plan
  if (!meeting) {
    await removeRows(rows, { ...ctx, deleteEvents: true })
    return
  }
  const byVenture = new Map(rows.map(r => [String(r.venture._id), r]))
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
    summary: 'Bi-weekly group session',
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
      await updateRow(row, fields)
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
  'Connect Google Calendar on the Programme page to schedule sessions.'

// The host admin's Google, or null when they can't be reached.
const hostGoogle = async programme => {
  try {
    return programme ? await googleFor(programme.host) : null
  } catch {
    return null
  }
}

// Everything needed to apply a session's plan, or { problem }.
const prepare = async (session, rows, fresh) => {
  const programme = await getProgramme()
  if (!programme) {
    return { problem: 'Set up the programme first.' }
  }
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
  const assignment =
    fresh || !previous.size
      ? drawAssignment(ventureIds, staffIds)
      : keepAssignment(previous, ventureIds, staffIds)
  const plan = planSession({ session, programme, startups, staff, assignment })
  if (plan.some(meeting => meeting.endsAt > session.endsAt)) {
    return {
      problem:
        capacityProblem(
          { ...programme.toObject(), staff: staffIds },
          startups.length
        ) ?? 'The meetings don’t fit in the session.',
    }
  }
  const google = await hostGoogle(programme)
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
    await sendCancellations(tell, programme)
    console.error(`Programme session ${session.number} not scheduled:`, error)
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
  await sendCancellations(tell, programme)
  await sendSessionEmails(session, programme)
  return {}
}

// Cancels a session: its events come off the calendars and everyone in it
// is told once.
export const cancelSession = async session => {
  const programme = await getProgramme()
  const rows = await loadRows(session)
  const google = await hostGoogle(programme)
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
  for (const member of staff.values()) {
    tell.push({
      email: member.email,
      userId: member._id,
      name: member.username,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      key: `${session._id}:${member._id}:${session.startsAt.toISOString()}:cancelled`,
    })
  }
  session.set({ status: 'CANCELLED', problem: null })
  await session.save()
  if (programme) {
    await sendCancellations(tell, programme)
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

// Schedules the sessions now within their lead time, and retries scheduled
// ones a change couldn't finish. Run by the background job.
export const scheduleDueSessions = async (now = new Date()) => {
  const programme = await getProgramme()
  if (!programme) {
    return 0
  }
  const horizon = new Date(now.getTime() + programme.leadDays * DAY_MS)
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
  for (const date of sessionDates(programme)) {
    const session = await ProgrammeSession.findOne({ number: date.number })
    if (!session) {
      await ProgrammeSession.create(date)
      continue
    }
    if (session.startsAt <= now) {
      continue
    }
    session.set(date)
    await session.save()
    if (session.status === 'SCHEDULED') {
      toUpdate.push(session._id)
    }
  }
  for (const id of toUpdate) {
    await withSession(id, session => runSession(session), now)
  }
  await scheduleDueSessions(now)
}

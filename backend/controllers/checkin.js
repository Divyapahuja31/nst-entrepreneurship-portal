import mongoose from 'mongoose'
import {
  canManageCheckIns,
  canReadCheckIns,
  canRunCheckIn,
  isBoard,
  isStaff,
  isStudent,
} from '@nst/shared/permissions.js'
import { CYCLES, cycleForDate, cycleStart } from '@nst/shared/biweeklyCycles.js'

import CheckIn from '../models/checkIn.js'
import CheckInSeries from '../models/checkInSeries.js'
import Venture from '../models/venture.js'
import { scopedVentureIds, ventureAccess } from '../utils/access.js'
import {
  checkInEvent,
  checkInFields,
  endSeries,
  endSeriesIfFinished,
  findAttendees,
  googleFor,
  occurrencesFrom,
  rescheduledEvent,
  transcriptDueAt,
  withMeetLink,
} from '../utils/checkInHelper.js'
import { findVentureForUser } from '../utils/founderHelper.js'
import { cycleOrigin } from '../utils/programme.js'
import { processCheckIn } from '../utils/transcriptPoller.js'

const DEFAULT_DURATION = 30
const MIN_DURATION = 15
const MAX_DURATION = 180

const VENTURE_FIELDS = 'name mentor createdAt'

const sameId = (a, b) => String(a) === String(b)

const programmeCheckIn = (req, res, { checkIn, venture, programme }) => {
  if (!programme) {
    res.status(409).json({
      error: 'Programme sessions are changed from the Programme page',
    })
    return null
  }
  if (!canRunCheckIn(req.user, checkIn.staff)) {
    res.status(403).json({ error: 'Only the staff running it can do that' })
    return null
  }
  return { checkIn, venture }
}

const POPULATE = [
  { path: 'venture', select: 'name' },
  { path: 'mentor', select: 'username email' },
  { path: 'staff', select: 'username email' },
  { path: 'attendees.user', select: 'username' },
]

// Lists leave out the transcript itself; GET /:id has it.
const loadCheckIns = filter =>
  CheckIn.find(filter)
    .select('-transcript.entries -transcript.text')
    .sort({ scheduledAt: 1 })
    .populate(POPULATE)

// Google failures carry their own status and message; anything else is ours.
const sendError = (res, error, fallback) => {
  if (error.name === 'GoogleError') {
    return res.status(error.status === 409 ? 409 : 502).json({
      error:
        error.status === 409
          ? error.message
          : `Google Calendar refused the change: ${error.message}`,
      ...(error.code && { code: error.code }),
    })
  }
  console.error(`${fallback}:`, error)
  return res.status(500).json({ error: fallback })
}

const isTimeZone = value => {
  if (typeof value !== 'string' || !value) {
    return false
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

// Checks the time of a new or moved check-in, against cycles counted from
// `origin`. Returns { error } or { startAt, durationMinutes, cycle }.
const parseTime = (body, origin, fallbackDuration = DEFAULT_DURATION) => {
  const startAt = new Date(body.startAt)
  if (typeof body.startAt !== 'string' || Number.isNaN(startAt.getTime())) {
    return { error: 'Choose a date and time' }
  }
  if (startAt.getTime() <= Date.now()) {
    return { error: 'Choose a time in the future' }
  }
  const durationMinutes =
    body.durationMinutes === undefined ? fallbackDuration : body.durationMinutes
  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes < MIN_DURATION ||
    durationMinutes > MAX_DURATION
  ) {
    return {
      error: `A check-in lasts ${MIN_DURATION} to ${MAX_DURATION} minutes`,
    }
  }
  const cycle = cycleForDate(origin, startAt)
  if (!cycle) {
    return {
      error: `Choose a time within the programme's ${CYCLES} cycles (they end ${cycleStart(
        origin,
        CYCLES + 1
      ).toDateString()})`,
    }
  }
  return { startAt, durationMinutes, cycle }
}

// The startup the caller names, if they may manage its check-ins. Sends the
// error response and returns null otherwise.
const findManagedVenture = async (req, res, ventureId) => {
  if (!mongoose.isValidObjectId(ventureId)) {
    res.status(400).json({ error: 'Valid ventureId is required' })
    return null
  }
  const venture = await Venture.findById(ventureId).select(VENTURE_FIELDS)
  if (!venture) {
    res.status(404).json({ error: 'Venture not found' })
    return null
  }
  if (!canManageCheckIns(req.user, venture.mentor)) {
    res
      .status(403)
      .json({ error: 'Only the startup mentor schedules its check-ins' })
    return null
  }
  return venture
}

// A check-in the caller may change, with its startup. Sends the error
// response and returns null otherwise. A programme meeting is moved and
// cancelled only through its session; its staff write its notes and check
// its transcript (`programme: true`).
const findManagedCheckIn = async (req, res, { programme = false } = {}) => {
  const { id } = req.params
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ error: 'Valid check-in id is required' })
    return null
  }
  const checkIn = await CheckIn.findById(id)
  if (!checkIn) {
    res.status(404).json({ error: 'Check-in not found' })
    return null
  }
  const venture = await Venture.findById(checkIn.venture).select(VENTURE_FIELDS)
  if (checkIn.session) {
    return programmeCheckIn(req, res, { checkIn, venture, programme })
  }
  if (!venture || !canManageCheckIns(req.user, venture.mentor)) {
    res
      .status(403)
      .json({ error: 'Only the startup mentor changes its check-ins' })
    return null
  }
  if (!sameId(checkIn.mentor, venture.mentor)) {
    res.status(409).json({
      error: "This check-in is on the previous mentor's calendar",
    })
    return null
  }
  return { checkIn, venture }
}

const isUpcoming = checkIn =>
  checkIn.status === 'SCHEDULED' && checkIn.scheduledAt.getTime() > Date.now()

const listForStudent = async (req, res) => {
  const venture = await findVentureForUser(req.user.id)
  const checkIns = venture ? await loadCheckIns({ venture: venture._id }) : []
  return res.json({ venture: venture && venture.id, checkIns })
}

const listForVenture = async (req, res, ventureId) => {
  if (!mongoose.isValidObjectId(ventureId)) {
    return res.status(400).json({ error: 'Valid ventureId is required' })
  }
  const venture = await Venture.findById(ventureId).select('mentor')
  if (!venture) {
    return res.status(404).json({ error: 'Venture not found' })
  }
  if (
    !canReadCheckIns(req.user, { mentorId: venture.mentor, isMember: false })
  ) {
    return res
      .status(403)
      .json({ error: 'This startup is not assigned to you' })
  }
  return res.json({
    venture: venture.id,
    checkIns: await loadCheckIns({ venture: venture._id }),
  })
}

// The check-ins a founder was invited to, across startups. A mentor sees
// only those of startups assigned to them.
const listForFounder = async (req, res, founderId) => {
  if (!mongoose.isValidObjectId(founderId)) {
    return res.status(400).json({ error: 'Valid founderId is required' })
  }
  const ventureIds = isBoard(req.user) ? null : await scopedVentureIds(req.user)
  return res.json({
    checkIns: await loadCheckIns({
      'attendees.user': founderId,
      ...(ventureIds && { venture: { $in: ventureIds } }),
    }),
  })
}

// Students see their own startup's check-ins. Staff name a startup, a
// founder for the check-ins that founder was invited to (their record), or
// `mine` for the programme meetings they run.
export const listCheckIns = async (req, res) => {
  try {
    const { ventureId, founderId, mine } = req.query
    if (isStudent(req.user)) {
      return await listForStudent(req, res)
    }
    if (!isStaff(req.user)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    if (ventureId) {
      return await listForVenture(req, res, ventureId)
    }
    if (founderId) {
      return await listForFounder(req, res, founderId)
    }
    if (mine) {
      return res.json({
        checkIns: await loadCheckIns({
          staff: req.user.id,
          session: { $ne: null },
        }),
      })
    }
    return res.status(400).json({ error: 'Name a ventureId or founderId' })
  } catch (error) {
    return sendError(res, error, 'Could not load check-ins')
  }
}

// Checks a new check-in for a startup. Returns { status, error } or
// { time, timeZone, occurrences, attendees }.
const parseNewCheckIn = async (body, venture) => {
  const origin = await cycleOrigin(venture)
  const time = parseTime(body, origin)
  if (time.error) {
    return { status: 400, error: time.error }
  }
  if (!isTimeZone(body.timeZone)) {
    return { status: 400, error: 'A valid timeZone is required' }
  }
  const occurrences = body.recurring === true ? occurrencesFrom(time.cycle) : 1
  if (
    occurrences > 1 &&
    (await CheckInSeries.exists({ venture: venture._id, status: 'ACTIVE' }))
  ) {
    return {
      status: 409,
      error:
        'This startup already has recurring check-ins. End them before starting new ones.',
    }
  }
  const attendees = await findAttendees(venture._id)
  if (!attendees.length) {
    return {
      status: 400,
      error: 'This startup has no active founders to invite',
    }
  }
  return { time, timeZone: body.timeZone, occurrences, attendees, origin }
}

// Schedules one check-in, or with `recurring` one every two weeks through
// the startup's last cycle. Google is written first: if it refuses, nothing
// is saved.
export const createCheckIns = async (req, res) => {
  try {
    const body = req.body ?? {}
    const venture = await findManagedVenture(req, res, body.ventureId)
    if (!venture) {
      return null
    }
    const parsed = await parseNewCheckIn(body, venture)
    if (parsed.error) {
      return res.status(parsed.status).json({ error: parsed.error })
    }
    const { time, timeZone, occurrences, attendees, origin } = parsed

    const google = await googleFor(req.user.id)
    const event = await withMeetLink(
      google,
      await google(
        'createEvent',
        checkInEvent({
          venture,
          ...time,
          timeZone,
          attendees,
          occurrences,
        })
      )
    )

    const fields = ev => ({
      ...checkInFields({
        venture,
        origin,
        event: { ...ev, hangoutLink: ev.hangoutLink ?? event.hangoutLink },
        durationMinutes: time.durationMinutes,
        timeZone,
      }),
      meetingCode: event.conferenceData?.conferenceId ?? null,
      attendees,
    })

    let series = null
    try {
      let created
      if (occurrences > 1) {
        const instances = await google('listInstances', event.id)
        series = await CheckInSeries.create({
          venture: venture._id,
          mentor: venture.mentor,
          googleEventId: event.id,
          startAt: time.startAt,
          durationMinutes: time.durationMinutes,
          timeZone,
        })
        created = await CheckIn.insertMany(
          instances.map(instance => ({
            ...fields(instance),
            series: series._id,
          }))
        )
      } else {
        created = [await CheckIn.create(fields(event))]
      }
      return res.status(201).json({
        checkIns: await loadCheckIns({ _id: { $in: created.map(c => c._id) } }),
      })
    } catch (error) {
      // Don't leave an event on the calendars the portal doesn't know about.
      await google('deleteEvent', event.id).catch(() => {})
      await series?.deleteOne()
      throw error
    }
  } catch (error) {
    return sendError(res, error, 'Could not schedule the check-in')
  }
}

// Moves one check-in (or one occurrence of a series). The invite goes to the
// startup's founders as they are now.
export const rescheduleCheckIn = async (req, res) => {
  try {
    const found = await findManagedCheckIn(req, res)
    if (!found) {
      return null
    }
    const { checkIn, venture } = found
    if (!isUpcoming(checkIn)) {
      return res
        .status(409)
        .json({ error: 'Only an upcoming check-in can be moved' })
    }

    const time = parseTime(
      req.body ?? {},
      await cycleOrigin(venture),
      checkIn.durationMinutes
    )
    if (time.error) {
      return res.status(400).json({ error: time.error })
    }
    const attendees = await findAttendees(venture._id)
    if (!attendees.length) {
      return res
        .status(400)
        .json({ error: 'This startup has no active founders to invite' })
    }

    const google = await googleFor(req.user.id)
    await google(
      'patchEvent',
      checkIn.googleEventId,
      rescheduledEvent({ ...time, timeZone: checkIn.timeZone, attendees })
    )

    checkIn.set({
      scheduledAt: time.startAt,
      durationMinutes: time.durationMinutes,
      cycle_number: time.cycle,
      attendees,
      'transcript.nextPollAt': transcriptDueAt(
        time.startAt,
        time.durationMinutes
      ),
    })
    await checkIn.save()
    return res.json({ checkIn: (await loadCheckIns({ _id: checkIn._id }))[0] })
  } catch (error) {
    return sendError(res, error, 'Could not move the check-in')
  }
}

// Cancels one check-in (or one occurrence of a series).
export const cancelCheckIn = async (req, res) => {
  try {
    const found = await findManagedCheckIn(req, res)
    if (!found) {
      return null
    }
    const { checkIn } = found
    if (!isUpcoming(checkIn)) {
      return res
        .status(409)
        .json({ error: 'Only an upcoming check-in can be cancelled' })
    }

    const google = await googleFor(req.user.id)
    await google('deleteEvent', checkIn.googleEventId)

    checkIn.set({ status: 'CANCELLED', cancelledAt: new Date() })
    await checkIn.save()
    await endSeriesIfFinished(checkIn.series)
    return res.json({ checkIn: (await loadCheckIns({ _id: checkIn._id }))[0] })
  } catch (error) {
    return sendError(res, error, 'Could not cancel the check-in')
  }
}

// Ends a recurring check-in: every upcoming occurrence is cancelled, the
// ones already held stay.
export const endCheckInSeries = async (req, res) => {
  try {
    const { seriesId } = req.params
    if (!mongoose.isValidObjectId(seriesId)) {
      return res.status(400).json({ error: 'Valid series id is required' })
    }
    const series = await CheckInSeries.findById(seriesId)
    if (!series) {
      return res.status(404).json({ error: 'Recurring check-in not found' })
    }
    const venture = await Venture.findById(series.venture).select('mentor')
    if (!venture || !canManageCheckIns(req.user, venture.mentor)) {
      return res
        .status(403)
        .json({ error: 'Only the startup mentor changes its check-ins' })
    }
    if (series.status !== 'ACTIVE' || !sameId(series.mentor, venture.mentor)) {
      return res
        .status(409)
        .json({ error: 'This recurring check-in has already ended' })
    }

    const cancelled = await endSeries(series, await googleFor(req.user.id))
    return res.json({
      checkIns: await loadCheckIns({ _id: { $in: cancelled } }),
    })
  } catch (error) {
    return sendError(res, error, 'Could not end the recurring check-in')
  }
}

const MAX_NOTES = 20000

// One check-in with its transcript and notes, for anyone who can read the
// startup.
export const getCheckIn = async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Valid check-in id is required' })
    }
    const checkIn = await CheckIn.findById(id).populate(POPULATE)
    if (!checkIn) {
      return res.status(404).json({ error: 'Check-in not found' })
    }
    const { mentorId, isMember } = await ventureAccess(
      req.user,
      checkIn.venture
    )
    const runsIt = checkIn.session && canRunCheckIn(req.user, checkIn.staff)
    if (!runsIt && !canReadCheckIns(req.user, { mentorId, isMember })) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    return res.json({ checkIn })
  } catch (error) {
    return sendError(res, error, 'Could not load the check-in')
  }
}

// The mentor's notes: what was discussed, or the record of a meeting Meet
// made no transcript of.
export const saveCheckInNotes = async (req, res) => {
  try {
    const { notes } = req.body ?? {}
    if (typeof notes !== 'string' || notes.length > MAX_NOTES) {
      return res
        .status(400)
        .json({ error: `Notes are text of at most ${MAX_NOTES} characters` })
    }
    const found = await findManagedCheckIn(req, res, { programme: true })
    if (!found) {
      return null
    }
    if (found.checkIn.status === 'CANCELLED') {
      return res
        .status(409)
        .json({ error: 'A cancelled check-in has no notes' })
    }
    found.checkIn.notes = notes
    await found.checkIn.save()
    return res.json({ notes: found.checkIn.notes })
  } catch (error) {
    return sendError(res, error, 'Could not save the notes')
  }
}

// Asks Meet for the transcript now instead of waiting for the poller.
export const refreshTranscript = async (req, res) => {
  try {
    const found = await findManagedCheckIn(req, res, { programme: true })
    if (!found) {
      return null
    }
    const { checkIn } = found
    const ended =
      checkIn.scheduledAt.getTime() + checkIn.durationMinutes * 60 * 1000 <=
      Date.now()
    if (
      !ended ||
      checkIn.status === 'CANCELLED' ||
      checkIn.transcript.status === 'READY'
    ) {
      return res
        .status(409)
        .json({ error: 'Only a check-in that has ended can be checked' })
    }
    const settled = await processCheckIn(checkIn, { manual: true })
    const updated = await CheckIn.findById(checkIn._id).populate(POPULATE)
    return res.json({ checkIn: updated, settled })
  } catch (error) {
    return sendError(res, error, 'Could not check for a transcript')
  }
}

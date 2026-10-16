import mongoose from 'mongoose'
import { cycleForDate } from '@nst/shared/biweeklyCycles.js'

import ProgrammeSession from '../models/programmeSession.js'
import {
  activeStaff,
  capacityProblem,
  getProgramme,
  invitedStartups,
  inviteList,
  parseExtraSession,
  reportsOrigin,
} from '../utils/programme.js'
import {
  cancelSession,
  runSession,
  withSession,
} from '../utils/programmeScheduler.js'
import { meetingsBySession } from './programme.js'

// Extra sessions: programme sessions on any day, apart from the bi-weekly
// calendar, added by an admin or the academic board (the route checks the
// role). Each runs like a bi-weekly session, as slots or one group meeting,
// with its own staff and invitations, and goes on the programme host's
// Google Calendar.

const EXTRA = { extra: { $ne: null } }

// Extra sessions have no number, which the unique index on number from
// before them doesn't allow twice. Brought up to date once per process.
let indexes = null
const ensureIndexes = () => {
  indexes ??= ProgrammeSession.syncIndexes().catch(error => {
    indexes = null
    throw error
  })
  return indexes
}

const ids = list => (list ?? []).map(String)

// What a new extra session starts from: the programme's settings.
const defaultsOf = programme =>
  programme && {
    mode: programme.mode,
    startTime: programme.startTime,
    endTime: programme.endTime,
    slotMinutes: programme.slotMinutes,
    gapMinutes: programme.gapMinutes,
    firstGapMinutes: programme.firstGapMinutes,
    staff: ids(programme.staff),
    excludedVentures: ids(programme.excludedVentures),
    excludedFounders: ids(programme.excludedFounders),
  }

const pageData = async () => {
  const programme = await getProgramme()
  const [invites, staffOptions, sessions] = await Promise.all([
    inviteList(null),
    activeStaff(),
    ProgrammeSession.find(EXTRA)
      .sort({ startsAt: -1 })
      .populate('extra.createdBy', 'username'),
  ])
  const meetings = await meetingsBySession(sessions)
  return {
    configured: Boolean(programme),
    timeZone: programme?.timeZone ?? 'Asia/Kolkata',
    defaults: defaultsOf(programme),
    staffOptions,
    invites,
    sessions: sessions.map(session => ({
      ...session.toObject(),
      extra: {
        ...session.extra.toObject(),
        staff: ids(session.extra.staff),
        excludedVentures: ids(session.extra.excludedVentures),
        excludedFounders: ids(session.extra.excludedFounders),
      },
      meetings: meetings.get(String(session._id)) ?? [],
    })),
  }
}

export const getExtraSessions = async (req, res) => {
  try {
    return res.json(await pageData())
  } catch (error) {
    console.error('Extra sessions load error:', error)
    return res.status(500).json({ error: 'Could not load the sessions' })
  }
}

const NO_PROGRAMME =
  'Set up the programme first: extra sessions go on its host’s Google Calendar.'

// The checked session from the body, or { status, field, error }.
const checkedSession = async (body, programme) => {
  const parsed = parseExtraSession(body ?? {}, programme.timeZone)
  if (parsed.error) {
    return { status: 400, ...parsed }
  }
  const { extra } = parsed.fields
  const staff = await activeStaff(extra.staff)
  if (staff.length !== extra.staff.length) {
    return {
      status: 400,
      field: 'staff',
      error: 'Only active staff accounts can run sessions',
    }
  }
  const settings = {
    ...extra,
    startTime: body.startTime,
    endTime: body.endTime,
  }
  const invited = (await invitedStartups(settings)).length
  if (!invited) {
    return {
      status: 400,
      field: 'invites',
      error: 'Invite at least one startup',
    }
  }
  const capacity = capacityProblem(settings, invited)
  if (capacity) {
    return { status: 400, field: 'capacity', error: capacity }
  }
  const origin = await reportsOrigin()
  return {
    fields: {
      ...parsed.fields,
      cycle_number: origin
        ? cycleForDate(origin, parsed.fields.startsAt)
        : null,
    },
  }
}

const refuse = (res, { status, field, error }) =>
  res.status(status).json({ error, field })

// Adds an extra session and schedules it straight away: its meetings are
// drawn, put on the host's calendar and emailed.
export const createExtraSession = async (req, res) => {
  try {
    const programme = await getProgramme()
    if (!programme) {
      return refuse(res, { status: 409, error: NO_PROGRAMME })
    }
    const checked = await checkedSession(req.body, programme)
    if (checked.error) {
      return refuse(res, checked)
    }
    await ensureIndexes()
    const session = await ProgrammeSession.create({
      ...checked.fields,
      extra: { ...checked.fields.extra, createdBy: req.user.id },
    })
    await withSession(session._id, claimed =>
      runSession(claimed, { fresh: true })
    )
    return res.status(201).json(await pageData())
  } catch (error) {
    console.error('Extra session create error:', error)
    return res.status(500).json({ error: 'Could not add the session' })
  }
}

// The upcoming extra session in the URL, or sends why there is none.
const findUpcoming = async (req, res) => {
  const { sessionId } = req.params
  if (!mongoose.isValidObjectId(sessionId)) {
    res.status(400).json({ error: 'Valid session id is required' })
    return null
  }
  const session = await ProgrammeSession.findOne({ _id: sessionId, ...EXTRA })
  if (!session) {
    res.status(404).json({ error: 'Session not found' })
    return null
  }
  if (session.startsAt <= new Date()) {
    res.status(409).json({ error: 'This session has already started' })
    return null
  }
  return session
}

const BUSY = 'This session is being updated. Try again in a moment.'

// Changes an upcoming extra session. Its meetings move, keeping who meets
// whom where they can; only people whose meeting changed are emailed. A
// cancelled one is scheduled again.
export const updateExtraSession = async (req, res) => {
  try {
    const programme = await getProgramme()
    if (!programme) {
      return refuse(res, { status: 409, error: NO_PROGRAMME })
    }
    const found = await findUpcoming(req, res)
    if (!found) {
      return null
    }
    const checked = await checkedSession(req.body, programme)
    if (checked.error) {
      return refuse(res, checked)
    }
    const result = await withSession(found._id, session => {
      const fresh = session.status !== 'SCHEDULED'
      session.set({
        ...checked.fields,
        extra: { ...checked.fields.extra, createdBy: session.extra.createdBy },
        status: session.status === 'CANCELLED' ? 'PLANNED' : session.status,
      })
      return session.save().then(saved => runSession(saved, { fresh }))
    })
    if (result === null) {
      return res.status(409).json({ error: BUSY })
    }
    return res.json(await pageData())
  } catch (error) {
    console.error('Extra session update error:', error)
    return res.status(500).json({ error: 'Could not change the session' })
  }
}

// Takes an upcoming extra session off the calendars, telling everyone in it.
export const cancelExtraSession = async (req, res) => {
  try {
    const found = await findUpcoming(req, res)
    if (!found) {
      return null
    }
    if (found.status === 'CANCELLED') {
      return res
        .status(409)
        .json({ error: 'This session is already cancelled' })
    }
    const result = await withSession(found._id, cancelSession)
    if (result === null) {
      return res.status(409).json({ error: BUSY })
    }
    return res.json(await pageData())
  } catch (error) {
    console.error('Extra session cancel error:', error)
    return res.status(500).json({ error: 'Could not cancel the session' })
  }
}

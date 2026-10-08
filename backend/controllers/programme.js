import mongoose from 'mongoose'

import CheckIn from '../models/checkIn.js'
import GoogleCredential from '../models/googleCredential.js'
import Programme from '../models/programme.js'
import ProgrammeSession from '../models/programmeSession.js'
import User from '../models/user.js'
import {
  activeStaff,
  capacityProblem,
  getProgramme,
  inviteList,
  parseProgramme,
  slotsPerStaff,
} from '../utils/programme.js'
import {
  cancelSession,
  runSession,
  syncSessions,
  withSession,
} from '../utils/programmeScheduler.js'

// The programme page: settings, who runs and who is invited, and the
// sessions. The route allows admins only.

const DEFAULTS = {
  startDate: null,
  weekday: 4,
  startTime: '18:00',
  endTime: '20:00',
  timeZone: 'Asia/Kolkata',
  mode: 'SLOTS',
  staff: [],
  excludedVentures: [],
  excludedFounders: [],
  slotMinutes: 15,
  gapMinutes: 0,
  firstGapMinutes: 0,
  leadDays: 7,
}

const SETTINGS = Object.keys(DEFAULTS)

const settingsOf = programme =>
  Object.fromEntries(
    SETTINGS.map(key => {
      const value = programme ? programme[key] : DEFAULTS[key]
      return [key, Array.isArray(value) ? value.map(String) : value]
    })
  )

// The session meetings, by session id.
const meetingsBySession = async sessions => {
  const rows = await CheckIn.find({
    session: { $in: sessions.map(s => s._id) },
    status: { $ne: 'CANCELLED' },
  })
    .select(
      'session venture staff scheduledAt durationMinutes meetUrl group googleEventId status transcript.status'
    )
    .sort({ scheduledAt: 1 })
    .populate('venture', 'name')
    .populate('staff', 'username')
  const bySession = new Map()
  for (const row of rows) {
    const id = String(row.session)
    bySession.set(id, [...(bySession.get(id) ?? []), row])
  }
  return bySession
}

const hostOf = async (programme, user) => {
  const hostId = programme?.host ?? user.id
  const [host, credential] = await Promise.all([
    User.findById(hostId).select('username email'),
    GoogleCredential.findOne({ user: hostId }),
  ])
  return {
    id: String(hostId),
    username: host?.username ?? null,
    email: host?.email ?? null,
    connected: Boolean(credential) && !credential.needsReconnect,
    isYou: String(hostId) === String(user.id),
  }
}

const overview = async user => {
  const programme = await getProgramme()
  const settings = settingsOf(programme)
  const [invites, staffOptions, sessions, host] = await Promise.all([
    inviteList(programme),
    activeStaff(),
    ProgrammeSession.find().sort({ number: 1 }),
    hostOf(programme, user),
  ])
  const meetings = await meetingsBySession(sessions)
  const invited = invites.filter(
    s => s.included && s.founders.some(f => f.included)
  ).length

  return {
    programme: settings,
    configured: Boolean(programme),
    host,
    staffOptions,
    invites,
    capacity: {
      perStaff: slotsPerStaff(settings),
      staff: settings.staff.length,
      startups: invited,
    },
    sessions: sessions.map(session => ({
      ...session.toObject(),
      meetings: meetings.get(String(session._id)) ?? [],
    })),
  }
}

export const getProgrammePage = async (req, res) => {
  try {
    return res.json(await overview(req.user))
  } catch (error) {
    console.error('Programme load error:', error)
    return res.status(500).json({ error: 'Could not load the programme' })
  }
}

// Checks and saves the settings, then brings the sessions in line: dates
// move, and sessions already scheduled change only where they must.
export const saveProgramme = async (req, res) => {
  try {
    const parsed = parseProgramme(req.body ?? {})
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error, field: parsed.field })
    }
    const draft = parsed.fields
    const staff = await activeStaff(draft.staff)
    if (staff.length !== draft.staff.length) {
      return res.status(400).json({
        field: 'staff',
        error: 'Only active staff accounts can run sessions',
      })
    }
    const invites = await inviteList(draft)
    const invited = invites.filter(
      s => s.included && s.founders.some(f => f.included)
    ).length
    const capacity = capacityProblem(draft, invited)
    if (capacity) {
      return res.status(400).json({ field: 'capacity', error: capacity })
    }

    // The admin who first saves the programme hosts its events.
    const programme = await Programme.findOneAndUpdate(
      { key: 'programme' },
      { $set: draft, $setOnInsert: { host: req.user.id } },
      { upsert: true, returnDocument: 'after', runValidators: true }
    )
    await syncSessions(programme)
    return res.json(await overview(req.user))
  } catch (error) {
    console.error('Programme save error:', error)
    return res.status(500).json({ error: 'Could not save the programme' })
  }
}

// Runs `work` on one upcoming session, then answers with the page.
const onSession =
  (work, { when } = {}) =>
  async (req, res) => {
    try {
      const { sessionId } = req.params
      if (!mongoose.isValidObjectId(sessionId)) {
        return res.status(400).json({ error: 'Valid session id is required' })
      }
      const session = await ProgrammeSession.findById(sessionId)
      if (!session) {
        return res.status(404).json({ error: 'Session not found' })
      }
      if (session.startsAt <= new Date()) {
        return res
          .status(409)
          .json({ error: 'This session has already started' })
      }
      const refusal = when?.(session)
      if (refusal) {
        return res.status(409).json({ error: refusal })
      }
      const result = await withSession(session._id, work)
      if (result === null) {
        return res.status(409).json({
          error: 'This session is being updated. Try again in a moment.',
        })
      }
      return res.json(await overview(req.user))
    } catch (error) {
      console.error('Programme session error:', error)
      return res.status(500).json({ error: 'Could not update the session' })
    }
  }

// Schedules a session now instead of waiting for its lead time. A cancelled
// one comes back.
export const scheduleSessionNow = onSession(session => {
  const fresh = session.status !== 'SCHEDULED'
  if (session.status === 'CANCELLED') {
    session.status = 'PLANNED'
  }
  return runSession(session, { fresh })
})

// Draws who meets whom again.
export const redrawSession = onSession(
  session => runSession(session, { fresh: true }),
  {
    when: session =>
      session.status !== 'SCHEDULED' &&
      'Only a scheduled session can be drawn again',
  }
)

export const cancelProgrammeSession = onSession(cancelSession, {
  when: session =>
    session.status === 'CANCELLED' && 'This session is already cancelled',
})

import mongoose from 'mongoose'

import CheckIn from '../models/checkIn.js'
import Programme from '../models/programme.js'
import ProgrammeSession, { REGULAR } from '../models/programmeSession.js'
import ReportSchedule from '../models/reportSchedule.js'
import { hostForNewProgramme, hostStatus } from '../utils/calendarHost.js'
import {
  activeStaff,
  capacityProblem,
  getProgramme,
  getReportSchedule,
  inviteList,
  parseProgramme,
  parseReportSchedule,
  reportsOrigin,
  slotsPerStaff,
} from '../utils/programme.js'
import {
  cancelSession,
  clearSessions,
  relabelSessionCycles,
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
export const meetingsBySession = async sessions => {
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

// When the reports start: the date an admin set for them (null until then)
// and the moment cycle 1 opens, which follows the sessions while no date is
// set.
const reportsOverview = async () => {
  const [schedule, startsAt] = await Promise.all([
    getReportSchedule().lean(),
    reportsOrigin(),
  ])
  return {
    startDate: schedule?.startDate ?? null,
    timeZone: schedule?.timeZone ?? DEFAULTS.timeZone,
    startsAt,
  }
}

const overview = async user => {
  const programme = await getProgramme()
  const settings = settingsOf(programme)
  const [invites, staffOptions, sessions, host, reports] = await Promise.all([
    inviteList(programme),
    activeStaff(),
    ProgrammeSession.find(REGULAR).sort({ number: 1 }),
    hostStatus(user),
    reportsOverview(),
  ])
  // Only people who can still run sessions: a deactivated account left in
  // the settings would otherwise be counted but not shown, and block saving.
  const active = new Set(staffOptions.map(s => String(s._id)))
  settings.staff = settings.staff.filter(id => active.has(id))
  const meetings = await meetingsBySession(sessions)
  const invited = invites.filter(
    s => s.included && s.founders.some(f => f.included)
  ).length

  return {
    programme: settings,
    configured: Boolean(programme),
    reports,
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

    // The calendar host holds its events; with none yet, the admin who
    // first saves it.
    const programme = await Programme.findOneAndUpdate(
      { key: 'programme' },
      {
        $set: draft,
        $setOnInsert: { host: await hostForNewProgramme(req.user.id) },
      },
      { upsert: true, returnDocument: 'after', runValidators: true }
    )
    await syncSessions(programme)
    return res.json(await overview(req.user))
  } catch (error) {
    console.error('Programme save error:', error)
    return res.status(500).json({ error: 'Could not save the programme' })
  }
}

// Sets when the bi-weekly reports start, apart from the sessions. Needs no
// Google connection. Reports already filed keep their cycle numbers.
export const saveReportSchedule = async (req, res) => {
  try {
    const parsed = parseReportSchedule(req.body ?? {})
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error, field: parsed.field })
    }
    await ReportSchedule.findOneAndUpdate(
      { key: 'reports' },
      { $set: parsed.fields },
      { upsert: true, runValidators: true }
    )
    await relabelSessionCycles()
    return res.json(await overview(req.user))
  } catch (error) {
    console.error('Report schedule save error:', error)
    return res
      .status(500)
      .json({ error: 'Could not save when the reports start' })
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
      const session = await ProgrammeSession.findOne({
        _id: sessionId,
        ...REGULAR,
      })
      if (!session) {
        return res.status(404).json({ error: 'Session not found' })
      }
      if (session.startsAt <= new Date()) {
        return res
          .status(409)
          .json({ error: 'This session has already started' })
      }
      const refusal = await when?.(session)
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

// Draws who meets whom again. A group session has no draw.
export const redrawSession = onSession(
  session => runSession(session, { fresh: true }),
  {
    when: async session => {
      if (session.status !== 'SCHEDULED') {
        return 'Only a scheduled session can be drawn again'
      }
      const programme = await getProgramme()
      return (
        programme?.mode === 'GROUP' &&
        'A group session has no draw: everyone meets together'
      )
    },
  }
)

export const cancelProgrammeSession = onSession(cancelSession, {
  when: session =>
    session.status === 'CANCELLED' && 'This session is already cancelled',
})

// Clears every meeting and starts the sessions again from the settings.
export const clearProgrammeSessions = async (req, res) => {
  try {
    const programme = await getProgramme()
    if (!programme) {
      return res.status(409).json({ error: 'Set up the programme first' })
    }
    if (!(await clearSessions(programme))) {
      return res.status(409).json({
        error: 'A session is being updated. Try again in a moment.',
      })
    }
    return res.json(await overview(req.user))
  } catch (error) {
    console.error('Programme clear error:', error)
    return res.status(500).json({ error: 'Could not clear the meetings' })
  }
}

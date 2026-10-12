import crypto from 'node:crypto'
import mongoose from 'mongoose'
import { CYCLES, CYCLE_DAYS, cycleForDate } from '@nst/shared/biweeklyCycles.js'
import { STAFF_ROLES } from '@nst/shared/permissions.js'

import Founder from '../models/founder.js'
import Programme from '../models/programme.js'
import Role from '../models/role.js'
import User from '../models/user.js'

// The programme's calendar: when sessions fall, who runs them, who is
// invited and how a session's slots are drawn. Everything here except the
// lookups is pure, so tests can check it directly.

const MINUTE_MS = 60 * 1000
const DAY_MS = 24 * 60 * MINUTE_MS

// ------------------------------------------------------------ time zones

const zoneParts = (date, timeZone) =>
  Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
      .formatToParts(date)
      .map(part => [part.type, Number(part.value)])
  )

// How far timeZone is ahead of UTC at that moment.
const zoneOffset = (date, timeZone) => {
  const p = zoneParts(date, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - Math.floor(date.getTime() / 1000) * 1000
}

// The moment it is `hhmm` on day `ymd` (YYYY-MM-DD) in timeZone. Checked
// twice so a daylight-saving change between the guess and the answer
// can't throw it off.
export const zonedDate = (ymd, hhmm, timeZone) => {
  const [y, m, d] = ymd.split('-').map(Number)
  const [hh, mm] = hhmm.split(':').map(Number)
  const guess = Date.UTC(y, m - 1, d, hh, mm)
  const first = guess - zoneOffset(new Date(guess), timeZone)
  return new Date(guess - zoneOffset(new Date(first), timeZone))
}

const addDays = (ymd, days) =>
  new Date(Date.parse(`${ymd}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10)

const weekdayOf = ymd => new Date(`${ymd}T00:00:00Z`).getUTCDay()

const minutesOf = hhmm => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// ------------------------------------------------------------- sessions

// When cycle 1 starts: midnight of the start date in the programme's zone.
export const programmeStart = programme =>
  zonedDate(programme.startDate, '00:00', programme.timeZone)

// One session per cycle: the first `weekday` on or after the start date,
// then every two weeks.
export const sessionDates = programme => {
  const first = addDays(
    programme.startDate,
    (programme.weekday - weekdayOf(programme.startDate) + 7) % 7
  )
  const origin = programmeStart(programme)
  return Array.from({ length: CYCLES }, (_, i) => {
    const day = addDays(first, i * CYCLE_DAYS)
    const startsAt = zonedDate(day, programme.startTime, programme.timeZone)
    return {
      number: i + 1,
      startsAt,
      endsAt: zonedDate(day, programme.endTime, programme.timeZone),
      cycle_number: cycleForDate(origin, startsAt),
    }
  })
}

export const getProgramme = () => Programme.findOne({ key: 'programme' })

// Where a startup's cycles count from: the programme's start once an admin
// has set one, before that the day the startup was created.
export const cycleOrigin = async venture => {
  const programme = await getProgramme().select('startDate timeZone').lean()
  return programme ? programmeStart(programme) : venture.createdAt
}

// ------------------------------------------------------------- capacity

// How many slots one staff member can run in a session.
export const slotsPerStaff = programme => {
  const window =
    minutesOf(programme.endTime) -
    minutesOf(programme.startTime) -
    programme.firstGapMinutes
  if (window < programme.slotMinutes) {
    return 0
  }
  return Math.floor(
    (window + programme.gapMinutes) /
      (programme.slotMinutes + programme.gapMinutes)
  )
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

// Why the invited startups don't fit, or null when they do.
export const capacityProblem = (programme, startupCount) => {
  if (programme.mode !== 'SLOTS') {
    return null
  }
  const perStaff = slotsPerStaff(programme)
  const staffCount = programme.staff.length
  const total = perStaff * staffCount
  if (total >= startupCount) {
    return null
  }
  return `${plural(startupCount, 'startup')} need ${plural(startupCount, 'slot')}; ${plural(staffCount, 'staff member')} × ${plural(perStaff, 'slot')} = ${total}. Add someone, shorten the slots or widen the window.`
}

// ----------------------------------------------------------- validation

const isTimeZone = value => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return typeof value === 'string' && value.length > 0
  } catch {
    return false
  }
}

const isDay = value =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  new Date(`${value}T00:00:00Z`).toISOString().startsWith(value)

const isTime = value =>
  typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)

const intIn = (value, min, max) =>
  Number.isInteger(value) && value >= min && value <= max

const idList = value =>
  Array.isArray(value) && value.every(id => mongoose.isValidObjectId(id))
    ? [...new Set(value.map(String))]
    : null

const NUMBERS = [
  ['weekday', 0, 6, 'Choose a day of the week'],
  ['slotMinutes', 5, 120, 'A slot lasts 5 to 120 minutes'],
  ['gapMinutes', 0, 60, 'The gap between slots is 0 to 60 minutes'],
  [
    'firstGapMinutes',
    0,
    120,
    'The gap before the first slot is 0 to 120 minutes',
  ],
  ['leadDays', 1, 13, 'Schedule each session 1 to 13 days ahead'],
]

// The first problem with the dates and times, or null.
const timingProblem = body => {
  if (!isDay(body.startDate)) {
    return { field: 'startDate', error: 'Choose the date cycle 1 starts' }
  }
  const number = NUMBERS.find(
    ([field, min, max]) => !intIn(body[field], min, max)
  )
  if (number) {
    return { field: number[0], error: number[3] }
  }
  if (!isTime(body.startTime) || !isTime(body.endTime)) {
    return { field: 'startTime', error: 'Choose a start and end time' }
  }
  if (minutesOf(body.endTime) <= minutesOf(body.startTime)) {
    return { field: 'endTime', error: 'The session must end after it starts' }
  }
  if (!isTimeZone(body.timeZone)) {
    return { field: 'timeZone', error: 'Choose a valid time zone' }
  }
  if (!['GROUP', 'SLOTS'].includes(body.mode)) {
    return { field: 'mode', error: 'Choose group or slots' }
  }
  return null
}

// Checks the settings an admin sent. Returns { field, error } or { fields }.
// Staff and capacity are checked against the database by the caller.
export const parseProgramme = body => {
  const problem = timingProblem(body)
  if (problem) {
    return problem
  }
  const staff = idList(body.staff)
  if (!staff?.length) {
    return {
      field: 'staff',
      error: 'Add at least one person to run the sessions',
    }
  }
  const excludedVentures = idList(body.excludedVentures ?? [])
  const excludedFounders = idList(body.excludedFounders ?? [])
  if (!excludedVentures || !excludedFounders) {
    return { field: 'invites', error: 'The invite list is not valid' }
  }
  const pick = fields => Object.fromEntries(fields.map(f => [f, body[f]]))
  return {
    fields: {
      ...pick(['startDate', 'startTime', 'endTime', 'timeZone', 'mode']),
      ...pick(NUMBERS.map(([field]) => field)),
      staff,
      excludedVentures,
      excludedFounders,
    },
  }
}

// The active staff accounts (admin, academic board or mentor), or only
// those among ids.
export const activeStaff = async (ids = null) => {
  const roles = await Role.find({ name: { $in: STAFF_ROLES } }).select('_id')
  return User.find({
    ...(ids && { _id: { $in: ids } }),
    deletedAt: null,
    role: { $in: roles.map(r => r._id) },
  })
    .select('username email')
    .sort({ username: 1 })
}

// ------------------------------------------------------------ invitations

// Every startup with active founders, each startup and founder marked
// whether the programme invites them.
export const inviteList = async programme => {
  const outVentures = new Set((programme?.excludedVentures ?? []).map(String))
  const outFounders = new Set((programme?.excludedFounders ?? []).map(String))
  const founders = await Founder.find({ status: 'ACTIVE' })
    .populate('user', 'username email deletedAt')
    .populate('venture', 'name')

  const byVenture = new Map()
  for (const { user, venture } of founders) {
    if (!venture || !user || user.deletedAt) {
      continue
    }
    const id = String(venture._id)
    if (!byVenture.has(id)) {
      byVenture.set(id, {
        venture: { _id: venture._id, name: venture.name },
        included: !outVentures.has(id),
        founders: [],
      })
    }
    byVenture.get(id).founders.push({
      _id: user._id,
      username: user.username,
      email: user.email,
      included: !outFounders.has(String(user._id)),
    })
  }
  return [...byVenture.values()].sort((a, b) =>
    a.venture.name.localeCompare(b.venture.name)
  )
}

// The startups invited, each with only its invited founders. A startup with
// none left isn't invited.
export const invitedStartups = async programme =>
  (await inviteList(programme))
    .filter(startup => startup.included)
    .map(startup => ({
      ...startup,
      founders: startup.founders.filter(founder => founder.included),
    }))
    .filter(startup => startup.founders.length > 0)

// ------------------------------------------------------------ the draw

// A random whole number from 0 up to (not including) max.
export const cryptoRandom = max => crypto.randomInt(max)

const shuffle = (items, random) => {
  const list = [...items]
  for (let i = list.length - 1; i > 0; i--) {
    const j = random(i + 1)
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

// Who meets whom: staff id -> the startup ids they meet, in order. Startups
// are dealt at random and evenly across the staff.
export const drawAssignment = (ventureIds, staffIds, random = cryptoRandom) => {
  const staff = shuffle(staffIds.map(String), random)
  const assignment = new Map(staff.map(id => [id, []]))
  shuffle(ventureIds.map(String), random).forEach((ventureId, i) =>
    assignment.get(staff[i % staff.length]).push(ventureId)
  )
  return assignment
}

// The previous assignment changed as little as possible. Startups and staff
// no longer in the programme leave; new startups, and those whose staff
// member left, go to whoever has the fewest.
export const keepAssignment = (
  previous,
  ventureIds,
  staffIds,
  random = cryptoRandom
) => {
  const ventures = new Set(ventureIds.map(String))
  const assignment = new Map(staffIds.map(id => [String(id), []]))
  const placed = new Set()
  for (const [staffId, list] of previous) {
    for (const ventureId of assignment.has(staffId) ? list : []) {
      if (ventures.has(ventureId) && !placed.has(ventureId)) {
        assignment.get(staffId).push(ventureId)
        placed.add(ventureId)
      }
    }
  }
  const left = shuffle(
    [...ventures].filter(id => !placed.has(id)),
    random
  )
  for (const ventureId of left) {
    const lists = [...assignment.values()]
    const fewest = Math.min(...lists.map(list => list.length))
    const candidates = lists.filter(list => list.length === fewest)
    candidates[random(candidates.length)].push(ventureId)
  }
  return assignment
}

// Each staff member's startups one after another from the session's start
// (after the first gap). Different staff members run at the same time.
export const slotTimes = (assignment, session, programme) => {
  const first =
    new Date(session.startsAt).getTime() + programme.firstGapMinutes * MINUTE_MS
  const step = (programme.slotMinutes + programme.gapMinutes) * MINUTE_MS
  const meetings = []
  for (const [staffId, ventureIds] of assignment) {
    ventureIds.forEach((ventureId, k) => {
      const startsAt = new Date(first + k * step)
      meetings.push({
        staffId,
        ventureId,
        startsAt,
        endsAt: new Date(
          startsAt.getTime() + programme.slotMinutes * MINUTE_MS
        ),
      })
    })
  }
  return meetings
}

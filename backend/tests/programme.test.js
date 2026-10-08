import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { CYCLES } from '@nst/shared/biweeklyCycles.js'

import app from '../app.js'
import CheckIn from '../models/checkIn.js'
import Founder from '../models/founder.js'
import ProgrammeSession from '../models/programmeSession.js'
import {
  drawAssignment,
  keepAssignment,
  parseProgramme,
  sessionDates,
  slotTimes,
} from '../utils/programme.js'
import { pollTranscripts } from '../utils/transcriptPoller.js'
import {
  connectCalendar,
  cookieFor,
  google,
  seed,
  sentEmails,
  startDatabase,
  stopDatabase,
} from './helpers.js'

// Alpha: founded by `owner`, mentored by `mentor`. Beta: founded by
// `outsider`, mentored by `otherMentor`. `admin` hosts the programme.
let data
const as = user => ({
  get: url => request(app).get(url).set('Cookie', cookieFor(user)),
  put: (url, body) =>
    request(app).put(url).set('Cookie', cookieFor(user)).send(body),
  post: (url, body) =>
    request(app).post(url).set('Cookie', cookieFor(user)).send(body),
  patch: (url, body) =>
    request(app).patch(url).set('Cookie', cookieFor(user)).send(body),
})

const DAY_MS = 24 * 60 * 60 * 1000
const TZ = 'Asia/Kolkata'
const ymdIn = (date, timeZone = TZ) =>
  new Intl.DateTimeFormat('en-CA', { timeZone }).format(date)
const today = () => ymdIn(new Date())
const weekdayOf = ymd => new Date(`${ymd}T00:00:00Z`).getUTCDay()

// Cycle 1 starts today and the first session is in two days, inside the
// default lead time, so saving schedules it straight away.
const settings = (fields = {}) => ({
  startDate: today(),
  weekday: (weekdayOf(today()) + 2) % 7,
  startTime: '18:00',
  endTime: '20:00',
  timeZone: TZ,
  mode: 'SLOTS',
  staff: [String(data.users.admin._id)],
  excludedVentures: [],
  excludedFounders: [],
  slotMinutes: 15,
  gapMinutes: 0,
  firstGapMinutes: 0,
  leadDays: 7,
  ...fields,
})

const save = fields =>
  as(data.users.admin).put('/api/admin/programme', settings(fields))

const firstSession = () => ProgrammeSession.findOne({ number: 1 })
const meetingsOf = async session =>
  CheckIn.find({ session: session._id, status: 'SCHEDULED' })
    .sort({ scheduledAt: 1 })
    .populate('venture', 'name')
const callsTo = method => google.calls.filter(call => call.method === method)
const emailsTo = (email, pattern) =>
  sentEmails.filter(e => e.to === email && pattern.test(e.subject))

before(startDatabase)
after(stopDatabase)
beforeEach(async () => {
  data = await seed()
  await connectCalendar(data.users.admin)
})

describe('the programme calendar', () => {
  it('has a session every other chosen weekday, in the programme time zone', () => {
    const sessions = sessionDates({
      startDate: '2026-10-13', // a Tuesday
      weekday: 4,
      startTime: '18:00',
      endTime: '20:00',
      timeZone: TZ,
    })
    assert.equal(sessions.length, CYCLES)
    assert.equal(sessions[0].startsAt.toISOString(), '2026-10-15T12:30:00.000Z')
    assert.equal(sessions[0].endsAt.toISOString(), '2026-10-15T14:30:00.000Z')
    assert.equal(sessions[1].startsAt.toISOString(), '2026-10-29T12:30:00.000Z')
    assert.deepEqual(
      sessions.map(s => s.cycle_number),
      Array.from({ length: CYCLES }, (_, i) => i + 1)
    )

    // Another day, window and zone, across a clock change.
    const london = sessionDates({
      startDate: '2026-10-19', // a Monday
      weekday: 1,
      startTime: '09:00',
      endTime: '10:30',
      timeZone: 'Europe/London',
    })
    assert.equal(london[0].startsAt.toISOString(), '2026-10-19T08:00:00.000Z')
    assert.equal(london[1].startsAt.toISOString(), '2026-11-02T09:00:00.000Z')
  })

  it('checks the settings', () => {
    const base = {
      startDate: '2026-10-13',
      weekday: 4,
      startTime: '18:00',
      endTime: '20:00',
      timeZone: TZ,
      mode: 'SLOTS',
      staff: ['64b000000000000000000001'],
      slotMinutes: 15,
      gapMinutes: 0,
      firstGapMinutes: 0,
      leadDays: 7,
    }
    assert.ok(parseProgramme(base).fields)
    const cases = [
      [{ startDate: '2026-02-30' }, 'startDate'],
      [{ endTime: '17:00' }, 'endTime'],
      [{ timeZone: 'Mars/Olympus' }, 'timeZone'],
      [{ mode: 'PARTY' }, 'mode'],
      [{ staff: [] }, 'staff'],
      [{ slotMinutes: 2 }, 'slotMinutes'],
      [{ weekday: 7 }, 'weekday'],
    ]
    for (const [change, field] of cases) {
      assert.equal(parseProgramme({ ...base, ...change }).field, field, field)
    }
  })
})

describe('drawing a session', () => {
  // Always picks the first option, so the draw is predictable.
  const first = () => 0

  it('deals startups evenly across the staff, one after another', () => {
    const assignment = drawAssignment(
      ['a', 'b', 'c', 'd', 'e'],
      ['x', 'y'],
      first
    )
    const loads = [...assignment.values()].map(list => list.length)
    assert.deepEqual(loads.sort(), [2, 3])
    assert.deepEqual([...assignment.values()].flat().sort(), [
      'a',
      'b',
      'c',
      'd',
      'e',
    ])

    const session = { startsAt: new Date('2026-10-15T12:30:00Z') }
    const meetings = slotTimes(assignment, session, {
      slotMinutes: 15,
      gapMinutes: 5,
      firstGapMinutes: 10,
    })
    for (const list of assignment.values()) {
      const own = meetings.filter(m => list.includes(m.ventureId))
      assert.deepEqual(
        own.map(m => m.startsAt.toISOString().slice(11, 16)),
        ['12:40', '13:00', '13:20'].slice(0, list.length)
      )
    }
  })

  it('keeps the last draw where it can', () => {
    const previous = new Map([
      ['x', ['a', 'b']],
      ['gone', ['c']],
    ])
    const kept = keepAssignment(
      previous,
      ['a', 'b', 'c', 'new'],
      ['x', 'y'],
      first
    )
    assert.deepEqual(kept.get('x'), ['a', 'b'])
    // The startups whose staff member left, and the new one, go to whoever
    // has the fewest.
    assert.deepEqual(kept.get('y').sort(), ['c', 'new'])
  })
})

describe('setting up the programme', () => {
  it('is for admins only', async () => {
    for (const user of [
      data.users.board,
      data.users.mentor,
      data.users.owner,
    ]) {
      const res = await as(user).get('/api/admin/programme')
      assert.equal(res.status, 403, user.email)
    }
    const res = await as(data.users.admin).get('/api/admin/programme')
    assert.equal(res.status, 200)
    assert.equal(res.body.configured, false)
    assert.equal(res.body.host.connected, true)
  })

  it('needs active staff and room for every startup', async () => {
    const noStaff = await save({ staff: [] })
    assert.equal(noStaff.status, 400)
    assert.equal(noStaff.body.field, 'staff')

    const student = await save({ staff: [String(data.users.owner._id)] })
    assert.equal(student.status, 400)
    assert.equal(student.body.field, 'staff')

    // One person, one two-hour slot: room for one of two startups.
    const full = await save({ slotMinutes: 120 })
    assert.equal(full.status, 400)
    assert.match(full.body.error, /2 startups need 2 slots/)
    assert.equal(await ProgrammeSession.countDocuments(), 0)
  })
})

describe('scheduling a session in slots', () => {
  it("puts each startup's slot on the admin's calendar, the staff in parallel, and emails everyone", async () => {
    const { admin, mentor, owner, outsider } = data.users
    const res = await save({
      staff: [String(admin._id), String(mentor._id)],
    })
    assert.equal(res.status, 200)
    assert.equal(res.body.sessions.length, CYCLES)

    const session = await firstSession()
    assert.equal(session.status, 'SCHEDULED')
    const meetings = await meetingsOf(session)
    assert.equal(meetings.length, 2)
    // Two staff, two startups: both at the start, at the same time.
    assert.equal(meetings[0].scheduledAt.getTime(), session.startsAt.getTime())
    assert.equal(meetings[1].scheduledAt.getTime(), session.startsAt.getTime())
    assert.notEqual(String(meetings[0].mentor), String(meetings[1].mentor))
    for (const meeting of meetings) {
      assert.equal(String(meeting.host), String(admin._id))
      assert.equal(meeting.durationMinutes, 15)
      assert.equal(meeting.cycle_number, 1)
    }

    const created = callsTo('createEvent')
    assert.equal(created.length, 2)
    for (const { token, args } of created) {
      assert.equal(token, `refresh-${admin.email}`)
      assert.equal(args[0].attendees.length, 2) // one staff member, one founder
    }

    assert.equal(emailsTo(owner.email, /Your bi-weekly check-in/).length, 1)
    assert.equal(emailsTo(outsider.email, /Your bi-weekly check-in/).length, 1)
    assert.equal(emailsTo(admin.email, /Your bi-weekly session/).length, 1)
    assert.equal(emailsTo(mentor.email, /Your bi-weekly session/).length, 1)

    // Only the first session is within its lead time.
    const second = await ProgrammeSession.findOne({ number: 2 })
    assert.equal(second.status, 'PLANNED')
  })

  it('ignores who mentors a startup', async () => {
    // Beta's own mentor runs the session alone: they meet Alpha too.
    await save({ staff: [String(data.users.otherMentor._id)] })
    const meetings = await meetingsOf(await firstSession())
    assert.deepEqual(meetings.map(m => m.venture.name).sort(), [
      'Alpha',
      'Beta',
    ])
    assert.ok(
      meetings.every(
        m => String(m.mentor) === String(data.users.otherMentor._id)
      )
    )
  })

  it("waits until the admin's calendar is connected", async () => {
    google.failures.clear()
    const { default: GoogleCredential } =
      await import('../models/googleCredential.js')
    await GoogleCredential.deleteMany({})
    await save()
    const session = await firstSession()
    assert.equal(session.status, 'PLANNED')
    assert.match(session.problem, /Connect Google Calendar/)
    assert.equal(callsTo('createEvent').length, 0)
  })

  it('moves only the meetings a change affects, and emails only their people', async () => {
    const { admin, owner, outsider } = data.users
    await save() // admin alone: slots at 18:00 and 18:15
    const before = await meetingsOf(await firstSession())
    const [firstSlot, secondSlot] = before
    const firstFounder =
      String(firstSlot.venture._id) === String(data.ventures.alpha._id)
        ? owner
        : outsider
    const secondFounder = firstFounder === owner ? outsider : owner
    sentEmails.length = 0
    google.calls.length = 0

    await save({ gapMinutes: 5 })
    const after = await meetingsOf(await firstSession())
    assert.equal(
      after[0].scheduledAt.getTime(),
      firstSlot.scheduledAt.getTime()
    )
    assert.equal(
      after[1].scheduledAt.getTime(),
      secondSlot.scheduledAt.getTime() + 5 * 60 * 1000
    )
    assert.equal(callsTo('patchEvent').length, 1)
    assert.equal(callsTo('createEvent').length, 0)
    assert.equal(emailsTo(firstFounder.email, /check-in/).length, 0)
    assert.equal(emailsTo(secondFounder.email, /check-in/).length, 1)
    assert.equal(emailsTo(admin.email, /session/).length, 1)
  })

  it('tells a founder taken off the invite list, and leaves their team alone', async () => {
    const { applicant, owner } = data.users
    await Founder.create({
      user: applicant._id,
      venture: data.ventures.alpha._id,
    })
    await save()
    assert.equal(emailsTo(applicant.email, /check-in/).length, 1)
    sentEmails.length = 0

    await save({ excludedFounders: [String(applicant._id)] })
    assert.equal(emailsTo(applicant.email, /Cancelled/).length, 1)
    assert.equal(emailsTo(owner.email, /./).length, 0)
    const alpha = (await meetingsOf(await firstSession())).find(
      m => m.venture.name === 'Alpha'
    )
    assert.deepEqual(
      alpha.attendees.map(a => a.email),
      [owner.email]
    )
  })

  it('a startup taken off loses its slot', async () => {
    await save()
    sentEmails.length = 0
    await save({ excludedVentures: [String(data.ventures.beta._id)] })
    const meetings = await meetingsOf(await firstSession())
    assert.deepEqual(
      meetings.map(m => m.venture.name),
      ['Alpha']
    )
    assert.equal(callsTo('deleteEvent').length, 1)
    assert.equal(emailsTo(data.users.outsider.email, /Cancelled/).length, 1)
  })
})

describe('a group session', () => {
  it('is one meeting for every invited founder and all the staff', async () => {
    const { admin, mentor, owner, outsider } = data.users
    await save({
      mode: 'GROUP',
      staff: [String(admin._id), String(mentor._id)],
    })
    const session = await firstSession()
    const meetings = await meetingsOf(session)
    assert.equal(meetings.length, 2)
    assert.equal(new Set(meetings.map(m => m.googleEventId)).size, 1)
    assert.ok(meetings.every(m => m.group))

    const [{ args }] = callsTo('createEvent')
    assert.deepEqual(
      args[0].attendees.map(a => a.email).sort(),
      [admin.email, mentor.email, owner.email, outsider.email].sort()
    )
    assert.equal(args[0].start.dateTime, session.startsAt.toISOString())
    assert.equal(args[0].end.dateTime, session.endsAt.toISOString())
    assert.equal(emailsTo(owner.email, /group session/).length, 1)
  })

  it('switching mode starts the session afresh', async () => {
    await save()
    google.calls.length = 0
    await save({ mode: 'GROUP' })
    assert.equal(callsTo('deleteEvent').length, 2)
    assert.equal(callsTo('createEvent').length, 1)
    const meetings = await meetingsOf(await firstSession())
    assert.ok(meetings.every(m => m.group))
  })

  it('collects the transcript once for every startup in it', async () => {
    await save({ mode: 'GROUP' })
    // The session took place two hours ago.
    const start = new Date(Date.now() - 2 * 60 * 60 * 1000)
    await CheckIn.updateMany(
      {},
      {
        $set: {
          scheduledAt: start,
          durationMinutes: 30,
          'transcript.nextPollAt': new Date(Date.now() - 1000),
        },
      }
    )
    const [meeting] = await CheckIn.find()
    google.records.push({
      name: 'conferenceRecords/g',
      meetingCode: meeting.meetingCode,
      startTime: new Date(start.getTime() + 60000).toISOString(),
      endTime: new Date(start.getTime() + 30 * 60000).toISOString(),
    })
    google.transcripts.set('conferenceRecords/g', [
      { name: 'conferenceRecords/g/transcripts/t', state: 'FILE_GENERATED' },
    ])
    google.entries.set('conferenceRecords/g/transcripts/t', [])
    google.calls.length = 0

    assert.equal(await pollTranscripts(), 1)
    const calls = callsTo('conferenceRecords')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].token, `refresh-${data.users.admin.email}`)
    const rows = await CheckIn.find()
    assert.ok(rows.every(r => r.transcript.status === 'READY'))
    assert.ok(rows.every(r => r.status === 'HELD'))
  })
})

describe('session actions', () => {
  it('cancelling takes every event off and tells everyone once', async () => {
    const { admin, owner, outsider } = data.users
    await save()
    const session = await firstSession()
    sentEmails.length = 0

    const res = await as(admin).post(
      `/api/admin/programme/sessions/${session._id}/cancel`
    )
    assert.equal(res.status, 200)
    assert.equal((await firstSession()).status, 'CANCELLED')
    assert.equal(await CheckIn.countDocuments({ status: 'SCHEDULED' }), 0)
    assert.equal(callsTo('deleteEvent').length, 2)
    assert.equal(emailsTo(owner.email, /Cancelled/).length, 1)
    assert.equal(emailsTo(outsider.email, /Cancelled/).length, 1)
    assert.equal(emailsTo(admin.email, /Cancelled/).length, 1)

    // Scheduling it again brings it back.
    const again = await as(admin).post(
      `/api/admin/programme/sessions/${session._id}/schedule`
    )
    assert.equal(again.status, 200)
    assert.equal((await firstSession()).status, 'SCHEDULED')
    assert.equal(await CheckIn.countDocuments({ status: 'SCHEDULED' }), 2)
  })

  it('a later session can be scheduled now, and redrawn', async () => {
    await save()
    const second = await ProgrammeSession.findOne({ number: 2 })
    const scheduled = await as(data.users.admin).post(
      `/api/admin/programme/sessions/${second._id}/schedule`
    )
    assert.equal(scheduled.status, 200)
    assert.equal(
      (await ProgrammeSession.findById(second._id)).status,
      'SCHEDULED'
    )
    const redrawn = await as(data.users.admin).post(
      `/api/admin/programme/sessions/${second._id}/redraw`
    )
    assert.equal(redrawn.status, 200)
    assert.equal((await meetingsOf(second)).length, 2)

    const third = await ProgrammeSession.findOne({ number: 3 })
    const notYet = await as(data.users.admin).post(
      `/api/admin/programme/sessions/${third._id}/redraw`
    )
    assert.equal(notYet.status, 409)
  })
})

describe('programme meetings and the rest of the portal', () => {
  it('the staff running a meeting write its notes; the startup mentor can’t move it', async () => {
    const { mentor, otherMentor } = data.users
    await save({ staff: [String(otherMentor._id)] })
    const alpha = (await meetingsOf(await firstSession())).find(
      m => m.venture.name === 'Alpha'
    )

    const moved = await as(mentor).patch(`/api/checkins/${alpha._id}`, {
      startAt: new Date(Date.now() + 3 * DAY_MS).toISOString(),
    })
    assert.equal(moved.status, 409)
    const mentorNotes = await as(mentor).put(
      `/api/checkins/${alpha._id}/notes`,
      {
        notes: 'x',
      }
    )
    assert.equal(mentorNotes.status, 403)

    const notes = await as(otherMentor).put(
      `/api/checkins/${alpha._id}/notes`,
      {
        notes: 'Pilot next week.',
      }
    )
    assert.equal(notes.status, 200)
    const read = await as(otherMentor).get(`/api/checkins/${alpha._id}`)
    assert.equal(read.status, 200)
    const mine = await as(otherMentor).get('/api/checkins?mine=1')
    assert.equal(mine.body.checkIns.length, 2)
  })

  it("a new mentor for a startup leaves the programme's meetings alone", async () => {
    await save()
    await as(data.users.board).patch(
      `/api/admin/ventures/${data.ventures.alpha._id}/mentor`,
      { mentorId: data.users.otherMentor._id }
    )
    assert.equal(await CheckIn.countDocuments({ status: 'SCHEDULED' }), 2)
  })

  it('bi-weekly cycles count from the programme start', async () => {
    const { owner } = data.users
    // Alpha was created today, so cycle 2 hasn't opened for it on its own.
    const early = await as(owner).post('/api/biweekly/submission', {
      cycle_number: 2,
    })
    assert.equal(early.status, 400)

    const started = ymdIn(new Date(Date.now() - 20 * DAY_MS))
    await save({ startDate: started, weekday: weekdayOf(started) })
    const opened = await as(owner).post('/api/biweekly/submission', {
      cycle_number: 2,
    })
    assert.equal(opened.status, 200)
    const notYet = await as(owner).post('/api/biweekly/submission', {
      cycle_number: 3,
    })
    assert.equal(notYet.status, 400)

    const report = await as(owner).get('/api/biweekly')
    assert.ok(report.body.programmeStart)
  })
})

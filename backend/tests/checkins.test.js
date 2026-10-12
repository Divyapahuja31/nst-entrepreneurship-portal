import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { CYCLES } from '@nst/shared/biweeklyCycles.js'

import app from '../app.js'
import CheckIn from '../models/checkIn.js'
import CheckInSeries from '../models/checkInSeries.js'
import GoogleCredential from '../models/googleCredential.js'
import { GoogleError, REQUIRED_SCOPES } from '../utils/googleWorkspace.js'
import {
  connectCalendar,
  cookieFor,
  google,
  seed,
  startDatabase,
  stopDatabase,
} from './helpers.js'

// Alpha: mentored by `mentor`, founded by `owner`. Beta: mentored by
// `otherMentor`, founded by `outsider`. Both start their first cycle today.
let data
const as = user => ({
  get: url => request(app).get(url).set('Cookie', cookieFor(user)),
  post: (url, body) =>
    request(app).post(url).set('Cookie', cookieFor(user)).send(body),
  patch: (url, body) =>
    request(app).patch(url).set('Cookie', cookieFor(user)).send(body),
  delete: url => request(app).delete(url).set('Cookie', cookieFor(user)),
})

const DAY_MS = 24 * 60 * 60 * 1000
const inDays = n => new Date(Date.now() + n * DAY_MS).toISOString()

const schedule = (user, fields = {}) =>
  as(user).post('/api/checkins', {
    ventureId: data.ventures.alpha._id,
    startAt: inDays(2),
    timeZone: 'Asia/Kolkata',
    ...fields,
  })

const callsTo = method => google.calls.filter(call => call.method === method)

// Repeating check-ins can no longer be made, but series made before can
// still be moved, cancelled and ended. This makes one the way the portal
// used to: one recurring event, a CheckIn per occurrence.
const SERIES_LENGTH = 4
const legacySeries = async () => {
  const { checkInEvent, checkInFields, googleFor } =
    await import('../utils/checkInHelper.js')
  const venture = data.ventures.alpha
  const attendees = [{ user: data.users.owner._id, email: 'olu@adypu.edu.in' }]
  const startAt = new Date(inDays(2))
  const timeZone = 'Asia/Kolkata'
  const calendar = await googleFor(data.users.mentor._id)
  const event = await calendar('createEvent', {
    ...checkInEvent({
      venture,
      startAt,
      durationMinutes: 30,
      timeZone,
      attendees,
    }),
    recurrence: [`RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=${SERIES_LENGTH}`],
  })
  const series = await CheckInSeries.create({
    venture: venture._id,
    mentor: venture.mentor,
    googleEventId: event.id,
    startAt,
    durationMinutes: 30,
    timeZone,
  })
  const checkIns = await CheckIn.insertMany(
    (await calendar('listInstances', event.id)).map(instance => ({
      ...checkInFields({
        venture,
        event: { ...instance, hangoutLink: event.hangoutLink },
        durationMinutes: 30,
        timeZone,
      }),
      attendees,
      series: series._id,
    }))
  )
  google.calls.length = 0
  return { series, checkIns }
}

before(startDatabase)
after(stopDatabase)
beforeEach(async () => {
  data = await seed()
  await connectCalendar(data.users.mentor)
})

describe('scheduling check-ins', () => {
  it("the startup's mentor schedules one on their calendar, inviting the founders", async () => {
    const res = await schedule(data.users.mentor, { durationMinutes: 45 })
    assert.equal(res.status, 201)

    const [checkIn] = res.body.checkIns
    // A check-in is the mentor's own meeting, apart from the cycles.
    assert.equal(checkIn.cycle_number, null)
    assert.equal(checkIn.status, 'SCHEDULED')
    assert.equal(checkIn.durationMinutes, 45)
    assert.match(checkIn.meetUrl, /^https:\/\/meet\.google\.com\//)
    assert.equal(checkIn.meetingCode, 'abc-defg-001')
    assert.deepEqual(
      checkIn.attendees.map(a => a.email),
      ['olu@adypu.edu.in']
    )

    const [{ token, args }] = callsTo('createEvent')
    const [event] = args
    assert.equal(token, 'refresh-mo@newtonschool.co')
    assert.deepEqual(event.attendees, [{ email: 'olu@adypu.edu.in' }])
    assert.equal(event.start.timeZone, 'Asia/Kolkata')
    assert.equal(
      event.conferenceData.createRequest.conferenceSolutionKey.type,
      'hangoutsMeet'
    )
    assert.equal(event.recurrence, undefined)
    assert.equal(event.summary, 'Alpha: check-in')
  })

  it('sets the new meeting to transcribe itself', async () => {
    const res = await schedule(data.users.mentor)
    assert.equal(res.status, 201)
    assert.deepEqual(
      callsTo('autoTranscribe').map(call => call.args),
      [['abc-defg-001']]
    )
  })

  it('leaves a connection made before Meet settings were asked for as it was', async () => {
    await GoogleCredential.updateOne(
      { user: data.users.mentor._id },
      { $set: { scopes: [...REQUIRED_SCOPES] } }
    )
    const res = await schedule(data.users.mentor)
    assert.equal(res.status, 201)
    assert.equal(callsTo('autoTranscribe').length, 0)
  })

  it('still schedules when Google refuses to turn transcription on', async () => {
    google.failures.set(
      'autoTranscribe',
      new GoogleError('Request had insufficient authentication scopes.', {
        status: 403,
      })
    )
    const res = await schedule(data.users.mentor)
    assert.equal(res.status, 201)
    assert.equal(await CheckIn.countDocuments({ status: 'SCHEDULED' }), 1)
  })

  it('any future time works, after the last bi-weekly cycle too', async () => {
    const res = await schedule(data.users.mentor, {
      startAt: inDays(14 * CYCLES + 30),
    })
    assert.equal(res.status, 201)
  })

  it('Meet Now starts one at once, inviting the founders', async () => {
    const before = Date.now()
    const res = await schedule(data.users.mentor, {
      startAt: undefined,
      startNow: true,
    })
    assert.equal(res.status, 201)
    const [checkIn] = res.body.checkIns
    const startsAt = new Date(checkIn.scheduledAt).getTime()
    assert.ok(startsAt >= before - 1000 && startsAt <= Date.now())
    assert.equal(checkIn.durationMinutes, 30)
    assert.ok(checkIn.meetUrl)
    const [{ args }] = callsTo('createEvent')
    assert.deepEqual(args[0].attendees, [{ email: 'olu@adypu.edu.in' }])

    // Moving one can't make it start now.
    const later = await schedule(data.users.mentor, { startAt: inDays(3) })
    const moved = await as(data.users.mentor).patch(
      `/api/checkins/${later.body.checkIns[0]._id}`,
      { startNow: true }
    )
    assert.equal(moved.status, 400)
  })

  it('Meet Now is for the startup mentor only', async () => {
    const res = await schedule(data.users.board, {
      startAt: undefined,
      startNow: true,
    })
    assert.equal(res.status, 403)
  })

  it('nobody else schedules them, not even the board', async () => {
    const { otherMentor, board, admin, owner } = data.users
    await connectCalendar(otherMentor)
    for (const user of [otherMentor, board, admin, owner]) {
      const res = await schedule(user)
      assert.equal(res.status, 403, user.email)
    }
    assert.equal(await CheckIn.countDocuments(), 0)
    assert.equal(callsTo('createEvent').length, 0)
  })

  it('asks a mentor without a connected calendar to connect one', async () => {
    await GoogleCredential.deleteMany({})
    const res = await schedule(data.users.mentor)
    assert.equal(res.status, 409)
    assert.equal(res.body.code, 'GOOGLE_NOT_CONNECTED')
  })

  it('rejects times in the past or without a time zone', async () => {
    const { mentor } = data.users
    const cases = [
      { startAt: inDays(-1) },
      { startAt: 'tomorrow' },
      { startNow: 'yes', startAt: undefined },
      { timeZone: 'Mars/Olympus' },
      { durationMinutes: 5 },
      { durationMinutes: '30' },
    ]
    for (const fields of cases) {
      const res = await schedule(mentor, fields)
      assert.equal(res.status, 400, JSON.stringify(fields))
    }
    assert.equal(callsTo('createEvent').length, 0)
  })

  it('saves nothing when Google refuses the event', async () => {
    google.failures.set(
      'createEvent',
      new GoogleError('Calendar usage limits exceeded', { status: 403 })
    )
    const res = await schedule(data.users.mentor)
    assert.equal(res.status, 502)
    assert.match(res.body.error, /usage limits/)
    assert.equal(await CheckIn.countDocuments(), 0)
  })

  it('marks the connection for reconnecting when Google refuses the token', async () => {
    google.failures.set(
      'createEvent',
      new GoogleError('invalid_grant', { status: 400, reconnect: true })
    )
    const res = await schedule(data.users.mentor)
    assert.equal(res.status, 409)
    assert.equal(res.body.code, 'GOOGLE_RECONNECT')
    const credential = await GoogleCredential.findOne({
      user: data.users.mentor._id,
    })
    assert.equal(credential.needsReconnect, true)

    google.failures.clear()
    const again = await schedule(data.users.mentor)
    assert.equal(again.body.code, 'GOOGLE_RECONNECT')
  })
})

describe('repeating check-ins', () => {
  it('are gone: asking for one makes a single meeting', async () => {
    const res = await schedule(data.users.mentor, { recurring: true })
    assert.equal(res.status, 201)
    assert.equal(res.body.checkIns.length, 1)
    assert.equal(res.body.checkIns[0].series, null)
    const [{ args }] = callsTo('createEvent')
    assert.equal(args[0].recurrence, undefined)
  })

  it('an occurrence of an earlier series moves on its own', async () => {
    const { checkIns } = await legacySeries()
    const [first] = checkIns

    const res = await as(data.users.mentor).patch(
      `/api/checkins/${first._id}`,
      { startAt: inDays(15) }
    )
    assert.equal(res.status, 200)
    assert.equal(res.body.checkIn.cycle_number, null)
    assert.equal(res.body.checkIn.durationMinutes, 30)

    const [{ args }] = callsTo('patchEvent')
    assert.equal(args[0], first.googleEventId)
    assert.equal(args[1].start.dateTime, res.body.checkIn.scheduledAt)
    assert.deepEqual(args[1].attendees, [{ email: 'olu@adypu.edu.in' }])
  })

  it('an occurrence is cancelled on its own', async () => {
    const { checkIns } = await legacySeries()
    const second = checkIns[1]

    const res = await as(data.users.mentor).delete(
      `/api/checkins/${second._id}`
    )
    assert.equal(res.status, 200)
    assert.equal(res.body.checkIn.status, 'CANCELLED')
    assert.deepEqual(callsTo('deleteEvent')[0].args, [second.googleEventId])
    assert.equal(
      await CheckIn.countDocuments({ status: 'SCHEDULED' }),
      SERIES_LENGTH - 1
    )

    const again = await as(data.users.mentor).delete(
      `/api/checkins/${second._id}`
    )
    assert.equal(again.status, 409)
  })

  it('ending a series before it starts deletes the event', async () => {
    const { series } = await legacySeries()
    const res = await as(data.users.mentor).delete(
      `/api/checkins/series/${series._id}`
    )
    assert.equal(res.status, 200)
    assert.equal(res.body.checkIns.length, SERIES_LENGTH)
    assert.deepEqual(callsTo('deleteEvent')[0].args, [series.googleEventId])
    assert.equal(await CheckIn.countDocuments({ status: 'SCHEDULED' }), 0)
    assert.equal((await CheckInSeries.findById(series._id)).status, 'ENDED')
  })

  it('ending a series under way keeps what has happened', async () => {
    const { series, checkIns } = await legacySeries()
    // The first occurrence has taken place.
    await CheckIn.updateOne(
      { _id: checkIns[0]._id },
      { $set: { scheduledAt: inDays(-1), status: 'HELD' } }
    )

    const res = await as(data.users.mentor).delete(
      `/api/checkins/series/${series._id}`
    )
    assert.equal(res.status, 200)
    assert.equal(res.body.checkIns.length, SERIES_LENGTH - 1)

    const [{ args }] = callsTo('patchEvent')
    assert.equal(args[0], series.googleEventId)
    assert.match(
      args[1].recurrence[0],
      /^RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=\d{8}T\d{6}Z$/
    )
    assert.equal(callsTo('deleteEvent').length, 0)
    const held = await CheckIn.findById(checkIns[0]._id)
    assert.equal(held.status, 'HELD')
  })

  it('only the startup mentor moves, cancels or ends them', async () => {
    const { series, checkIns } = await legacySeries()
    const [first] = checkIns
    const { otherMentor, board, owner } = data.users
    for (const user of [otherMentor, board, owner]) {
      const moved = await as(user).patch(`/api/checkins/${first._id}`, {
        startAt: inDays(3),
      })
      const cancelled = await as(user).delete(`/api/checkins/${first._id}`)
      const ended = await as(user).delete(`/api/checkins/series/${series._id}`)
      assert.deepEqual(
        [moved.status, cancelled.status, ended.status],
        [403, 403, 403],
        user.email
      )
    }
  })
})

describe('reading check-ins', () => {
  beforeEach(async () => {
    await schedule(data.users.mentor)
  })

  it("founders see their own startup's check-ins only", async () => {
    const own = await as(data.users.owner).get('/api/checkins')
    assert.equal(own.status, 200)
    assert.equal(own.body.checkIns.length, 1)
    assert.equal(own.body.checkIns[0].venture.name, 'Alpha')

    const other = await as(data.users.outsider).get('/api/checkins')
    assert.equal(other.body.checkIns.length, 0)

    // A student can't name someone else's startup.
    const named = await as(data.users.outsider).get(
      `/api/checkins?ventureId=${data.ventures.alpha._id}`
    )
    assert.equal(named.body.checkIns.length, 0)
  })

  it('staff read the startups they may read', async () => {
    const url = `/api/checkins?ventureId=${data.ventures.alpha._id}`
    for (const user of [data.users.mentor, data.users.board]) {
      const res = await as(user).get(url)
      assert.equal(res.status, 200, user.email)
      assert.equal(res.body.checkIns.length, 1)
    }
    const other = await as(data.users.otherMentor).get(url)
    assert.equal(other.status, 403)
  })

  it("a founder's record lists the check-ins they were invited to", async () => {
    const url = `/api/checkins?founderId=${data.users.owner._id}`
    const board = await as(data.users.board).get(url)
    assert.equal(board.body.checkIns.length, 1)
    const mentor = await as(data.users.mentor).get(url)
    assert.equal(mentor.body.checkIns.length, 1)
    // Another mentor sees none of Alpha's.
    const other = await as(data.users.otherMentor).get(url)
    assert.equal(other.body.checkIns.length, 0)
  })
})

describe('the bi-weekly report', () => {
  it('stays apart from check-ins', async () => {
    await schedule(data.users.mentor)
    const res = await as(data.users.owner).get('/api/biweekly')
    assert.equal(res.status, 200)
    assert.equal(res.body.checkIns, undefined)
  })
})

describe('when a startup loses its mentor', () => {
  it('reassigning the mentor cancels upcoming check-ins on the old calendar', async () => {
    const { series } = await legacySeries()
    await schedule(data.users.mentor)
    const res = await as(data.users.board).patch(
      `/api/admin/ventures/${data.ventures.alpha._id}/mentor`,
      {
        mentorId: data.users.otherMentor._id,
      }
    )
    assert.equal(res.status, 200)
    assert.equal(res.body.mentor.email, 'max@newtonschool.co')

    assert.equal(await CheckIn.countDocuments({ status: 'SCHEDULED' }), 0)
    assert.deepEqual(callsTo('deleteEvent')[0].args, [series.googleEventId])
    assert.equal(callsTo('deleteEvent').length, 2)
    assert.equal((await CheckInSeries.findById(series._id)).status, 'ENDED')
  })

  it('reassigning the same mentor leaves them alone', async () => {
    await schedule(data.users.mentor)
    await as(data.users.board).patch(
      `/api/admin/ventures/${data.ventures.alpha._id}/mentor`,
      { mentorId: data.users.mentor._id }
    )
    assert.equal(await CheckIn.countDocuments({ status: 'SCHEDULED' }), 1)
  })

  it("deactivating the mentor cancels their check-ins, even if Google can't be reached", async () => {
    await schedule(data.users.mentor)
    google.failures.set('deleteEvent', new GoogleError('Backend Error'))
    const res = await as(data.users.admin).delete(
      `/api/admin/accounts/${data.users.mentor._id}`
    )
    assert.equal(res.status, 200)
    assert.equal(await CheckIn.countDocuments({ status: 'SCHEDULED' }), 0)
  })
})

describe('when founders join or leave', () => {
  const join = async user => {
    const { default: VentureJoinRequest } =
      await import('../models/ventureJoinRequest.js')
    const joinRequest = await VentureJoinRequest.create({
      venture: data.ventures.alpha._id,
      requestedBy: user._id,
      status: 'PENDING',
    })
    return as(data.users.mentor).patch(
      `/api/admin/join-requests/${joinRequest._id}/review`,
      { status: 'APPROVED' }
    )
  }
  const upcomingEmails = async () =>
    (
      await CheckIn.find({
        venture: data.ventures.alpha._id,
        status: 'SCHEDULED',
      })
    ).map(c =>
      c.attendees
        .map(a => a.email)
        .sort()
        .join(',')
    )

  it('upcoming check-ins invite the founders as they are now, a series in one update', async () => {
    const { applicant } = data.users
    const { series, checkIns } = await legacySeries()
    const [, second] = checkIns
    const single = (await schedule(data.users.mentor, { startAt: inDays(5) }))
      .body.checkIns[0]
    // One occurrence was moved on its own, so it carries its own invite.
    await as(data.users.mentor).patch(`/api/checkins/${second._id}`, {
      startAt: new Date(
        new Date(second.scheduledAt).getTime() + 60 * 60 * 1000
      ).toISOString(),
    })
    google.calls.length = 0

    assert.equal((await join(applicant)).status, 200)
    const patched = callsTo('patchEvent').map(call => call.args[0])
    assert.deepEqual(
      patched.sort(),
      [series.googleEventId, second.googleEventId, single.googleEventId].sort()
    )
    assert.ok(
      (await upcomingEmails()).every(
        e => e === 'ana@adypu.edu.in,olu@adypu.edu.in'
      )
    )

    google.calls.length = 0
    const left = await as(data.users.board)
      .delete('/api/admin/founders/delete')
      .send({ founders: [String(applicant._id)] })
    assert.equal(left.status, 200)
    assert.equal(callsTo('patchEvent').length, 3)
    assert.ok((await upcomingEmails()).every(e => e === 'olu@adypu.edu.in'))
  })

  it("a founder joining doesn't fail when the mentor's calendar is gone", async () => {
    await schedule(data.users.mentor)
    await GoogleCredential.deleteMany({})
    assert.equal((await join(data.users.applicant)).status, 200)
  })
})

describe("a staff member's own meetings", () => {
  it('a mentor sees their own check-ins beside the programme meetings they run', async () => {
    await schedule(data.users.mentor)
    const mine = await as(data.users.mentor).get('/api/checkins?mine=1')
    assert.equal(mine.status, 200)
    assert.equal(mine.body.checkIns.length, 1)
    const other = await as(data.users.otherMentor).get('/api/checkins?mine=1')
    assert.equal(other.body.checkIns.length, 0)
  })
})

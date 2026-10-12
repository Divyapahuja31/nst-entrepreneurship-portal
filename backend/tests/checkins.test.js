import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { CYCLES } from '@nst/shared/biweeklyCycles.js'

import app from '../app.js'
import CheckIn from '../models/checkIn.js'
import CheckInSeries from '../models/checkInSeries.js'
import GoogleCredential from '../models/googleCredential.js'
import { GoogleError } from '../utils/googleWorkspace.js'
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
    assert.equal(checkIn.cycle_number, 1)
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

  it('rejects times in the past, after the last cycle or without a time zone', async () => {
    const { mentor } = data.users
    const cases = [
      { startAt: inDays(-1) },
      { startAt: inDays(14 * CYCLES + 1) },
      { startAt: 'tomorrow' },
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

describe('recurring check-ins', () => {
  it('repeat every two weeks, one per cycle through the last', async () => {
    const res = await schedule(data.users.mentor, { recurring: true })
    assert.equal(res.status, 201)

    const checkIns = res.body.checkIns
    assert.equal(checkIns.length, CYCLES)
    assert.deepEqual(
      checkIns.map(c => c.cycle_number),
      Array.from({ length: CYCLES }, (_, i) => i + 1)
    )
    assert.equal(new Set(checkIns.map(c => c.series)).size, 1)
    assert.equal(new Set(checkIns.map(c => c.meetingCode)).size, 1)
    assert.equal(new Set(checkIns.map(c => c.googleEventId)).size, CYCLES)

    const [{ args }] = callsTo('createEvent')
    assert.deepEqual(args[0].recurrence, [
      `RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=${CYCLES}`,
    ])
  })

  it('a startup has one recurring check-in at a time', async () => {
    await schedule(data.users.mentor, { recurring: true })
    const res = await schedule(data.users.mentor, {
      recurring: true,
      startAt: inDays(3),
    })
    assert.equal(res.status, 409)
    // A one-off alongside it is fine.
    const once = await schedule(data.users.mentor, { startAt: inDays(3) })
    assert.equal(once.status, 201)
  })

  it('an occurrence moves on its own and lands in its new cycle', async () => {
    const { body } = await schedule(data.users.mentor, { recurring: true })
    const first = body.checkIns[0]

    const res = await as(data.users.mentor).patch(
      `/api/checkins/${first._id}`,
      { startAt: inDays(15) }
    )
    assert.equal(res.status, 200)
    assert.equal(res.body.checkIn.cycle_number, 2)
    assert.equal(res.body.checkIn.durationMinutes, 30)

    const [{ args }] = callsTo('patchEvent')
    assert.equal(args[0], first.googleEventId)
    assert.equal(args[1].start.dateTime, res.body.checkIn.scheduledAt)
    assert.deepEqual(args[1].attendees, [{ email: 'olu@adypu.edu.in' }])
  })

  it('an occurrence is cancelled on its own', async () => {
    const { body } = await schedule(data.users.mentor, { recurring: true })
    const second = body.checkIns[1]

    const res = await as(data.users.mentor).delete(
      `/api/checkins/${second._id}`
    )
    assert.equal(res.status, 200)
    assert.equal(res.body.checkIn.status, 'CANCELLED')
    assert.deepEqual(callsTo('deleteEvent')[0].args, [second.googleEventId])
    assert.equal(
      await CheckIn.countDocuments({ status: 'SCHEDULED' }),
      CYCLES - 1
    )

    const again = await as(data.users.mentor).delete(
      `/api/checkins/${second._id}`
    )
    assert.equal(again.status, 409)
  })

  it('ending a series before it starts deletes the event', async () => {
    const { body } = await schedule(data.users.mentor, { recurring: true })
    const res = await as(data.users.mentor).delete(
      `/api/checkins/series/${body.checkIns[0].series}`
    )
    assert.equal(res.status, 200)
    assert.equal(res.body.checkIns.length, CYCLES)
    assert.deepEqual(callsTo('deleteEvent')[0].args, ['event1'])
    assert.equal(await CheckIn.countDocuments({ status: 'SCHEDULED' }), 0)
    const series = await CheckInSeries.findById(body.checkIns[0].series)
    assert.equal(series.status, 'ENDED')
  })

  it('ending a series under way keeps what has happened', async () => {
    const { body } = await schedule(data.users.mentor, { recurring: true })
    // The first occurrence has taken place.
    await CheckIn.updateOne(
      { _id: body.checkIns[0]._id },
      { $set: { scheduledAt: inDays(-1), status: 'HELD' } }
    )

    const res = await as(data.users.mentor).delete(
      `/api/checkins/series/${body.checkIns[0].series}`
    )
    assert.equal(res.status, 200)
    assert.equal(res.body.checkIns.length, CYCLES - 1)

    const [{ args }] = callsTo('patchEvent')
    assert.equal(args[0], 'event1')
    assert.match(
      args[1].recurrence[0],
      /^RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=\d{8}T\d{6}Z$/
    )
    assert.equal(callsTo('deleteEvent').length, 0)
    const held = await CheckIn.findById(body.checkIns[0]._id)
    assert.equal(held.status, 'HELD')
  })

  it('only the startup mentor moves, cancels or ends them', async () => {
    const { body } = await schedule(data.users.mentor, { recurring: true })
    const [first] = body.checkIns
    const { otherMentor, board, owner } = data.users
    for (const user of [otherMentor, board, owner]) {
      const moved = await as(user).patch(`/api/checkins/${first._id}`, {
        startAt: inDays(3),
      })
      const cancelled = await as(user).delete(`/api/checkins/${first._id}`)
      const ended = await as(user).delete(
        `/api/checkins/series/${first.series}`
      )
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
  it("shows each cycle's check-in, not cancelled ones", async () => {
    const { body } = await schedule(data.users.mentor, { recurring: true })
    await as(data.users.mentor).delete(`/api/checkins/${body.checkIns[1]._id}`)

    const res = await as(data.users.owner).get('/api/biweekly')
    assert.equal(res.status, 200)
    assert.equal(res.body.checkIns.length, CYCLES - 1)
    assert.equal(res.body.checkIns[0].cycle_number, 1)
    assert.ok(res.body.checkIns[0].meetUrl)
    assert.ok(!res.body.checkIns.some(c => c.cycle_number === 2))
  })
})

describe('when a startup loses its mentor', () => {
  it('reassigning the mentor cancels upcoming check-ins on the old calendar', async () => {
    await schedule(data.users.mentor, { recurring: true })
    const res = await as(data.users.board).patch(
      `/api/admin/ventures/${data.ventures.alpha._id}/mentor`,
      {
        mentorId: data.users.otherMentor._id,
      }
    )
    assert.equal(res.status, 200)
    assert.equal(res.body.mentor.email, 'max@newtonschool.co')

    assert.equal(await CheckIn.countDocuments({ status: 'SCHEDULED' }), 0)
    assert.deepEqual(callsTo('deleteEvent')[0].args, ['event1'])
    const [series] = await CheckInSeries.find()
    assert.equal(series.status, 'ENDED')
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

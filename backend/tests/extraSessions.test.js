import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app from '../app.js'
import CheckIn from '../models/checkIn.js'
import ProgrammeSession from '../models/programmeSession.js'
import {
  connectCalendar,
  cookieFor,
  google,
  seed,
  sentEmails,
  startDatabase,
  stopDatabase,
} from './helpers.js'

// Alpha: founded by `owner`. Beta: founded by `outsider`. `admin` hosts the
// programme; the board adds extra sessions to it.
let data
const as = user => ({
  get: url => request(app).get(url).set('Cookie', cookieFor(user)),
  put: (url, body) =>
    request(app).put(url).set('Cookie', cookieFor(user)).send(body),
  post: (url, body) =>
    request(app).post(url).set('Cookie', cookieFor(user)).send(body),
})

const DAY_MS = 24 * 60 * 60 * 1000
const TZ = 'Asia/Kolkata'
const ymdIn = date =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(date)
const inDays = days => ymdIn(new Date(Date.now() + days * DAY_MS))
const weekdayOf = ymd => new Date(`${ymd}T00:00:00Z`).getUTCDay()

const URL = '/api/admin/extra-sessions'

// The bi-weekly programme, with its sessions a month away so none is
// scheduled while these tests run.
const saveProgramme = () =>
  as(data.users.admin).put('/api/admin/programme', {
    startDate: inDays(30),
    weekday: weekdayOf(inDays(30)),
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
  })

const extra = (fields = {}) => ({
  title: 'Demo day rehearsal',
  date: inDays(3),
  startTime: '15:00',
  endTime: '16:00',
  mode: 'SLOTS',
  slotMinutes: 20,
  gapMinutes: 0,
  firstGapMinutes: 0,
  staff: [String(data.users.board._id)],
  excludedVentures: [],
  excludedFounders: [],
  ...fields,
})

const meetingsOf = session =>
  CheckIn.find({ session: session._id, status: 'SCHEDULED' })
    .sort({ scheduledAt: 1 })
    .populate('venture', 'name')
const callsTo = method => google.calls.filter(call => call.method === method)
const emailsTo = (email, pattern) =>
  sentEmails.filter(e => e.to === email && pattern.test(e.subject))
const extraSessions = () =>
  ProgrammeSession.find({ extra: { $ne: null } }).sort({ startsAt: 1 })

before(startDatabase)
after(stopDatabase)
beforeEach(async () => {
  data = await seed()
  await connectCalendar(data.users.admin)
})

describe('adding an extra session', () => {
  it("the board adds one on any day, on the programme host's calendar", async () => {
    await saveProgramme()
    google.calls.length = 0
    const { board, admin, owner, outsider } = data.users

    const res = await as(board).post(
      URL,
      extra({ excludedVentures: [String(data.ventures.beta._id)] })
    )
    assert.equal(res.status, 201)
    assert.equal(res.body.sessions.length, 1)

    const [session] = await extraSessions()
    assert.equal(session.number, undefined)
    assert.equal(session.status, 'SCHEDULED')
    assert.equal(String(session.extra.createdBy), String(board._id))

    const meetings = await meetingsOf(session)
    assert.deepEqual(
      meetings.map(m => m.venture.name),
      ['Alpha']
    )
    assert.equal(meetings[0].durationMinutes, 20)
    assert.equal(String(meetings[0].host), String(admin._id))
    assert.equal(String(meetings[0].mentor), String(board._id))

    const [created] = callsTo('createEvent')
    assert.equal(created.token, `refresh-${admin.email}`)
    assert.match(created.args[0].summary, /Alpha: Demo day rehearsal with/)

    assert.equal(emailsTo(owner.email, /Demo day rehearsal/).length, 1)
    assert.equal(emailsTo(board.email, /Demo day rehearsal/).length, 1)
    assert.equal(emailsTo(outsider.email, /./).length, 0)
  })

  it('runs as one group meeting when asked', async () => {
    await saveProgramme()
    google.calls.length = 0
    const res = await as(data.users.admin).post(
      URL,
      extra({ mode: 'GROUP', title: 'Founder town hall' })
    )
    assert.equal(res.status, 201)
    const [session] = await extraSessions()
    const meetings = await meetingsOf(session)
    assert.equal(meetings.length, 2)
    assert.ok(meetings.every(m => m.group))
    assert.equal(callsTo('createEvent').length, 1)
    assert.equal(callsTo('createEvent')[0].args[0].summary, 'Founder town hall')
  })

  it('stays apart from the bi-weekly sessions', async () => {
    await saveProgramme()
    await as(data.users.admin).post(URL, extra())
    await as(data.users.admin).post(URL, extra({ date: inDays(4) }))
    assert.equal((await extraSessions()).length, 2)

    const page = await as(data.users.admin).get('/api/admin/programme')
    assert.ok(page.body.sessions.every(s => s.number))

    const cleared = await as(data.users.admin).post(
      '/api/admin/programme/sessions/clear'
    )
    assert.equal(cleared.status, 200)
    const left = await extraSessions()
    assert.equal(left.length, 2)
    assert.ok(left.every(s => s.status === 'SCHEDULED'))
  })

  it('needs the programme, a future time, staff and room for everyone', async () => {
    const { admin } = data.users
    const none = await as(admin).post(URL, extra())
    assert.equal(none.status, 409)
    assert.match(none.body.error, /Set up the programme first/)

    await saveProgramme()
    const past = await as(admin).post(URL, extra({ date: inDays(-1) }))
    assert.equal(past.body.field, 'date')
    const noStaff = await as(admin).post(URL, extra({ staff: [] }))
    assert.equal(noStaff.body.field, 'staff')
    const nobody = await as(admin).post(
      URL,
      extra({
        excludedVentures: [
          String(data.ventures.alpha._id),
          String(data.ventures.beta._id),
        ],
      })
    )
    assert.equal(nobody.body.field, 'invites')
    const tight = await as(admin).post(
      URL,
      extra({ endTime: '15:30', slotMinutes: 20 })
    )
    assert.equal(tight.body.field, 'capacity')
    assert.equal((await extraSessions()).length, 0)
  })

  it('is for admins and the academic board only', async () => {
    await saveProgramme()
    for (const who of ['mentor', 'owner']) {
      const user = data.users[who]
      assert.equal((await as(user).get(URL)).status, 403, who)
      assert.equal((await as(user).post(URL, extra())).status, 403, who)
    }
    const page = await as(data.users.board).get(URL)
    assert.equal(page.status, 200)
    assert.equal(page.body.configured, true)
    assert.equal(page.body.invites.length, 2)
    assert.deepEqual(page.body.defaults.staff, [String(data.users.admin._id)])
  })
})

describe('changing an extra session', () => {
  it('moves its meetings, then cancels them', async () => {
    await saveProgramme()
    const { board, owner } = data.users
    await as(board).post(URL, extra())
    const [session] = await extraSessions()
    google.calls.length = 0

    const moved = await as(board).put(
      `${URL}/${session._id}`,
      extra({ startTime: '17:00', endTime: '18:00' })
    )
    assert.equal(moved.status, 200)
    const [meeting] = await meetingsOf(session)
    const after = await ProgrammeSession.findById(session._id)
    assert.equal(meeting.scheduledAt.getTime(), after.startsAt.getTime())
    assert.equal(callsTo('patchEvent').length, 2)
    assert.equal(callsTo('createEvent').length, 0)

    const cancelled = await as(board).post(`${URL}/${session._id}/cancel`)
    assert.equal(cancelled.status, 200)
    assert.equal(
      (await ProgrammeSession.findById(session._id)).status,
      'CANCELLED'
    )
    assert.equal(await CheckIn.countDocuments({ status: 'SCHEDULED' }), 0)
    assert.equal(
      emailsTo(owner.email, /Cancelled: Demo day rehearsal/).length,
      1
    )

    const again = await as(board).post(`${URL}/${session._id}/cancel`)
    assert.equal(again.status, 409)
  })

  it("can't change a bi-weekly session through these routes", async () => {
    await saveProgramme()
    const regular = await ProgrammeSession.findOne({ number: 1 })
    const res = await as(data.users.admin).post(`${URL}/${regular._id}/cancel`)
    assert.equal(res.status, 404)
  })
})

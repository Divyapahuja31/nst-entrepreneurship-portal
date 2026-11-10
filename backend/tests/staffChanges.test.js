import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app from '../app.js'
import Batch from '../models/batch.js'
import CheckIn from '../models/checkIn.js'
import Founder from '../models/founder.js'
import Programme from '../models/programme.js'
import ProgrammeSession from '../models/programmeSession.js'
import Role from '../models/role.js'
import User from '../models/user.js'
import {
  connectCalendar,
  cookieFor,
  seed,
  sentEmails,
  startDatabase,
  stopDatabase,
} from './helpers.js'

// Alpha: founded by `owner` (and `second` here), mentored by `mentor`.
// Beta: founded by `outsider`. `admin` hosts the programme.
let data
const DAY_MS = 24 * 60 * 60 * 1000
const TZ = 'Asia/Kolkata'
const as = user => ({
  get: url => request(app).get(url).set('Cookie', cookieFor(user)),
  put: (url, body) =>
    request(app).put(url).set('Cookie', cookieFor(user)).send(body),
  post: (url, body) =>
    request(app).post(url).set('Cookie', cookieFor(user)).send(body),
  patch: (url, body) =>
    request(app).patch(url).set('Cookie', cookieFor(user)).send(body),
  delete: url => request(app).delete(url).set('Cookie', cookieFor(user)),
})

const today = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
const weekdayOf = ymd => new Date(`${ymd}T00:00:00Z`).getUTCDay()

// The first session is in two days, so saving schedules it.
const saveProgramme = staff =>
  as(data.users.admin).put('/api/admin/programme', {
    startDate: today(),
    weekday: (weekdayOf(today()) + 2) % 7,
    startTime: '18:00',
    endTime: '20:00',
    timeZone: TZ,
    mode: 'SLOTS',
    staff: staff.map(u => String(u._id)),
    excludedVentures: [],
    excludedFounders: [],
    slotMinutes: 15,
    gapMinutes: 0,
    firstGapMinutes: 0,
    leadDays: 7,
  })

const firstMeetings = async () => {
  const session = await ProgrammeSession.findOne({ number: 1 })
  return CheckIn.find({ session: session._id, status: 'SCHEDULED' }).populate(
    'staff',
    'username'
  )
}

before(startDatabase)
after(stopDatabase)
beforeEach(async () => {
  data = await seed()
  await connectCalendar(data.users.admin)
  await connectCalendar(data.users.mentor)
})

describe('a founder given a staff role', () => {
  it('leaves their startup, and its check-ins stop inviting them', async () => {
    const studentRole = await Role.findOne({ name: 'student' })
    const second = await User.create({
      username: 'Sam Second',
      email: 'sam@adypu.edu.in',
      password: 'password123',
      role: studentRole._id,
      isEmailVerified: true,
    })
    await Founder.create({ user: second._id, venture: data.ventures.alpha._id })
    const scheduled = await as(data.users.mentor).post('/api/checkins', {
      ventureId: String(data.ventures.alpha._id),
      startAt: new Date(Date.now() + 2 * DAY_MS).toISOString(),
      timeZone: TZ,
    })
    const [checkIn] = scheduled.body.checkIns
    assert.equal(checkIn.attendees.length, 2)

    const res = await as(data.users.admin).patch(
      `/api/admin/accounts/${second._id}/role`,
      { role: 'mentor' }
    )
    assert.equal(res.status, 200)
    assert.equal(
      (await Founder.findOne({ user: second._id })).status,
      'INACTIVE'
    )
    const after = await CheckIn.findById(checkIn._id)
    assert.deepEqual(
      after.attendees.map(a => a.email),
      ['olu@adypu.edu.in']
    )
  })
})

describe('someone who runs programme sessions', () => {
  it('deactivated: leaves the staff, and their startups move to the others', async () => {
    const { admin, mentor } = data.users
    assert.equal((await saveProgramme([admin, mentor])).status, 200)
    const before = await firstMeetings()
    assert.ok(before.some(m => m.staff.some(s => s.username === 'Mo Mentor')))

    const res = await as(admin).delete(`/api/admin/accounts/${mentor._id}`)
    assert.equal(res.status, 200)

    const programme = await Programme.findOne({ key: 'programme' })
    assert.deepEqual(programme.staff.map(String), [String(admin._id)])
    const meetings = await firstMeetings()
    assert.equal(meetings.length, 2)
    assert.ok(
      meetings.every(m => m.staff.every(s => s.username === 'Ada Admin'))
    )

    // The page and a later save don't trip over them.
    const page = await as(admin).get('/api/admin/programme')
    assert.deepEqual(page.body.programme.staff, [String(admin._id)])
    assert.equal(page.body.capacity.staff, 1)
  })

  it('made a student: leaves the staff too', async () => {
    const { admin, mentor } = data.users
    await saveProgramme([admin, mentor])
    const batch = await Batch.create({
      name: '2025-29',
      startYear: 2025,
      endYear: 2029,
      campus: data.campus._id,
    })
    await as(admin).patch(`/api/admin/accounts/${mentor._id}/role`, {
      role: 'student',
      batch: String(batch._id),
    })
    const programme = await Programme.findOne({ key: 'programme' })
    assert.deepEqual(programme.staff.map(String), [String(admin._id)])
  })

  it('a stale staff list from before still loads and saves', async () => {
    const { admin, mentor } = data.users
    await saveProgramme([admin, mentor])
    // As if deactivated before this fix: still listed in the settings.
    await User.updateOne(
      { _id: mentor._id },
      { $set: { deletedAt: new Date() } }
    )
    const page = await as(admin).get('/api/admin/programme')
    assert.deepEqual(page.body.programme.staff, [String(admin._id)])
    const savedAgain = await as(admin).put('/api/admin/programme', {
      ...page.body.programme,
    })
    assert.equal(savedAgain.status, 200)
  })
})

describe('a redraw', () => {
  it("doesn't tell staff a session is cancelled when they still run part of it", async () => {
    const { admin, mentor } = data.users
    await saveProgramme([admin, mentor])
    const session = await ProgrammeSession.findOne({ number: 1 })
    sentEmails.length = 0
    const res = await as(admin).post(
      `/api/admin/programme/sessions/${session._id}/redraw`
    )
    assert.equal(res.status, 200)
    const staffEmails = sentEmails.filter(e => /@newtonschool\.co$/.test(e.to))
    assert.ok(staffEmails.length > 0)
    assert.ok(staffEmails.every(e => !/^Cancelled/.test(e.subject)))
    assert.ok(staffEmails.every(e => !/1 startups/.test(e.text)))
  })
})

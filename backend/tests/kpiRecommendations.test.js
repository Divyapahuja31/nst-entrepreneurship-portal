import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import request from 'supertest'

import app from '../app.js'
import CheckIn from '../models/checkIn.js'
import Founder from '../models/founder.js'
import KPI from '../models/kpi.js'
import KpiRecommendation from '../models/kpiRecommendation.js'
import ProgrammeSession from '../models/programmeSession.js'
import User from '../models/user.js'
import { kpiBotModeFor } from '../utils/programmeScheduler.js'
import { migrateKpiBotModes } from '../utils/kpiBotModeMigration.js'
import { cookieFor, seed, startDatabase, stopDatabase } from './helpers.js'

// Alpha is mentored by Mo Mentor and founded by Olu Owner and Vic
// Cofounder; Beta is mentored by Max Mentor.
let data
let vic
let checkIn

const DAY_MS = 24 * 60 * 60 * 1000

const recommend = (founder, fields = {}) =>
  KpiRecommendation.create({
    _id: new mongoose.Types.ObjectId(),
    venture: data.ventures.alpha._id,
    founder: founder._id,
    checkIn: checkIn._id,
    title: `Goal for ${founder.username}`,
    description:
      'Reach 200 users\n\nMeeting: 2026-10-19\nFrom the transcript: "We will reach 200 users."',
    targetValue: '200 users',
    dueDate: new Date(Date.now() + 7 * DAY_MS),
    quote: 'We will reach 200 users.',
    meetingDate: '2026-10-19',
    ...fields,
  })

const as = user => ({
  get: url => request(app).get(url).set('Cookie', cookieFor(user)),
  post: url => request(app).post(url).set('Cookie', cookieFor(user)),
  put: url => request(app).put(url).set('Cookie', cookieFor(user)),
})

const meeting = (fields = {}) =>
  CheckIn.create({
    venture: data.ventures.alpha._id,
    mentor: data.users.mentor._id,
    scheduledAt: new Date('2026-10-19T07:30:00Z'),
    durationMinutes: 30,
    timeZone: 'Asia/Kolkata',
    googleEventId: 'event1',
    status: 'HELD',
    ...fields,
  })

before(startDatabase)
after(stopDatabase)
beforeEach(async () => {
  data = await seed()
  vic = await User.create({
    username: 'Vic Cofounder',
    email: 'vic@adypu.edu.in',
    googleId: 'vic-google',
    password: 'password123',
    role: data.users.owner.role,
  })
  await Founder.create({ user: vic._id, venture: data.ventures.alpha._id })
  checkIn = await meeting({ kpiBotMode: 'AUTO' })
})

describe('recommended KPIs', () => {
  it('shows a founder only their own, and staff their startups', async () => {
    await recommend(data.users.owner)
    await recommend(vic)
    await recommend(data.users.owner, { status: 'DISMISSED' })

    const olu = await as(data.users.owner).get('/api/kpi-recommendations')
    assert.equal(olu.status, 200)
    assert.deepEqual(
      olu.body.data.map(r => r.title),
      ['Goal for Olu Owner']
    )

    const url = `/api/kpi-recommendations?ventureId=${data.ventures.alpha._id}`
    const mo = await as(data.users.mentor).get(url)
    assert.equal(mo.status, 200)
    assert.equal(mo.body.data.length, 2)
    assert.equal((await as(data.users.board).get(url)).body.data.length, 2)
    assert.equal((await as(data.users.otherMentor).get(url)).status, 403)
  })

  it('leaves out a founder who has left the startup', async () => {
    await recommend(vic)
    await Founder.updateOne({ user: vic._id }, { status: 'LEFT' })
    const url = `/api/kpi-recommendations?ventureId=${data.ventures.alpha._id}`
    assert.equal((await as(data.users.mentor).get(url)).body.data.length, 0)
    const accept = await as(data.users.mentor).post(
      `/api/kpi-recommendations/${(await KpiRecommendation.findOne())._id}/accept`
    )
    assert.equal(accept.status, 409)
  })

  it("turns into the founder's draft KPI once, however often it's accepted", async () => {
    const rec = await recommend(data.users.owner)
    const url = `/api/kpi-recommendations/${rec._id}/accept`
    const [one, two] = await Promise.all([
      as(data.users.owner).post(url),
      as(data.users.owner).post(url),
    ])
    assert.deepEqual([one.status, two.status].sort(), [201, 409])

    const kpis = await KPI.find({ founder: data.users.owner._id }).lean()
    assert.equal(kpis.length, 1)
    const [kpi] = kpis
    assert.equal(String(kpi._id), String(rec._id))
    assert.equal(kpi.status, 'DRAFT')
    assert.equal(kpi.scope, 'FOUNDER')
    assert.equal(kpi.targetValue, '200 users')
    assert.equal(String(kpi.createdBy), String(data.users.owner._id))
    assert.equal((await KpiRecommendation.findById(rec._id)).status, 'ACCEPTED')
    // It is the founder's to work on now.
    const mine = await as(data.users.owner).get('/api/kpis')
    assert.ok(mine.body.data.some(k => String(k._id) === String(rec._id)))
  })

  it('can be accepted by the mentor or the board, not by others', async () => {
    const forOlu = await recommend(data.users.owner)
    const forVic = await recommend(vic)
    const accept = (user, rec) =>
      as(user).post(`/api/kpi-recommendations/${rec._id}/accept`)

    assert.equal((await accept(vic, forOlu)).status, 403)
    assert.equal((await accept(data.users.outsider, forOlu)).status, 403)
    assert.equal((await accept(data.users.otherMentor, forOlu)).status, 403)
    assert.equal((await accept(data.users.mentor, forOlu)).status, 201)
    assert.equal((await accept(data.users.board, forVic)).status, 201)
    const kpi = await KPI.findById(forOlu._id)
    assert.equal(String(kpi.createdBy), String(data.users.mentor._id))
    assert.equal(String(kpi.founder), String(data.users.owner._id))
  })

  it("won't accept one whose due date has passed", async () => {
    const rec = await recommend(data.users.owner, {
      dueDate: new Date(Date.now() - DAY_MS),
    })
    const res = await as(data.users.owner).post(
      `/api/kpi-recommendations/${rec._id}/accept`
    )
    assert.equal(res.status, 409)
    assert.equal(await KPI.countDocuments({ _id: rec._id }), 0)
  })

  it('is dropped when dismissed', async () => {
    const rec = await recommend(data.users.owner)
    const url = `/api/kpi-recommendations/${rec._id}/dismiss`
    assert.equal((await as(vic).post(url)).status, 403)
    assert.equal((await as(data.users.owner).post(url)).status, 200)
    assert.equal((await as(data.users.owner).post(url)).status, 409)
    assert.equal(
      (await as(data.users.owner).get('/api/kpi-recommendations')).body.data
        .length,
      0
    )
    assert.equal(await KPI.countDocuments({ _id: rec._id }), 0)
  })
})

describe('adding the KPI bot to a meeting', () => {
  it("is for the meeting's mentor, before the bot has read it", async () => {
    const off = await meeting({ googleEventId: 'event2' })
    const url = `/api/checkins/${off._id}/kpi-bot`
    assert.equal((await as(data.users.owner).post(url)).status, 403)
    assert.equal((await as(data.users.otherMentor).post(url)).status, 403)
    const added = await as(data.users.mentor).post(url)
    assert.equal(added.status, 200)
    assert.equal(added.body.checkIn.kpiBot.mode, 'ON')
    // Already on, like a bi-weekly session's.
    assert.equal((await as(data.users.mentor).post(url)).status, 409)
    assert.equal(
      (await as(data.users.mentor).post(`/api/checkins/${checkIn._id}/kpi-bot`))
        .status,
      409
    )

    const read = await meeting({
      googleEventId: 'event3',
      kpiExtraction: { status: 'SKIPPED' },
    })
    assert.equal(
      (await as(data.users.mentor).post(`/api/checkins/${read._id}/kpi-bot`))
        .status,
      409
    )
    const noTranscript = await meeting({
      googleEventId: 'event4',
      transcript: { status: 'UNAVAILABLE' },
    })
    assert.equal(
      (
        await as(data.users.mentor).post(
          `/api/checkins/${noTranscript._id}/kpi-bot`
        )
      ).status,
      409
    )
  })

  it('lets an active founder run the bot on the local demo check-in only', async t => {
    const demo = await meeting({ googleEventId: 'demo-kpi-bot' })
    const ordinary = await meeting({ googleEventId: 'another-event' })
    const founder = as(data.users.owner)
    const demoUrl = `/api/checkins/${demo.id}`
    const ordinaryUrl = `/api/checkins/${ordinary.id}`
    assert.equal((await founder.post(demoUrl + '/kpi-bot')).status, 403)

    app.locals.kpiDemoCheckInId = demo.id
    t.after(() => {
      delete app.locals.kpiDemoCheckInId
    })

    const visible = await founder.get(demoUrl)
    assert.equal(visible.status, 200)
    assert.equal(visible.body.checkIn.canRunDemoBot, true)
    assert.equal(
      (await founder.get(ordinaryUrl)).body.checkIn.canRunDemoBot,
      undefined
    )
    assert.equal((await founder.post(ordinaryUrl + '/kpi-bot')).status, 403)
    assert.equal(
      (await founder.put(demoUrl + '/notes').send({ notes: 'Test' })).status,
      403
    )
    assert.equal(
      (await as(data.users.outsider).post(demoUrl + '/kpi-bot')).status,
      403
    )
    await Founder.updateOne({ user: vic._id }, { status: 'LEFT' })
    assert.equal((await as(vic).post(demoUrl + '/kpi-bot')).status, 403)

    const added = await founder.post(demoUrl + '/kpi-bot')
    assert.equal(added.status, 200)
    assert.equal(added.body.checkIn.kpiBot.mode, 'ON')
  })

  it('activates the demo bot only once across concurrent founder requests', async t => {
    const demo = await meeting({ googleEventId: 'demo-kpi-bot' })
    app.locals.kpiDemoCheckInId = demo.id
    t.after(() => {
      delete app.locals.kpiDemoCheckInId
    })

    const url = `/api/checkins/${demo.id}/kpi-bot`
    const responses = await Promise.all([
      as(data.users.owner).post(url),
      as(vic).post(url),
    ])
    assert.deepEqual(responses.map(res => res.status).sort(), [200, 409])
    assert.equal(
      responses.find(res => res.status === 409).body.kpiBot.mode,
      'ON'
    )
    assert.equal((await CheckIn.findById(demo._id)).kpiBotMode, 'ON')
  })

  it('adds it for every startup in a group session', async () => {
    const session = new mongoose.Types.ObjectId()
    const group = {
      session,
      group: true,
      googleEventId: 'group-event',
      staff: [data.users.mentor._id],
    }
    const alpha = await meeting(group)
    const beta = await meeting({ ...group, venture: data.ventures.beta._id })
    const res = await as(data.users.mentor).post(
      `/api/checkins/${alpha._id}/kpi-bot`
    )
    assert.equal(res.status, 200)
    assert.equal((await CheckIn.findById(beta._id)).kpiBotMode, 'ON')
  })

  it("is set when a mentor's check-in is scheduled with it", async () => {
    // Without it, a new check-in reads as off.
    assert.equal((await meeting({ googleEventId: 'e5' })).kpiBotMode, 'OFF')
    assert.equal(kpiBotModeFor({ number: 3 }), 'AUTO')
    assert.equal(kpiBotModeFor({ extra: { kpiBot: false } }), 'OFF')
    assert.equal(kpiBotModeFor({ extra: { kpiBot: true } }), 'ON')
  })
})

describe('giving older meetings a KPI bot mode', () => {
  it('turns it on for bi-weekly sessions and meetings already read', async () => {
    const at = new Date('2026-10-19T07:30:00Z')
    const biWeekly = await ProgrammeSession.create({
      number: 1,
      startsAt: at,
      endsAt: at,
    })
    const extra = await ProgrammeSession.create({
      extra: { title: 'Demo day' },
      startsAt: at,
      endsAt: at,
    })
    const raw = fields =>
      CheckIn.collection
        .insertOne({
          venture: data.ventures.alpha._id,
          mentor: data.users.mentor._id,
          scheduledAt: at,
          durationMinutes: 30,
          timeZone: 'Asia/Kolkata',
          googleEventId: 'old',
          kpiExtraction: { status: 'PENDING', attempts: 0 },
          ...fields,
        })
        .then(r => r.insertedId)
    const ids = {
      biWeekly: await raw({ session: biWeekly._id }),
      extra: await raw({ session: extra._id }),
      read: await raw({ kpiExtraction: { status: 'DONE', attempts: 1 } }),
      untouched: await raw({}),
    }
    const counts = await migrateKpiBotModes()
    // The meeting the beforeEach made already has a mode.
    assert.deepEqual(counts, { AUTO: 1, ON: 1, OFF: 2 })
    const mode = async id => (await CheckIn.findById(id)).kpiBotMode
    assert.equal(await mode(ids.biWeekly), 'AUTO')
    assert.equal(await mode(ids.extra), 'OFF')
    assert.equal(await mode(ids.read), 'ON')
    assert.equal(await mode(ids.untouched), 'OFF')
    assert.deepEqual(await migrateKpiBotModes(), { AUTO: 0, ON: 0, OFF: 0 })
  })
})

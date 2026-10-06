import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app from '../app.js'
import Batch from '../models/batch.js'
import EmailNotification from '../models/emailNotification.js'
import KPI from '../models/kpi.js'
import User from '../models/user.js'
import Venture from '../models/venture.js'
import { sendLockedKpiEmails, settleEmailJobs } from '../utils/kpiLockEmails.js'
import {
  cookieFor,
  emailFailures,
  seed,
  sentEmails,
  startDatabase,
  stopDatabase,
} from './helpers.js'

// Alpha is mentored by Mo and founded by Olu; Bo is the academic board.
let data
const STUDENT = 'olu@adypu.edu.in'
const MENTOR = 'mo@newtonschool.co'
const BOARD = 'bo@newtonschool.co'

before(startDatabase)
after(stopDatabase)
beforeEach(async () => {
  data = await seed()
  await EmailNotification.syncIndexes()
})

let day = 0
const lockedKpi = (score, fields = {}) => {
  day += 1
  return KPI.create({
    title: `KPI ${day}`,
    description: 'Talk to customers',
    venture: data.ventures.alpha._id,
    createdBy: data.users.owner._id,
    status: 'GRADED',
    score,
    isLocked: true,
    lockedAt: new Date(),
    dueDate: new Date(2026, 0, day),
    ...fields,
  })
}

// Locks a run of grades, sending each one's emails as it is locked.
const lockRun = async (...scores) => {
  const kpis = []
  for (const score of scores) {
    const kpi = await lockedKpi(score)
    kpis.push(kpi)
    await sendLockedKpiEmails(kpi._id)
  }
  return kpis
}

const to = address => sentEmails.filter(email => email.to === address)
const subjects = address => to(address).map(email => email.subject)

describe('locking a KPI', () => {
  it('emails the student from the lock route', async () => {
    const { mentor } = data.users
    const kpi = data.kpis.alphaGraded
    const res = await request(app)
      .post(`/api/kpis/${kpi._id}/lock`)
      .set('Cookie', cookieFor(mentor))
    assert.equal(res.status, 200)
    await settleEmailJobs()

    assert.deepEqual(subjects(STUDENT), [
      'Your Entrepreneurship Evaluation Result is Ready',
    ])
    const row = await EmailNotification.findOne({ recipientEmail: STUDENT })
    assert.equal(row.type, 'KPI_SCORED_STUDENT')
    assert.equal(row.status, 'SENT')
    assert.equal(String(row.recipientUser), String(data.users.owner._id))
    assert.equal(row.dedupeKey, `kpi:${kpi._id}`)
  })

  it('sends nothing when the lock is refused', async () => {
    const res = await request(app)
      .post(`/api/kpis/${data.kpis.alphaGraded._id}/lock`)
      .set('Cookie', cookieFor(data.users.owner))
    assert.equal(res.status, 403)
    await settleEmailJobs()
    assert.equal(sentEmails.length, 0)
  })

  it('emails the result only once, even when locked again', async () => {
    const [kpi] = await lockRun(90)
    await sendLockedKpiEmails(kpi._id)
    assert.equal(to(STUDENT).length, 1)
  })

  it('emails nobody about a KPI that is not locked', async () => {
    const result = await sendLockedKpiEmails(data.kpis.alphaGraded._id)
    assert.equal(result.success, false)
    assert.equal(sentEmails.length, 0)
  })
})

describe('alerts after a run of poor grades', () => {
  it('stay quiet after one poor grade', async () => {
    await lockRun(20)
    assert.equal(to(MENTOR).length + to(BOARD).length, 0)
  })

  it('reach the mentor and the board after two low grades', async () => {
    await lockRun(30, 20)
    assert.deepEqual(subjects(MENTOR), [
      "Attention Required: Alpha's Evaluation Score is Below 40%",
    ])
    assert.deepEqual(subjects(BOARD), [
      "Academic Board Notification: Alpha's Evaluation Score is Below 40%",
    ])
    const board = to(BOARD)[0]
    assert.match(board.text, /Mentor: Mo Mentor/)
    assert.match(board.text, /Email: olu@adypu\.edu\.in/)
  })

  it('reach only the mentor after two middling grades', async () => {
    await lockRun(60, 50)
    assert.deepEqual(subjects(MENTOR), [
      'Action Required: Connect with Alpha Regarding Evaluation',
    ])
    assert.equal(to(BOARD).length, 0)
  })

  it('name the batch from the student account', async () => {
    const batch = await Batch.create({
      name: '2025-2029',
      startYear: 2025,
      endYear: 2029,
      campus: data.campus._id,
    })
    await User.updateOne(
      { _id: data.users.owner._id },
      { $set: { batch: batch._id } }
    )

    await lockRun(10, 10)
    assert.match(to(BOARD)[0].text, /Batch: 2025-2029/)
  })

  it('go to the board instead when there is no mentor, once each', async () => {
    await Venture.updateOne(
      { _id: data.ventures.alpha._id },
      { $set: { mentor: null } }
    )
    await lockRun(30, 20)
    assert.equal(to(MENTOR).length, 0)
    assert.deepEqual(subjects(BOARD), [
      "Academic Board Notification: Alpha's Evaluation Score is Below 40%",
    ])
    assert.match(to(BOARD)[0].text, /Mentor: Unassigned/)
  })

  it('send a middling run to the board when there is no mentor', async () => {
    await Venture.updateOne(
      { _id: data.ventures.alpha._id },
      { $set: { mentor: null } }
    )
    await lockRun(60, 50)
    assert.deepEqual(subjects(BOARD), [
      'Action Required: Connect with Alpha Regarding Evaluation',
    ])
  })

  it("count a founder's own KPIs apart from the startup's", async () => {
    const { owner } = data.users
    await lockRun(20)
    const own = await lockedKpi(20, { founder: owner._id })
    await sendLockedKpiEmails(own._id)
    assert.equal(to(MENTOR).length + to(BOARD).length, 0)

    const second = await lockedKpi(20, { founder: owner._id })
    await sendLockedKpiEmails(second._id)
    assert.deepEqual(subjects(MENTOR), [
      "Attention Required: Olu Owner's Evaluation Score is Below 40%",
    ])
  })

  it('still reach everyone else when one email fails', async t => {
    t.mock.method(console, 'error', () => {})
    emailFailures.add(STUDENT)
    await lockedKpi(20)
    const kpi = await lockedKpi(20)
    const result = await sendLockedKpiEmails(kpi._id)

    assert.equal(result.success, false)
    assert.match(result.error, /1 email/)
    assert.equal(to(MENTOR).length, 1)
    assert.equal(to(BOARD).length, 1)
    const failed = await EmailNotification.findOne({ status: 'FAILED' })
    assert.equal(failed.recipientEmail, STUDENT)
  })
})

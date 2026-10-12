import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app from '../app.js'
import Batch from '../models/batch.js'
import User from '../models/user.js'
import Venture from '../models/venture.js'
import VentureProposal from '../models/ventureProposal.js'
import { cookieFor, seed, startDatabase, stopDatabase } from './helpers.js'

let data
const as = user => ({
  post: (url, body) =>
    request(app).post(url).set('Cookie', cookieFor(user)).send(body),
  patch: (url, body) =>
    request(app).patch(url).set('Cookie', cookieFor(user)).send(body),
})

before(startDatabase)
after(stopDatabase)
beforeEach(async () => {
  data = await seed()
})

const proposal = (fields = {}) => ({
  startupName: 'Gamma',
  description: 'Students wait weeks for a mentor.',
  targetCustomer: 'First-year students',
  stage: 'IDEATION',
  currentTraction: '12 interviews',
  businessModel: 'Subscription',
  assumptions: ['Students want faster access'],
  risks: ['Mentors may not sign up'],
  sixMonthGoals: '50 active students',
  techStack: 'React',
  capitalStatus: 'Bootstrapped',
  weeklyHours: 10,
  industry: String(data.industry._id),
  ...fields,
})

describe('the campus a proposal is filed under', () => {
  it('a student without one is asked to choose it', async () => {
    const { applicant } = data.users
    const res = await as(applicant).post('/api/proposals', proposal())
    assert.equal(res.status, 400)
    assert.equal(res.body.code, 'CAMPUS_REQUIRED')

    const chosen = await as(applicant).post('/api/proposals', {
      ...proposal(),
      campus: String(data.campus._id),
    })
    assert.equal(chosen.status, 201)
    const stored = await User.findById(applicant._id)
    assert.equal(String(stored.campus), String(data.campus._id))
  })

  it("comes from the student's batch when their account has none", async () => {
    const { applicant } = data.users
    const batch = await Batch.create({
      name: '2025-29',
      startYear: 2025,
      endYear: 2029,
      campus: data.campus._id,
    })
    await User.updateOne({ _id: applicant._id }, { $set: { batch: batch._id } })
    const res = await as(applicant).post('/api/proposals', proposal())
    assert.equal(res.status, 201)
    assert.equal(String(res.body.proposal.campus), String(data.campus._id))
  })

  it('one assumption and one risk are enough', async () => {
    const { applicant } = data.users
    const res = await as(applicant).post('/api/proposals', {
      ...proposal({ assumptions: ['One', '', ''], risks: ['One', '', ''] }),
      campus: String(data.campus._id),
    })
    assert.equal(res.status, 201)
  })
})

describe('startup names', () => {
  it('a proposal may not take a name already in use, in any case', async () => {
    const res = await as(data.users.applicant).post('/api/proposals', {
      ...proposal({ startupName: '  alpha ' }),
      campus: String(data.campus._id),
    })
    assert.equal(res.status, 409)
    assert.equal(res.body.error, 'A startup with this name already exists')
  })

  it('approving a proposal whose name was taken since is refused', async () => {
    const { applicant, board, mentor } = data.users
    await as(applicant).post('/api/proposals', {
      ...proposal(),
      campus: String(data.campus._id),
    })
    await Venture.create({
      name: 'GAMMA',
      campus: data.campus._id,
      industry: data.industry._id,
    })
    const pending = await VentureProposal.findOne({ startupName: 'Gamma' })
    const res = await as(board).patch(
      `/api/admin/proposals/${pending._id}/review`,
      { status: 'APPROVED', mentorId: String(mentor._id) }
    )
    assert.equal(res.status, 409)
    assert.equal(await Venture.countDocuments({ name: /^gamma$/i }), 1)
  })

  it('Add Founder refuses a name already in use', async () => {
    const batch = await Batch.create({
      name: '2025-29',
      startYear: 2025,
      endYear: 2029,
      campus: data.campus._id,
    })
    const res = await as(data.users.board).post('/api/admin/founders', {
      founder: 'Fay Founder',
      email: 'fay@adypu.edu.in',
      startup: 'Alpha',
      industry: String(data.industry._id),
      batch: String(batch._id),
      stage: 'IDEATION',
      mentorId: String(data.users.mentor._id),
    })
    assert.equal(res.status, 409)
    assert.equal(
      res.body.error.startup,
      'A startup with this name already exists'
    )
    assert.equal(await User.countDocuments({ email: 'fay@adypu.edu.in' }), 0)
  })
})

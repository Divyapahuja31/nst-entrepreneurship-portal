import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import request from 'supertest'

import app from '../app.js'
import BiWeeklyEvaluation from '../models/biWeeklyEvaluation.js'
import BiWeeklySubmission from '../models/biWeeklySubmission.js'
import Founder from '../models/founder.js'
import { ventureCycleKey } from '../utils/biweeklyHelper.js'
import {
  ARCHIVE,
  migrateBiweeklyToVentures,
} from '../utils/biweeklyMigration.js'
import { cookieFor, seed, startDatabase, stopDatabase } from './helpers.js'

// Alpha: mentored by `mentor`, founded by `owner`. `applicant` is in no
// startup.
let data
const as = user => ({
  get: url => request(app).get(url).set('Cookie', cookieFor(user)),
  post: (url, body) =>
    request(app).post(url).set('Cookie', cookieFor(user)).send(body),
})

before(startDatabase)
after(stopDatabase)
beforeEach(async () => {
  data = await seed()
})

describe('bi-weekly reports belong to the startup', () => {
  it("a student's report is the startup's, shared with co-founders", async () => {
    const { owner, applicant } = data.users
    const { alpha } = data.ventures
    await Founder.create({ user: applicant._id, venture: alpha._id })

    const saved = await as(owner).post('/api/biweekly/submission', {
      cycle_number: 1,
      progress_summary: 'Ran ten interviews',
    })
    assert.equal(saved.status, 200)
    assert.equal(String(saved.body.submission.venture), String(alpha._id))
    assert.equal(saved.body.submission.custom_id, ventureCycleKey(alpha._id, 1))

    const coFounder = await as(applicant).get('/api/biweekly')
    assert.equal(coFounder.status, 200)
    assert.deepEqual(
      coFounder.body.submissions.map(row => row.progress_summary),
      ['Ran ten interviews']
    )
  })

  it("staff see a founder's startup reports from the founder page", async () => {
    const { owner, board } = data.users
    await as(owner).post('/api/biweekly/submission', {
      cycle_number: 1,
      wins: 'First customer',
    })

    const res = await as(board).get(`/api/biweekly?founderId=${owner._id}`)
    assert.equal(res.status, 200)
    assert.equal(res.body.founder.username, owner.username)
    assert.equal(String(res.body.venture._id), String(data.ventures.alpha._id))
    assert.equal(res.body.submissions[0].wins, 'First customer')
  })

  it('a founder without a startup has no reports', async () => {
    const { applicant, board } = data.users
    const own = await as(applicant).get('/api/biweekly')
    assert.equal(own.body.venture, null)
    assert.deepEqual(own.body.submissions, [])

    const viaStaff = await as(board).get(
      `/api/biweekly?founderId=${applicant._id}`
    )
    assert.equal(viaStaff.body.founder.username, applicant.username)
    assert.deepEqual(viaStaff.body.submissions, [])
  })

  it('staff review a startup, never a founder on their own', async () => {
    const { board, owner } = data.users
    const byFounder = await as(board).post('/api/biweekly/observation', {
      founderId: String(owner._id),
      cycle_number: 1,
      observation: 'Good progress',
    })
    assert.equal(byFounder.status, 404)
    assert.equal(await BiWeeklySubmission.countDocuments(), 0)

    const byStartup = await as(board).post('/api/biweekly/observation', {
      ventureId: String(data.ventures.alpha._id),
      cycle_number: 1,
      observation: 'Good progress',
    })
    assert.equal(byStartup.status, 200)
  })

  it('keeps one report per startup per cycle', async () => {
    await BiWeeklySubmission.syncIndexes()
    const row = { venture: data.ventures.alpha._id, cycle_number: 2 }
    await BiWeeklySubmission.create({ ...row, custom_id: 'a' })
    await assert.rejects(
      BiWeeklySubmission.create({ ...row, custom_id: 'b' }),
      { code: 11000 }
    )
  })

  it('needs a startup', async () => {
    await assert.rejects(
      BiWeeklySubmission.create({ custom_id: 'x', cycle_number: 1 }),
      { name: 'ValidationError' }
    )
  })
})

describe('moving existing reports onto startups', () => {
  // Old reports don't fit the current schema, so they go in directly.
  const raw = () => BiWeeklySubmission.collection
  const insertOld = fields =>
    raw().insertOne({ updatedAt: new Date(), ...fields })
  const archived = () =>
    mongoose.connection.collection(ARCHIVE).find().toArray()

  it("moves a founder's report onto their startup", async () => {
    const { owner } = data.users
    const { alpha } = data.ventures
    await insertOld({
      custom_id: `${owner._id}_cycle_1`,
      cycle_number: 1,
      scope: 'FOUNDER',
      founder: owner._id,
      venture: null,
      wins: 'Shipped the MVP',
    })

    const result = await migrateBiweeklyToVentures()
    assert.equal(result.updated, 1)

    const [row] = await raw().find().toArray()
    assert.equal(String(row.venture), String(alpha._id))
    assert.equal(row.custom_id, ventureCycleKey(alpha._id, 1))
    assert.equal(row.founder, undefined)
    assert.equal(row.scope, undefined)
    assert.equal(row.wins, 'Shipped the MVP')

    // The student now sees it, and saving updates it instead of adding one.
    const saved = await as(owner).post('/api/biweekly/submission', {
      cycle_number: 1,
      blockers: 'None',
    })
    assert.equal(saved.status, 200)
    const rows = await raw().find().toArray()
    assert.equal(rows.length, 1)
    assert.equal(rows[0].blockers, 'None')
  })

  it('keeps the submitted report of two, with every review', async () => {
    const { owner } = data.users
    const { alpha } = data.ventures
    const evaluation = await BiWeeklyEvaluation.create({
      checklist_id: 1,
      month_number: 1,
      execution_score: 40,
    })
    // An old report moved onto the startup by an earlier version, still
    // under its founder key, next to a report filed for the startup.
    await insertOld({
      custom_id: `${owner._id}_cycle_1`,
      cycle_number: 1,
      founder: owner._id,
      venture: alpha._id,
      submitted_at: new Date(),
      wins: 'Submitted',
    })
    await insertOld({
      custom_id: ventureCycleKey(alpha._id, 1),
      cycle_number: 1,
      venture: alpha._id,
      wins: 'Draft',
      biWeeklyEvaluation: evaluation._id,
    })

    const result = await migrateBiweeklyToVentures()
    assert.equal(result.reviewsMoved, 1)
    assert.equal(result.archived.length, 1)

    const rows = await raw().find().toArray()
    assert.equal(rows.length, 1)
    assert.equal(rows[0].wins, 'Submitted')
    assert.equal(rows[0].custom_id, ventureCycleKey(alpha._id, 1))
    assert.equal(String(rows[0].biWeeklyEvaluation), String(evaluation._id))

    const [copy] = await archived()
    assert.equal(copy.wins, 'Draft')
    assert.match(copy.archiveReason, /second report/)
  })

  it('archives the report of a founder who never joined a startup', async () => {
    const { applicant } = data.users
    await insertOld({
      custom_id: `${applicant._id}_cycle_1`,
      cycle_number: 1,
      scope: 'FOUNDER',
      founder: applicant._id,
      venture: null,
    })

    const result = await migrateBiweeklyToVentures()
    assert.equal(result.archived.length, 1)
    assert.equal(await raw().countDocuments(), 0)
    const [copy] = await archived()
    assert.equal(String(copy.founder), String(applicant._id))
    assert.match(copy.archiveReason, /no startup/)
  })

  it('changes nothing on a dry run, and nothing more on a second run', async () => {
    const { owner } = data.users
    await insertOld({
      custom_id: `${owner._id}_cycle_2`,
      cycle_number: 2,
      scope: 'FOUNDER',
      founder: owner._id,
      venture: null,
    })

    const dry = await migrateBiweeklyToVentures({ dryRun: true })
    assert.equal(dry.updated, 1)
    const [untouched] = await raw().find().toArray()
    assert.equal(untouched.venture, null)

    await migrateBiweeklyToVentures()
    const again = await migrateBiweeklyToVentures()
    assert.equal(again.updated, 0)
    assert.deepEqual(again.archived, [])
  })
})

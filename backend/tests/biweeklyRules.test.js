import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app from '../app.js'
import { updateOrCreateVentureSubmission } from '../utils/biweeklyHelper.js'
import BiWeeklySubmission from '../models/biWeeklySubmission.js'
import Venture from '../models/venture.js'
import { cookieFor, seed, startDatabase, stopDatabase } from './helpers.js'

// Alpha's cycles count from 45 days ago: cycle 1 is past its deadline,
// cycle 4 is current and cycle 6 hasn't started.
let data
const DAY_MS = 24 * 60 * 60 * 1000
const as = user => ({
  get: url => request(app).get(url).set('Cookie', cookieFor(user)),
  post: (url, body) =>
    request(app).post(url).set('Cookie', cookieFor(user)).send(body),
})

before(startDatabase)
after(stopDatabase)
beforeEach(async () => {
  data = await seed()
  await Venture.collection.updateOne(
    { _id: data.ventures.alpha._id },
    { $set: { createdAt: new Date(Date.now() - 45 * DAY_MS) } }
  )
})

const report = (cycle, fields = {}) =>
  as(data.users.owner).post('/api/biweekly/submission', {
    cycle_number: cycle,
    progress_summary: 'We ran ten interviews.',
    ...fields,
  })

const staff = (user, path, fields) =>
  as(user).post(`/api/biweekly/${path}`, {
    ventureId: String(data.ventures.alpha._id),
    ...fields,
  })

describe('a student report', () => {
  it("can't be saved or submitted after its deadline", async () => {
    const res = await report(1, { isSubmit: true })
    assert.equal(res.status, 403)
    assert.match(res.body.error, /deadline for cycle 1 has passed/)
  })

  it('needs a progress summary to be submitted', async () => {
    const res = await report(4, { progress_summary: ' ', isSubmit: true })
    assert.equal(res.status, 400)
    assert.equal(res.body.error, 'Add a progress summary before submitting.')
    assert.equal((await report(4, { progress_summary: '' })).status, 200)
  })

  it('takes numbers of 0 or more, and empty as 0', async () => {
    for (const [fields, message] of [
      [{ hours_worked: 'abc' }, 'Hours worked must be a number of 0 or more'],
      [{ revenue: -100 }, 'Revenue must be a number of 0 or more'],
      [
        { mentor_meeting_date: 'someday' },
        'Mentor meeting date must be a valid date',
      ],
      [{ wins: { $gt: '' } }, 'wins must be text'],
    ]) {
      const res = await report(4, fields)
      assert.equal(res.status, 400, JSON.stringify(fields))
      assert.equal(res.body.error, message)
    }
    const ok = await report(4, {
      hours_worked: '12',
      revenue: '',
      mentor_meeting_date: '',
    })
    assert.equal(ok.status, 200)
    assert.equal(ok.body.submission.hours_worked, 12)
    assert.equal(ok.body.submission.revenue, 0)
  })

  it('a late cycle the board reopens can be submitted again', async () => {
    const { board } = data.users
    const reopened = await staff(board, 'reopen', {
      cycle_number: 1,
      reopened_until: new Date(Date.now() + DAY_MS).toISOString(),
    })
    assert.equal(reopened.status, 200)
    assert.ok(reopened.body.submission.reopened_at)

    const res = await report(1, { isSubmit: true })
    assert.equal(res.status, 200)
    assert.equal(res.body.submission.reopened_at, null)
    // Submitted again, it is locked again.
    assert.equal((await report(1)).status, 403)
  })
})

describe('faculty reviews', () => {
  it('an observation needs notes, and a cycle that has started', async () => {
    const { mentor } = data.users
    let res = await staff(mentor, 'observation', {
      cycle_number: 4,
      observation: ' ',
    })
    assert.equal(res.status, 400)
    assert.equal(res.body.error, 'Observation notes are required.')
    res = await staff(mentor, 'observation', {
      cycle_number: 6,
      observation: 'Early',
    })
    assert.equal(res.status, 400)
    assert.equal(res.body.error, "Cycle 6 hasn't opened yet.")
    res = await staff(mentor, 'observation', {
      cycle_number: 4,
      observation: 'Good week',
    })
    assert.equal(res.status, 200)
  })

  it('an evaluation is weighted out of 100, as on the Methodology page', async () => {
    const score = (n, values) =>
      staff(data.users.mentor, 'evaluation', {
        cycle_number: n,
        execution_score: values[0],
        customer_score: values[1],
        business_score: values[2],
        behavior_score: values[3],
      })
    let res = await score(3, [20, 20, 20, 20])
    assert.equal(res.status, 200)
    assert.equal(res.body.evaluation.total_score, 20)
    assert.equal(res.body.evaluation.status, 'red')

    res = await score(4, [80, 60, 50, 100])
    assert.equal(res.body.evaluation.total_score, 72)
    assert.equal(res.body.evaluation.status, 'green')
  })
})

describe('admin submission windows', () => {
  const open = (
    cycle,
    until = new Date(Date.now() + DAY_MS).toISOString(),
    user = data.users.admin
  ) => staff(user, 'reopen', { cycle_number: cycle, reopened_until: until })

  it('opens a future cycle for one startup, including faculty review', async () => {
    assert.equal((await report(6)).status, 400)
    const opened = await open(6)
    assert.equal(opened.status, 200)
    assert.ok(opened.body.submission.reopened_until)
    assert.equal((await report(6)).status, 200)
    const unrelated = await as(data.users.outsider).post(
      '/api/biweekly/submission',
      {
        cycle_number: 6,
        progress_summary: 'Another startup',
      }
    )
    assert.equal(unrelated.status, 400)
    assert.equal((await report(6, { isSubmit: true })).status, 200)
    assert.equal((await report(6)).status, 403)
    const review = await staff(data.users.mentor, 'observation', {
      cycle_number: 6,
      observation: 'Early work reviewed',
    })
    assert.equal(review.status, 200)
  })

  it('closes an expired window and allows the admin to extend it', async () => {
    await open(1)
    assert.equal((await report(1)).status, 200)
    await BiWeeklySubmission.updateOne(
      { venture: data.ventures.alpha._id, cycle_number: 1 },
      { reopened_until: new Date(Date.now() - 1000) }
    )
    assert.equal((await report(1)).status, 403)
    assert.equal((await report(1, { isSubmit: true })).status, 403)
    assert.equal((await open(1)).status, 200)
    assert.equal((await report(1, { isSubmit: true })).status, 200)
  })

  it('validates the expiry and prevents mentors and students from opening windows', async () => {
    for (const until of [
      null,
      '',
      'bad',
      '2099-12-01T10:00',
      new Date(Date.now() - 1000).toISOString(),
    ]) {
      assert.equal((await open(6, until)).status, 400)
    }
    for (const user of [data.users.mentor, data.users.owner]) {
      assert.equal((await open(6, undefined, user)).status, 403)
    }
    assert.equal(
      (
        await report(6, {
          reopened_until: '2099-12-01T10:00:00Z',
          reopened_at: new Date(),
        })
      ).status,
      400
    )
    assert.equal(
      await BiWeeklySubmission.countDocuments({ cycle_number: 6 }),
      0
    )
  })

  it('preserves an existing submitted report when it is reopened', async () => {
    await report(4, { isSubmit: true, wins: 'First customer' })
    const reopened = await open(4)
    assert.equal(reopened.status, 200)
    assert.equal(reopened.body.submission.submitted_at, null)
    assert.equal(reopened.body.submission.wins, 'First customer')
    assert.equal((await report(4, { isSubmit: true })).status, 200)
  })
})

it('rejects a stale save after the admin changes the submission window', async () => {
  const window = {
    cycle_number: 1,
    reopened_until: new Date(Date.now() + DAY_MS).toISOString(),
  }
  await staff(data.users.admin, 'reopen', window)
  const expected = await BiWeeklySubmission.findOne({
    venture: data.ventures.alpha._id,
    cycle_number: 1,
  })
  await staff(data.users.admin, 'reopen', window)
  const saved = await updateOrCreateVentureSubmission({
    ventureId: data.ventures.alpha._id,
    userId: data.users.owner._id,
    cycle_number: 1,
    data: { progress_summary: 'Stale report' },
    expected,
    closesAt: new Date(window.reopened_until),
  })
  assert.equal(saved, null)
  assert.equal(
    (await BiWeeklySubmission.findById(expected._id)).progress_summary,
    ''
  )
})

describe('opening a cycle for selected startups', () => {
  const openMany = (ids, user = data.users.admin, fields = {}) =>
    as(user).post('/api/biweekly/windows', {
      cycle_number: 6,
      reopened_until: new Date(Date.now() + DAY_MS).toISOString(),
      ventureIds: ids,
      ...fields,
    })

  it('opens all selected startups and keeps other cycles closed', async () => {
    const ids = [
      String(data.ventures.alpha._id),
      String(data.ventures.beta._id),
    ]
    const result = await openMany(ids)
    assert.equal(result.status, 200)
    assert.deepEqual(result.body.openedVentureIds.sort(), ids.sort())
    assert.deepEqual(result.body.failedVentureIds, [])
    assert.equal((await report(6)).status, 200)
    const beta = await as(data.users.outsider).post(
      '/api/biweekly/submission',
      {
        cycle_number: 6,
        progress_summary: 'Beta early work',
      }
    )
    assert.equal(beta.status, 200)
    assert.equal((await report(7)).status, 400)
  })

  it('supports one startup and ignores repeated IDs', async () => {
    const id = String(data.ventures.alpha._id)
    const result = await openMany([id, id])
    assert.equal(result.status, 200)
    assert.deepEqual(result.body.openedVentureIds, [id])
    assert.equal(
      await BiWeeklySubmission.countDocuments({ cycle_number: 6 }),
      1
    )
    const beta = await as(data.users.outsider).post(
      '/api/biweekly/submission',
      {
        cycle_number: 6,
        progress_summary: 'Beta early work',
      }
    )
    assert.equal(beta.status, 400)
  })

  it('validates every startup and the window before writing anything', async () => {
    const id = String(data.ventures.alpha._id)
    assert.equal((await openMany([])).status, 400)
    assert.equal((await openMany([id, 'invalid'])).status, 400)
    assert.equal((await openMany([id, '000000000000000000000001'])).status, 404)
    assert.equal(
      (await openMany([id], undefined, { reopened_until: 'bad' })).status,
      400
    )
    assert.equal(
      (await openMany([id], undefined, { cycle_number: 14 })).status,
      400
    )
    for (const user of [data.users.owner, data.users.mentor]) {
      assert.equal((await openMany([id], user)).status, 403)
    }
    assert.equal(
      await BiWeeklySubmission.countDocuments({ cycle_number: 6 }),
      0
    )
  })

  it('reports partial failures so the client can retry only the remaining startups', async t => {
    const alpha = String(data.ventures.alpha._id)
    const beta = String(data.ventures.beta._id)
    const original = BiWeeklySubmission.findOneAndUpdate
    t.mock.method(
      BiWeeklySubmission,
      'findOneAndUpdate',
      function (query, ...args) {
        if (query.custom_id.includes(beta)) {
          throw new Error('Temporary write failure')
        }
        return original.call(this, query, ...args)
      }
    )
    const result = await openMany([alpha, beta])
    assert.equal(result.status, 207)
    assert.deepEqual(result.body.openedVentureIds, [alpha])
    assert.deepEqual(result.body.failedVentureIds, [beta])
    t.mock.restoreAll()
    const retry = await openMany(result.body.failedVentureIds)
    assert.equal(retry.status, 200)
    assert.deepEqual(retry.body.openedVentureIds, [beta])
  })

  it('handles concurrent openings without duplicating or clearing report content', async () => {
    await report(4, { wins: 'Existing work', isSubmit: true })
    const ids = [String(data.ventures.alpha._id)]
    const results = await Promise.all([
      openMany(ids, undefined, { cycle_number: 4 }),
      openMany(ids, undefined, { cycle_number: 4 }),
    ])
    assert.ok(results.every(result => result.status === 200))
    const rows = await BiWeeklySubmission.find({
      venture: ids[0],
      cycle_number: 4,
    })
    assert.equal(rows.length, 1)
    assert.equal(rows[0].wins, 'Existing work')
    assert.equal(rows[0].submitted_at, null)
  })
})

import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app from '../app.js'
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
    const reopened = await staff(board, 'reopen', { cycle_number: 1 })
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

import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app from '../app.js'
import KPI from '../models/kpi.js'
import { cookieFor, seed, startDatabase, stopDatabase } from './helpers.js'

let data
const as = user => ({
  post: (url, body) =>
    request(app).post(url).set('Cookie', cookieFor(user)).send(body),
  put: (url, body) =>
    request(app).put(url).set('Cookie', cookieFor(user)).send(body),
})

before(startDatabase)
after(stopDatabase)
beforeEach(async () => {
  data = await seed()
})

const waiting = () =>
  KPI.create({
    title: 'Interviews',
    description: 'Talk to customers',
    venture: data.ventures.alpha._id,
    createdBy: data.users.owner._id,
    status: 'WAITING_FOR_APPROVAL',
  })

describe('two reviewers at once', () => {
  it('the second, on a page that is out of date, is told it changed', async () => {
    const kpi = await waiting()
    const first = await as(data.users.mentor).put(
      `/api/kpis/${kpi._id}/evaluate`,
      { status: 'ACCEPTED', expectedStatus: 'WAITING_FOR_APPROVAL' }
    )
    assert.equal(first.status, 200)

    const second = await as(data.users.board).put(
      `/api/kpis/${kpi._id}/evaluate`,
      {
        status: 'REJECTED',
        feedback: 'Too vague',
        expectedStatus: 'WAITING_FOR_APPROVAL',
      }
    )
    assert.equal(second.status, 409)
    assert.equal(
      second.body.message,
      'This KPI changed while you were reviewing it. Reload and try again.'
    )
    assert.equal((await KPI.findById(kpi._id)).status, 'ACCEPTED')
  })

  it('a refused change reads as English', async () => {
    const kpi = await waiting()
    await as(data.users.mentor).put(`/api/kpis/${kpi._id}/evaluate`, {
      status: 'ACCEPTED',
    })
    const res = await as(data.users.mentor).put(
      `/api/kpis/${kpi._id}/evaluate`,
      { status: 'REJECTED', feedback: 'No' }
    )
    assert.equal(res.status, 400)
    assert.equal(res.body.message, "An Accepted KPI can't be marked Rejected")
  })
})

describe('due dates', () => {
  it('a date that is not a date is refused, on create and on edit', async () => {
    const created = await as(data.users.owner).post('/api/kpis', {
      title: 'Bad date',
      description: 'x',
      venture: String(data.ventures.alpha._id),
      dueDate: 'not a date',
    })
    assert.equal(created.status, 400)
    assert.equal(created.body.message, 'Choose a valid due date')

    const edited = await as(data.users.owner).put(
      `/api/kpis/${data.kpis.alphaDraft._id}`,
      { dueDate: 'soon' }
    )
    assert.equal(edited.status, 400)
    assert.equal(edited.body.message, 'Choose a valid due date')
  })
})

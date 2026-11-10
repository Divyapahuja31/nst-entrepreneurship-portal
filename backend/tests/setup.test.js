import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app from '../app.js'
import Batch from '../models/batch.js'
import User from '../models/user.js'
import { determineUserRole } from '../utils/authHelper.js'
import { cookieFor, seed, startDatabase, stopDatabase } from './helpers.js'

let data
const as = user => ({
  get: url => request(app).get(url).set('Cookie', cookieFor(user)),
  post: (url, body) =>
    request(app).post(url).set('Cookie', cookieFor(user)).send(body),
  patch: (url, body) =>
    request(app).patch(url).set('Cookie', cookieFor(user)).send(body),
  delete: url => request(app).delete(url).set('Cookie', cookieFor(user)),
})

before(startDatabase)
after(stopDatabase)
beforeEach(async () => {
  data = await seed()
})

const SETUP = '/api/admin/setup'

const signUp = (email, extra = {}) =>
  request(app)
    .post('/api/auth/signup')
    .send({
      username: 'Asha Rao',
      email,
      password: 'password123',
      ...extra,
    })

describe('School Setup access', () => {
  it('is for admins only', async () => {
    for (const user of [
      data.users.board,
      data.users.mentor,
      data.users.owner,
    ]) {
      const res = await as(user).get(SETUP)
      assert.equal(res.status, 403, user.email)
    }
    const res = await as(data.users.admin).post(`${SETUP}/campuses`, {
      name: 'X',
      location: 'Y',
    })
    assert.equal(res.status, 201)
    const denied = await as(data.users.board).post(`${SETUP}/campuses`, {
      name: 'Z',
      location: 'Y',
    })
    assert.equal(denied.status, 403)
  })
})

describe('campuses and batches', () => {
  it('adds a campus, refusing the same name in another case', async () => {
    const admin = as(data.users.admin)
    const res = await admin.post(`${SETUP}/campuses`, {
      name: '  NST   Delhi ',
      location: 'Delhi',
    })
    assert.equal(res.status, 201)
    assert.ok(res.body.campuses.some(c => c.name === 'NST Delhi'))

    const again = await admin.post(`${SETUP}/campuses`, {
      name: 'nst delhi',
      location: 'Delhi',
    })
    assert.equal(again.status, 409)
    assert.ok(again.body.error.name)

    const blank = await admin.post(`${SETUP}/campuses`, {})
    assert.equal(blank.status, 400)
    assert.deepEqual(Object.keys(blank.body.error).sort(), ['location', 'name'])
  })

  it('adds a batch named after its years, which sign-up then offers', async () => {
    const admin = as(data.users.admin)
    const res = await admin.post(`${SETUP}/batches`, {
      startYear: 2026,
      endYear: '2030',
      campus: String(data.campus._id),
    })
    assert.equal(res.status, 201)
    const batch = res.body.batches.find(b => b.name === '2026-2030')
    assert.ok(batch)
    assert.equal(batch.campus.name, 'ADYPU')

    const options = await request(app).get('/api/auth/google/signup-options')
    assert.ok(options.body.batches.some(b => b.name === '2026-2030'))

    const duplicate = await admin.post(`${SETUP}/batches`, {
      startYear: 2026,
      endYear: 2030,
      campus: String(data.campus._id),
    })
    assert.equal(duplicate.status, 409)
  })

  it('refuses a batch with bad years or no campus', async () => {
    const res = await as(data.users.admin).post(`${SETUP}/batches`, {
      startYear: 2030,
      endYear: 2026,
      campus: 'nope',
    })
    assert.equal(res.status, 400)
    assert.deepEqual(Object.keys(res.body.error).sort(), ['campus', 'endYear'])

    const years = await as(data.users.admin).post(`${SETUP}/batches`, {
      startYear: 'soon',
      endYear: 1999,
      campus: String(data.campus._id),
    })
    assert.deepEqual(Object.keys(years.body.error).sort(), [
      'endYear',
      'startYear',
    ])
  })

  it('removes only batches and campuses nothing uses', async () => {
    const admin = as(data.users.admin)
    const batch = await Batch.create({
      name: '2025-2029',
      startYear: 2025,
      endYear: 2029,
      campus: data.campus._id,
    })
    // Campus with a batch: refused.
    let res = await admin.delete(`${SETUP}/campuses/${data.campus._id}`)
    assert.equal(res.status, 409)

    // Batch with a student: refused.
    await User.updateOne({ _id: data.users.owner._id }, { batch: batch._id })
    res = await admin.delete(`${SETUP}/batches/${batch._id}`)
    assert.equal(res.status, 409)

    await User.updateOne({ _id: data.users.owner._id }, { batch: null })
    res = await admin.delete(`${SETUP}/batches/${batch._id}`)
    assert.equal(res.status, 200)
    assert.equal(res.body.batches.length, 0)

    // Still has startups.
    res = await admin.delete(`${SETUP}/campuses/${data.campus._id}`)
    assert.equal(res.status, 409)

    const added = await admin.post(`${SETUP}/campuses`, {
      name: 'Spare',
      location: 'Nowhere',
    })
    const spare = added.body.campuses.find(c => c.name === 'Spare')
    res = await admin.delete(`${SETUP}/campuses/${spare._id}`)
    assert.equal(res.status, 200)
    assert.ok(!res.body.campuses.some(c => c.name === 'Spare'))

    res = await admin.delete(`${SETUP}/campuses/${spare._id}`)
    assert.equal(res.status, 404)
  })
})

describe('allowed email domains', () => {
  it('starts with the two school domains', async () => {
    const res = await as(data.users.admin).get(SETUP)
    assert.deepEqual(
      res.body.domains.map(({ domain, staff }) => ({ domain, staff })),
      [
        { domain: 'adypu.edu.in', staff: false },
        { domain: 'newtonschool.co', staff: true },
      ]
    )
    assert.equal(await determineUserRole('LEAD@NewtonSchool.co'), 'mentor')
    assert.equal(await determineUserRole('student@adypu.edu.in'), 'student')
    assert.equal(await determineUserRole(undefined), 'student')
  })

  it('lets a new domain sign up, as staff when it is marked so', async () => {
    const rejected = await signUp('asha@nst.edu')
    assert.equal(rejected.status, 400)
    assert.match(rejected.body.error.email, /@adypu\.edu\.in or @newtonschool/)

    const admin = as(data.users.admin)
    const res = await admin.post(`${SETUP}/domains`, {
      domain: '@NST.edu ',
      staff: true,
    })
    assert.equal(res.status, 201)
    assert.ok(res.body.domains.some(d => d.domain === 'nst.edu' && d.staff))
    assert.equal(await determineUserRole('a@nst.edu'), 'mentor')

    const accepted = await signUp('asha@nst.edu')
    assert.equal(accepted.status, 200)
    assert.equal(accepted.body.requireOtp, true)

    // A subdomain is its own entry.
    assert.equal((await signUp('asha@x.nst.edu')).status, 400)

    const duplicate = await admin.post(`${SETUP}/domains`, {
      domain: 'nst.edu',
    })
    assert.equal(duplicate.status, 409)
    const invalid = await admin.post(`${SETUP}/domains`, { domain: 'nst' })
    assert.equal(invalid.status, 400)
  })

  it('changes whether a domain starts people as staff', async () => {
    const admin = as(data.users.admin)
    const page = await admin.get(SETUP)
    const adypu = page.body.domains.find(d => d.domain === 'adypu.edu.in')
    const res = await admin.patch(`${SETUP}/domains/${adypu._id}`, {
      staff: true,
    })
    assert.equal(res.status, 200)
    assert.equal(await determineUserRole('x@adypu.edu.in'), 'mentor')
  })

  it("removes a domain, but never the admin's own or the last one", async () => {
    const admin = as(data.users.admin)
    const page = await admin.get(SETUP)
    const byName = name => page.body.domains.find(d => d.domain === name)

    const own = await admin.delete(
      `${SETUP}/domains/${byName('newtonschool.co')._id}`
    )
    assert.equal(own.status, 409)

    const res = await admin.delete(
      `${SETUP}/domains/${byName('adypu.edu.in')._id}`
    )
    assert.equal(res.status, 200)
    assert.deepEqual(
      res.body.domains.map(d => d.domain),
      ['newtonschool.co']
    )
    assert.equal((await signUp('asha@adypu.edu.in')).status, 400)

    // An admin from another domain still can't empty the list.
    await User.updateOne(
      { _id: data.users.admin2._id },
      { email: 'ben@elsewhere.org' }
    )
    const last = await as(data.users.admin2).delete(
      `${SETUP}/domains/${byName('newtonschool.co')._id}`
    )
    assert.equal(last.status, 409)
  })

  it('applies to accounts an admin adds', async () => {
    const res = await as(data.users.admin).post('/api/admin/accounts', {
      username: 'Gina Mentor',
      email: 'gina@gmail.com',
      role: 'mentor',
    })
    assert.equal(res.status, 400)
    assert.ok(res.body.error.email)
  })
})

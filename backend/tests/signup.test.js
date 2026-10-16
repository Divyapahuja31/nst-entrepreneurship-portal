// cspell:ignore Asha asha José Ávila Saldaña
import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app from '../app.js'
import Batch from '../models/batch.js'
import User from '../models/user.js'
import { signGoogleSignupToken } from '../utils/token.js'
import { seed, sentEmails, startDatabase, stopDatabase } from './helpers.js'

let data
let batch

before(startDatabase)
after(stopDatabase)
beforeEach(async () => {
  data = await seed()
  batch = await Batch.create({
    name: '2025-29',
    startYear: 2025,
    endYear: 2029,
    campus: data.campus._id,
  })
})

let n = 0
const signUp = (fields = {}) => {
  n += 1
  return request(app)
    .post('/api/auth/signup')
    .send({
      username: 'Asha Rao',
      email: `asha${n}@adypu.edu.in`,
      password: 'password123',
      campus: String(data.campus._id),
      batch: String(batch._id),
      ...fields,
    })
}

// The code email goes out after sign-up answers, so wait for it.
const codeFor = async email => {
  for (let i = 0; i < 50; i += 1) {
    const code = sentEmails
      .filter(e => e.to === email)
      .at(-1)
      ?.text.match(/\b(\d{6})\b/)?.[1]
    if (code) {
      return code
    }
    await new Promise(resolve => {
      setTimeout(resolve, 20)
    })
  }
  return null
}

describe('names at sign-up', () => {
  it('takes apostrophes as phones type them, accents and stray spaces', async () => {
    for (const name of [
      "Mary-Jane O'Neil",
      'Mary-Jane O’Neil',
      'José Ávila',
      'Zoë  Saldaña ',
    ]) {
      const res = await signUp({ username: name })
      assert.equal(res.status, 200, `${name}: ${JSON.stringify(res.body)}`)
    }
    const stored = await User.find({ email: /^asha/ }).sort({ createdAt: 1 })
    assert.deepEqual(
      stored.map(u => u.username),
      ["Mary-Jane O'Neil", "Mary-Jane O'Neil", 'José Ávila', 'Zoë Saldaña']
    )
  })

  it('refuses one letter, digits and symbols', async () => {
    for (const [name, message] of [
      ['A', /at least 2/],
      ['John123', /invalid/],
      ['J@hn', /invalid/],
      ["O'", /invalid/],
    ]) {
      const res = await signUp({ username: name })
      assert.equal(res.status, 400, name)
      assert.match(res.body.error.username, message, name)
    }
  })
})

describe('campus and batch at sign-up', () => {
  it('a student must choose both', async () => {
    const res = await signUp({ campus: '', batch: '' })
    assert.equal(res.status, 400)
    assert.equal(res.body.error.campus, 'Campus is required')
    assert.equal(res.body.error.batch, 'Batch is required')
  })

  it('staff choose neither', async () => {
    const res = await signUp({
      email: 'newstaff@newtonschool.co',
      campus: '',
      batch: '',
    })
    assert.equal(res.status, 200)
  })

  it("staff don't keep a campus or batch sent anyway", async () => {
    const res = await signUp({ email: 'sent@newtonschool.co' })
    assert.equal(res.status, 200)
    const staff = await User.findOne({ email: 'sent@newtonschool.co' }).lean()
    assert.equal(staff.batch, null)
    assert.equal(staff.campus, undefined)
  })

  it('the forms learn which domains are staff', async () => {
    const res = await request(app).get('/api/auth/google/signup-options')
    assert.deepEqual(res.body.staffDomains, ['newtonschool.co'])
  })
})

describe('campus and batch after Google sign-in', () => {
  const complete = (email, fields = {}) =>
    request(app)
      .post('/api/auth/google/complete-signup')
      .send({
        token: signGoogleSignupToken({ googleId: `g-${email}`, email }),
        username: 'Asha Rao',
        ...fields,
      })

  it('staff are not asked for them', async () => {
    const res = await complete('mentor.new@newtonschool.co', {
      campus: String(data.campus._id),
      batch: String(batch._id),
    })
    assert.equal(res.status, 201)
    const staff = await User.findOne({ email: 'mentor.new@newtonschool.co' })
      .populate('role')
      .lean()
    assert.equal(staff.role.name, 'mentor')
    assert.equal(staff.batch, null)
    assert.equal(staff.campus, undefined)

    const bare = await complete('bare@newtonschool.co')
    assert.equal(bare.status, 201)
  })

  it('a student still needs both', async () => {
    const res = await complete('student.new@adypu.edu.in')
    assert.equal(res.status, 400)
    const ok = await complete('student.new@adypu.edu.in', {
      campus: String(data.campus._id),
      batch: String(batch._id),
    })
    assert.equal(ok.status, 201)
    const student = await User.findOne({ email: 'student.new@adypu.edu.in' })
    assert.equal(String(student.batch), String(batch._id))
  })
})

describe('the email code', () => {
  it('says the code is used up on the fifth wrong try, not the sixth', async () => {
    const email = 'codes@adypu.edu.in'
    await signUp({ email })
    const right = await codeFor(email)
    assert.ok(right)
    const wrong = right === '000000' ? '111111' : '000000'
    const replies = []
    for (let i = 0; i < 5; i += 1) {
      const res = await request(app)
        .post('/api/auth/verify-signup-otp')
        .send({ email, password: 'password123', otp: wrong })
      replies.push(res.body.error)
    }
    assert.match(replies[3], /^Invalid verification code/)
    assert.match(replies[4], /Too many failed verification attempts/)

    const late = await request(app)
      .post('/api/auth/verify-signup-otp')
      .send({ email, password: 'password123', otp: right })
    assert.equal(late.status, 400)
    assert.match(late.body.error, /Too many failed verification attempts/)
  })
})

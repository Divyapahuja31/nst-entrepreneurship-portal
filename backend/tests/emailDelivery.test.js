import { after, afterEach, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'

import EmailNotification from '../models/emailNotification.js'
import EmailSettings from '../models/emailSettings.js'
import {
  createResendProvider,
  getEmailProvider,
  setEmailProvider,
} from '../utils/emailProvider.js'
import {
  sendBoardLowScore,
  sendFounderSession,
  sendMentorFollowUp,
  sendMentorLowScore,
  sendResetPasswordOtpEmail,
  sendSessionCancelled,
  sendSignupOtpEmail,
  sendStaffSession,
  sendStudentResult,
} from '../utils/emailService.js'
import { seed, startDatabase, stopDatabase } from './helpers.js'

// Every email, through the real Resend provider and SDK, up to the HTTP
// request it makes. fetch is replaced, so nothing leaves the machine: the
// test reads the request Resend would get.

const TO = 'priya@adypu.edu.in'
const recipient = { email: TO, userId: null }
const result = {
  score: 30,
  totalMarks: 100,
  percentage: 30,
  evaluationName: 'Customer interviews',
  ventureName: 'GreenCart',
}
const staff = {
  studentName: 'GreenCart',
  studentEmail: TO,
  batch: '2025-2029',
  mentorName: 'Rahul Mehta',
  dashboardUrl: 'https://portal.example/admin/venture/1',
}
const slot = {
  recipientName: 'Priya',
  group: false,
  ventureName: 'GreenCart',
  day: 'Thu 16 Oct',
  time: '6:15 PM – 6:30 PM',
  staffNames: 'Rahul Mehta',
  meetUrl: 'https://meet.google.com/abc-defg-hij',
}

// [type, send, props]
const EVERY_EMAIL = [
  [
    'KPI_SCORED_STUDENT',
    sendStudentResult,
    { ...result, studentName: 'Priya', dashboardUrl: 'https://p.example' },
  ],
  ['CONSECUTIVE_MID_SCORE_MENTOR', sendMentorFollowUp, { ...result, ...staff }],
  ['CONSECUTIVE_LOW_SCORE_MENTOR', sendMentorLowScore, { ...result, ...staff }],
  ['CONSECUTIVE_LOW_SCORE_BOARD', sendBoardLowScore, { ...result, ...staff }],
  ['SESSION_FOUNDER', sendFounderSession, slot],
  [
    'SESSION_STAFF',
    sendStaffSession,
    {
      ...slot,
      meetUrl: null,
      meetings: [{ time: slot.time, ventureName: 'GreenCart' }],
    },
  ],
  ['SESSION_CANCELLED', sendSessionCancelled, slot],
]
const CODE = { to: TO, userId: null, username: 'Priya', expiresInMinutes: 5 }

let requests
let reply
let saved
let previousProvider

before(startDatabase)
after(stopDatabase)
beforeEach(async () => {
  await seed()
  await EmailSettings.deleteMany({})
  await EmailNotification.syncIndexes()
  requests = []
  reply = () =>
    new Response(JSON.stringify({ id: `re_${requests.length}` }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  saved = {
    fetch: globalThis.fetch,
    key: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM,
  }
  globalThis.fetch = async (url, options) => {
    requests.push({
      url: String(url),
      method: options.method,
      authorization: new Headers(options.headers).get('Authorization'),
      body: JSON.parse(options.body),
    })
    return reply()
  }
  process.env.RESEND_API_KEY = 're_test_key'
  process.env.EMAIL_FROM = 'NST Portal <noreply@nst.dev>'
  previousProvider = getEmailProvider()
  setEmailProvider(createResendProvider())
})
afterEach(() => {
  globalThis.fetch = saved.fetch
  process.env.RESEND_API_KEY = saved.key ?? ''
  process.env.EMAIL_FROM = saved.from ?? ''
  setEmailProvider(previousProvider)
})

const sendEvery = async () => {
  for (const [, send, props] of EVERY_EMAIL) {
    await send({ recipient, dedupeKey: null, ...props })
  }
  await sendSignupOtpEmail({ ...CODE, otp: '111111' })
  await sendResetPasswordOtpEmail({ ...CODE, otp: '222222' })
}

describe('sending through Resend', () => {
  it('posts every email to Resend with the server sender and no reply-to', async () => {
    await sendEvery()
    assert.equal(requests.length, 9)
    for (const { url, method, authorization, body } of requests) {
      assert.equal(url, 'https://api.resend.com/emails')
      assert.equal(method, 'POST')
      assert.equal(authorization, 'Bearer re_test_key')
      assert.equal(body.from, 'NST Portal <noreply@nst.dev>')
      assert.equal(body.to, TO)
      assert.equal(body.reply_to, undefined)
      assert.ok(body.subject.length > 0, body.subject)
      assert.match(body.html, /^<!doctype html>/)
      assert.match(body.text, /^NEWTON SCHOOL OF TECHNOLOGY/)
      // Every placeholder was filled in.
      assert.doesNotMatch(body.subject + body.text, /\{[a-z]+\}/, body.subject)
    }
    // The codes are in the email, never in the logged subject.
    const [signup, reset] = requests.slice(-2)
    assert.match(signup.body.text, /Your code: 111111/)
    assert.match(reset.body.text, /Your code: 222222/)
    assert.doesNotMatch(signup.body.subject + reset.body.subject, /\d{6}/)

    const logged = await EmailNotification.find().lean()
    assert.equal(logged.length, 9)
    assert.ok(logged.every(row => row.status === 'SENT'))
    assert.ok(logged.every(row => row.providerMessageId?.startsWith('re_')))
  })

  it('sends with the saved name, reply-to, wording and footer', async () => {
    await EmailSettings.create({
      key: 'default',
      sender: { fromName: 'Programme Office, NST', replyTo: 'team@nst.dev' },
      brand: { footer: 'Questions? Write to the programme office.' },
      rules: { strikes: 3 },
      templates: {
        'mentor-follow-up': { subject: 'Check in with {student} ({percent}%)' },
      },
    })
    await sendEvery()
    assert.equal(requests.length, 9)
    for (const { body } of requests) {
      // Quoted, or the comma makes the From header invalid.
      assert.equal(body.from, '"Programme Office, NST" <noreply@nst.dev>')
      assert.equal(body.reply_to, 'team@nst.dev')
      assert.match(body.text, /Questions\? Write to the programme office\.$/)
      assert.match(body.html, /Questions\? Write to the programme office\./)
    }
    const followUp = requests[1].body
    assert.equal(followUp.subject, 'Check in with GreenCart (30%)')
    assert.match(followUp.text, /on three locked evaluations in a row/)
  })

  it('makes no request for an email that is switched off', async () => {
    await EmailSettings.create({
      key: 'default',
      templates: { 'session-founder': { enabled: false } },
    })
    const sent = await sendFounderSession({ recipient, ...slot })
    assert.deepEqual(sent, { skipped: true, disabled: true })
    assert.equal(requests.length, 0)
    assert.equal(await EmailNotification.countDocuments(), 0)
  })

  it('records what Resend refuses as failed', async t => {
    reply = () =>
      new Response(
        JSON.stringify({
          name: 'validation_error',
          statusCode: 422,
          message: 'Invalid `from` field.',
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      )
    t.mock.method(console, 'error', () => {})
    t.mock.method(console, 'warn', () => {})
    await assert.rejects(
      sendStudentResult({ recipient, ...EVERY_EMAIL[0][2] }),
      /Invalid `from` field/
    )
    const row = await EmailNotification.findOne().lean()
    assert.equal(row.status, 'FAILED')
    assert.match(row.error, /Invalid `from` field/)
  })
})

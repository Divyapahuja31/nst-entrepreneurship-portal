import { after, before, beforeEach, describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'

import EmailNotification from '../models/emailNotification.js'
import { createResendProvider, normalizeFrom } from '../utils/emailProvider.js'
import { deliver } from '../utils/emailService.js'
import { escapeHtml } from '../utils/emailTemplates/layout.js'
import { studentResultEmail } from '../utils/emailTemplates/kpiEmails.js'
import {
  emailFailures,
  sentEmails,
  startDatabase,
  stopDatabase,
} from './helpers.js'

const email = { subject: 'Hello', html: '<p>Hello</p>', text: 'Hello' }
const send = (fields = {}) =>
  deliver({
    type: 'KPI_SCORED_STUDENT',
    to: 'olu@adypu.edu.in',
    dedupeKey: 'kpi:1',
    email,
    ...fields,
  })

describe('normalizeFrom', () => {
  it('accepts a name with or without angle brackets', () => {
    for (const value of [
      'NST Entrepreneurship <noreply@nst.dev>',
      'NST Entrepreneurship noreply@nst.dev',
      '  NST Entrepreneurship   <noreply@nst.dev>  ',
      '"NST Entrepreneurship" <noreply@nst.dev>',
    ]) {
      assert.equal(
        normalizeFrom(value),
        'NST Entrepreneurship <noreply@nst.dev>',
        value
      )
    }
  })

  it('accepts a bare address', () => {
    assert.equal(normalizeFrom('noreply@nst.dev'), 'noreply@nst.dev')
    assert.equal(normalizeFrom('<noreply@nst.dev>'), 'noreply@nst.dev')
  })

  it('rejects a value without an address', () => {
    assert.equal(normalizeFrom('NST Entrepreneurship'), null)
    assert.equal(normalizeFrom(''), null)
    assert.equal(normalizeFrom(undefined), null)
  })
})

describe('the Resend provider', () => {
  it('returns an error instead of throwing when it is not configured', async t => {
    const saved = {
      key: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM,
    }
    t.after(() => {
      process.env.RESEND_API_KEY = saved.key ?? ''
      process.env.EMAIL_FROM = saved.from ?? ''
    })
    t.mock.method(console, 'warn', () => {})

    process.env.RESEND_API_KEY = ''
    process.env.EMAIL_FROM = 'NST <noreply@nst.dev>'
    const result = await createResendProvider().sendEmail({
      to: 'a@b.dev',
      ...email,
    })
    assert.match(result.error, /RESEND_API_KEY/)
  })
})

describe('templates', () => {
  it('escape what users typed', () => {
    const { html } = studentResultEmail({
      studentName: '<a href="https://evil.example">Click</a>',
      score: 50,
      totalMarks: 100,
      percentage: 50,
      evaluationName: 'KPI',
      dashboardUrl: 'https://portal.example/kpis',
    })
    assert.ok(!html.includes('<a href="https://evil.example">'))
    assert.ok(html.includes(escapeHtml('<a href="https://evil.example">')))
  })
})

describe('deliver', () => {
  before(startDatabase)
  after(stopDatabase)
  beforeEach(async () => {
    sentEmails.length = 0
    emailFailures.clear()
    await mongoose.connection.dropDatabase()
    await EmailNotification.syncIndexes()
  })

  it('logs a sent email with its message id', async () => {
    const result = await send()
    assert.ok(result.messageId)

    const row = await EmailNotification.findOne().lean()
    assert.equal(row.status, 'SENT')
    assert.equal(row.recipientEmail, 'olu@adypu.edu.in')
    assert.equal(row.providerMessageId, result.messageId)
    assert.equal(row.provider, 'test')
    assert.ok(row.sentAt)
  })

  it('sends one email per recipient, type and key', async () => {
    await send()
    assert.deepEqual(await send({ to: 'OLU@adypu.edu.in' }), { skipped: true })
    assert.equal(sentEmails.length, 1)
    assert.equal(await EmailNotification.countDocuments(), 1)
  })

  it('sends again for another key, type or recipient', async () => {
    await send()
    await send({ dedupeKey: 'kpi:2' })
    await send({ type: 'CONSECUTIVE_LOW_SCORE_BOARD' })
    await send({ to: 'oz@adypu.edu.in' })
    assert.equal(sentEmails.length, 4)
  })

  it('never dedupes an email without a key', async () => {
    await send({ dedupeKey: null })
    await send({ dedupeKey: null })
    assert.equal(sentEmails.length, 2)
  })

  it('throws and logs a failed send, which can then be retried', async () => {
    emailFailures.add('olu@adypu.edu.in')
    await assert.rejects(send(), /unavailable/)
    const failed = await EmailNotification.findOne().lean()
    assert.equal(failed.status, 'FAILED')
    assert.match(failed.error, /unavailable/)

    emailFailures.clear()
    await send()
    assert.equal(sentEmails.length, 1)
    assert.equal(await EmailNotification.countDocuments({ status: 'SENT' }), 1)
  })

  it('still sends when the log is unavailable', async t => {
    t.mock.method(console, 'error', () => {})
    const down = () => Promise.reject(new Error('log down'))
    t.mock.method(EmailNotification, 'exists', down)
    t.mock.method(EmailNotification, 'create', down)

    assert.ok((await send()).messageId)
    assert.equal(sentEmails.length, 1)
  })

  it('lets the database refuse a second sent row for the same key', async () => {
    const row = {
      recipientEmail: 'olu@adypu.edu.in',
      type: 'KPI_SCORED_STUDENT',
      subject: 'Hello',
      status: 'SENT',
      dedupeKey: 'kpi:1',
    }
    await EmailNotification.create(row)
    await assert.rejects(EmailNotification.create(row), { code: 11000 })
    // Failed rows don't count, so a retry is never blocked.
    await EmailNotification.create({ ...row, status: 'FAILED' })
  })

  it('records a send that lost a race as sent, without the key', async () => {
    // Another job sends the same email between the check and the send.
    const original = EmailNotification.exists.bind(EmailNotification)
    mock.method(EmailNotification, 'exists', async filter => {
      const found = await original(filter)
      await EmailNotification.create({
        recipientEmail: 'olu@adypu.edu.in',
        type: 'KPI_SCORED_STUDENT',
        subject: 'Hello',
        status: 'SENT',
        dedupeKey: 'kpi:1',
      })
      return found
    })

    await send()
    mock.restoreAll()
    const rows = await EmailNotification.find().sort({ _id: 1 }).lean()
    assert.equal(rows.length, 2)
    assert.ok(rows.every(row => row.status === 'SENT'))
    assert.equal(rows[1].dedupeKey, null)
    assert.match(rows[1].error, /Duplicate/)
  })
})

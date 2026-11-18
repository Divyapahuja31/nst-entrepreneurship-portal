import { after, before, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { EventEmitter } from 'node:events'
import auditMiddleware from '../middleware/audit.js'
import app from '../app.js'
import AuditLog from '../models/auditLog.js'
import KPI from '../models/kpi.js'
import Founder from '../models/founder.js'
import ReportSchedule from '../models/reportSchedule.js'
import { withAuditContext } from '../utils/auditContext.js'
import { recordAudit, flushAudit } from '../utils/audit.js'
import { auditWriterStats } from '../utils/audit.js'
import User from '../models/user.js'
import { sanitizeAudit } from '../utils/auditSanitize.js'
import { createAuditWriter } from '../utils/auditWriter.js'
import { cookieFor, seed, startDatabase, stopDatabase } from './helpers.js'

before(startDatabase)
after(stopDatabase)

it('preserves deadline, ownership and deletion history with request context', async () => {
  const { users, ventures, kpis } = await seed()
  const endpoint = '/api/kpis/' + kpis.alphaDraft._id
  const change = await request(app)
    .put(endpoint)
    .set('Cookie', cookieFor(users.admin))
    .send({
      dueDate: '2027-02-12',
      founder: users.owner.id,
      description: 'Edited goal',
    })
    .expect(200)
  await flushAudit()
  const entry = await AuditLog.findOne({
    resourceType: 'KPI',
    resourceId: kpis.alphaDraft.id,
    eventType: 'change',
  }).lean()
  assert.equal(entry.requestId, change.headers['x-request-id'])
  assert.equal(entry.actor.id, users.admin.id)
  assert.equal(entry.ventureId, ventures.alpha.id)
  assert.equal(entry.before.founder, null)
  assert.equal(entry.after.founder, users.owner.id)
  assert.equal(entry.after.dueDate, '2027-02-12T18:29:59.999Z')
  assert.equal(entry.after.detailEvidence.length, 11)
  await request(app)
    .delete(endpoint)
    .set('Cookie', cookieFor(users.admin))
    .expect(200)
  await flushAudit()
  const removed = await AuditLog.findOne({
    resourceId: kpis.alphaDraft.id,
    eventType: 'change',
    action: 'KPI_DELETED',
  })
  assert.equal(removed.before.title, kpis.alphaDraft.title)
  assert.equal(
    await AuditLog.countDocuments({
      resourceId: kpis.alphaDraft.id,
      action: 'KPI_DELETED',
    }),
    1
  )
  assert.equal(await KPI.exists({ _id: kpis.alphaDraft._id }), null)
})

it('records drafts, submission and explicit reopen windows without private content', async () => {
  const { users, ventures } = await seed()
  await ReportSchedule.create({
    key: 'reports',
    startDate: '2026-01-01',
    timeZone: 'Asia/Kolkata',
  })
  const open = () =>
    request(app)
      .post('/api/biweekly/reopen')
      .set('Cookie', cookieFor(users.admin))
      .send({
        ventureId: ventures.alpha.id,
        cycle_number: 1,
        reopened_until: '2030-01-01T00:00:00Z',
      })
      .expect(200)
  await open()
  const save = isSubmit =>
    request(app)
      .post('/api/biweekly/submission')
      .set('Cookie', cookieFor(users.owner))
      .send({
        cycle_number: 1,
        progress_summary: 'Private student work',
        isSubmit,
      })
      .expect(200)
  await save(false)
  await save(true)
  await open()
  await flushAudit()
  const entries = await AuditLog.find({ resourceType: 'BiWeeklySubmission' })
    .sort({ createdAt: 1, _id: 1 })
    .lean()
  assert.ok(entries.some(e => e.after?.submitted_at))
  assert.ok(
    entries.some(e => e.before?.submitted_at && e.after?.submitted_at === null)
  )
  assert.ok(
    entries.some(e => e.after?.reopened_until === '2030-01-01T00:00:00.000Z')
  )
  assert.ok(entries.some(e => e.after?.summaryEvidence?.length === 20))
  assert.ok(!JSON.stringify(entries).includes('Private student work'))
  assert.ok(
    entries.every(e => e.ventureId === ventures.alpha.id && e.cycle === 1)
  )
})

it('records login outcomes and permission failures without credentials or ordinary reads', async () => {
  const { users } = await seed()
  await request(app)
    .post('/api/auth/signin')
    .send({ email: users.owner.email, password: 'incorrect-secret' })
    .expect(401)
  await request(app)
    .post('/api/auth/signin')
    .send({ email: users.owner.email, password: 'password123' })
    .expect(200)
  await request(app)
    .get('/api/admin/audit-log')
    .set('Cookie', cookieFor(users.owner))
    .expect(403)
  await request(app)
    .get('/api/kpis')
    .set('Cookie', cookieFor(users.owner))
    .expect(200)
  await flushAudit()
  const entries = await AuditLog.find({ eventType: 'request' }).lean()
  assert.deepEqual(entries.map(e => e.outcome).sort(), [
    'denied',
    'denied',
    'success',
  ])
  assert.ok(
    entries.find(e => e.outcome === 'success').actor.id === users.owner.id
  )
  assert.ok(entries.find(e => e.outcome === 'denied').metadata.emailFingerprint)
  const text = JSON.stringify(entries)
  assert.ok(!text.includes('incorrect-secret') && !text.includes('password123'))
  assert.ok(!text.includes(users.owner.email))
  const filtered = await request(app)
    .get('/api/admin/audit-log')
    .set('Cookie', cookieFor(users.admin))
    .query({ identityEmail: users.owner.email })
    .expect(200)
  assert.equal(filtered.body.entries.length, 2)
})

it('tracks system deadline and membership changes with bounded history', async () => {
  const { users, ventures, kpis } = await seed()
  await withAuditContext(
    { source: 'job', job: 'Deadline processing' },
    async () => {
      await KPI.updateMany(
        { _id: kpis.alphaDraft._id },
        { $set: { status: 'GRADED', score: 0 } }
      )
      await Founder.updateOne(
        { user: users.owner._id },
        { $set: { status: 'INACTIVE' } }
      )
    }
  )
  await flushAudit()
  const changed = await AuditLog.find({ eventType: 'change' }).lean()
  assert.equal(changed.length, 2)
  assert.ok(changed.every(e => e.source === 'job' && e.actor === null))
  assert.equal(
    changed.find(e => e.resourceType === 'Founder').ventureId,
    ventures.alpha.id
  )
})

it('captures schedule edits and deadline normalization without auditing maintenance leases', async () => {
  const { kpis } = await seed()
  const { migrateKpiDueDates } = await import('../utils/kpiDueDateMigration.js')
  await KPI.collection.updateOne(
    { _id: kpis.alphaDraft._id },
    {
      $set: { dueDate: new Date('2026-12-12T00:00:00Z') },
    }
  )
  await withAuditContext(
    { source: 'job', job: 'Deadline normalization' },
    async () => {
      await migrateKpiDueDates({ confirmedDateOnly: true })
      await ReportSchedule.create({ key: 'reports', startDate: '2026-01-01' })
      await ReportSchedule.findOneAndUpdate(
        { key: 'reports' },
        {
          $set: { startDate: '2026-02-01' },
        },
        { returnDocument: 'after' }
      )
      await KPI.updateOne(
        { _id: kpis.alphaDraft._id },
        {
          $set: { deadlineReminderLeaseUntil: new Date() },
        }
      )
    }
  )
  await flushAudit()
  const normalized = await AuditLog.findOne({
    resourceId: kpis.alphaDraft.id,
    action: 'KPI_DEADLINE_CHANGED',
  })
  assert.equal(normalized.before.dueDate, '2026-12-12T00:00:00.000Z')
  assert.equal(normalized.after.dueDate, '2026-12-12T18:29:59.999Z')
  const schedule = await AuditLog.findOne({
    resourceType: 'ReportSchedule',
    action: 'REPORTSCHEDULE_CHANGED',
  })
  assert.equal(schedule.before.startDate, '2026-01-01')
  assert.equal(schedule.after.startDate, '2026-02-01')
  assert.equal(await AuditLog.countDocuments({ resourceType: 'KPI' }), 1)
})

it('redacts nested credentials and caps metadata traversal and bytes', () => {
  const nested = {
    password: 'hidden',
    api_key: 'hidden',
    child: { refreshToken: 'hidden' },
  }
  nested.circular = nested
  const result = sanitizeAudit(nested)
  assert.ok(!JSON.stringify(result).includes('hidden'))
  const huge = Object.fromEntries(
    Array.from({ length: 1000 }, (_, i) => ['field' + i, 'x'.repeat(2000)])
  )
  assert.ok(Buffer.byteLength(JSON.stringify(sanitizeAudit(huge))) <= 12000)
  assert.equal(
    sanitizeAudit({ message: 'Bearer hidden-value' }).message,
    '[redacted]'
  )
})

it('a failed snapshot read preserves the mutation and marks incomplete history', async t => {
  const { kpis } = await seed()
  t.mock.method(KPI, 'find', () => {
    throw new Error('Snapshot unavailable')
  })
  const result = await withAuditContext({ source: 'job' }, () =>
    KPI.updateOne({ _id: kpis.alphaDraft._id }, { $set: { status: 'GRADED' } })
  )
  assert.equal(result.modifiedCount, 1)
  await flushAudit()
  const event = await AuditLog.findOne({ action: 'KPI_BATCH_CHANGED' })
  assert.equal(event.metadata.incomplete, true)
  assert.equal((await KPI.findById(kpis.alphaDraft._id)).status, 'GRADED')
})

it('large bulk changes mark the snapshot limit and aborted responses retain context', async () => {
  const { users, ventures } = await seed()
  const rows = await KPI.insertMany(
    Array.from({ length: 105 }, (_, i) => ({
      title: 'Goal ' + i,
      description: 'Goal detail',
      venture: ventures.alpha._id,
      createdBy: users.owner._id,
    }))
  )
  await withAuditContext({ source: 'job' }, () =>
    KPI.updateMany(
      { _id: { $in: rows.map(row => row._id) } },
      { $set: { status: 'GRADED' } }
    )
  )
  const response = new EventEmitter()
  response.get = () => 'a4899e00-adbb-48cc-93c6-b12a0eefbb47'
  response.statusCode = 200
  response.writableFinished = false
  auditMiddleware(
    {
      method: 'POST',
      originalUrl: '/api/biweekly/submission',
      body: { cycle_number: 1 },
      params: {},
    },
    response,
    () => {}
  )
  response.emit('close')
  await flushAudit()
  const summary = await AuditLog.findOne({ action: 'KPI_BATCH_CHANGED' })
  assert.equal(summary.metadata.affected, 105)
  assert.equal(
    await AuditLog.countDocuments({ action: 'KPI_STATUS_CHANGED' }),
    100
  )
  const aborted = await AuditLog.findOne({ 'metadata.aborted': true })
  assert.equal(aborted.requestId, response.get())
  assert.equal(aborted.outcome, 'failed')
})

it('a failed audit insert cannot roll back an account or fail its request', async t => {
  const { users } = await seed()
  const previous = auditWriterStats().dropped
  const messages = []
  t.mock.method(console, 'error', (...args) => messages.push(args))
  t.mock.method(AuditLog.collection, 'insertMany', async () => {
    throw new Error('private database credentials')
  })
  await request(app)
    .post('/api/admin/accounts')
    .set('Cookie', cookieFor(users.admin))
    .send({
      username: 'New Mentor',
      email: 'audit-test@newtonschool.co',
      role: 'mentor',
    })
    .expect(201)
  await flushAudit()
  assert.ok(await User.exists({ email: 'audit-test@newtonschool.co' }))
  assert.ok(auditWriterStats().dropped > previous)
  assert.ok(!JSON.stringify(messages).includes('private database credentials'))
})

it('bounds the writer queue, retries safely and isolates persistence failures', async () => {
  const batches = []
  let release
  const writer = createAuditWriter({
    capacity: 3,
    batchSize: 2,
    interval: 10000,
    report: () => {},
    write: async batch => {
      batches.push(batch)
      await new Promise(resolve => {
        release = resolve
      })
    },
  })
  writer.enqueue({ id: 1 })
  writer.enqueue({ id: 2 })
  const pending = writer.flush()
  writer.enqueue({ id: 3 })
  assert.equal(writer.enqueue({ id: 4 }), false)
  release()
  await new Promise(resolve => {
    setImmediate(resolve)
  })
  release()
  await pending
  assert.deepEqual(
    batches.flat().map(e => e.id),
    [1, 2, 3]
  )
  assert.equal(writer.stats().dropped, 1)
  const broken = createAuditWriter({
    write: async () => {
      throw new Error('private connection string')
    },
    report: counters => assert.equal(counters.dropped, 1),
  })
  assert.equal(broken.enqueue({ id: 1 }), true)
  await broken.flush()
  assert.equal(broken.stats().failed, 2)
})

it('admin history is filtered and paginated, preserves legacy records, and cannot be changed', async () => {
  const { users } = await seed()
  for (const actor of [users.owner, users.mentor, users.board]) {
    await request(app)
      .get('/api/admin/audit-log')
      .set('Cookie', cookieFor(actor))
      .expect(403)
  }
  await AuditLog.create({
    action: 'ROLE_CHANGED',
    actor: null,
    target: { id: users.owner._id, email: users.owner.email },
    previousRole: 'student',
    newRole: 'mentor',
  })
  withAuditContext({ source: 'job' }, () => {
    for (let i = 0; i < 3; i++) {
      recordAudit({
        action: 'TEST_CHANGE',
        resourceType: 'KPI',
        resourceId: String(i),
      })
    }
  })
  await flushAudit()
  const get = query =>
    request(app)
      .get('/api/admin/audit-log')
      .set('Cookie', cookieFor(users.admin))
      .query(query)
  const first = await get({ action: 'TEST_CHANGE', limit: 2 }).expect(200)
  assert.equal(first.body.entries.length, 2)
  const next = await get({
    action: 'TEST_CHANGE',
    limit: 2,
    cursor: first.body.nextCursor,
  }).expect(200)
  assert.equal(next.body.entries.length, 1)
  assert.notEqual(next.body.entries[0]._id, first.body.entries[0]._id)
  await get({ action: ['a', 'b'] }).expect(400)
  await get({ limit: 1000 }).expect(400)
  assert.equal((await get({ action: 'ROLE_CHANGED' })).body.entries.length, 1)
  await assert.rejects(AuditLog.deleteMany({}), /append-only/)
  await assert.rejects(
    AuditLog.updateOne({}, { action: 'altered' }),
    /append-only/
  )
  const existing = await AuditLog.findOne()
  await assert.rejects(existing.deleteOne(), /append-only/)
})

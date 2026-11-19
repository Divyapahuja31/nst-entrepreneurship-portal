import { after, before, beforeEach, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../app.js'
import Founder from '../models/founder.js'
import KPI from '../models/kpi.js'
import { processKpiDeadlines } from '../utils/kpiDeadlines.js'
import { kpiDueDate } from '../utils/kpiHelper.js'
import {
  cookieFor,
  emailFailures,
  seed,
  sentEmails,
  startDatabase,
  stopDatabase,
} from './helpers.js'

before(startDatabase)
after(stopDatabase)
let data
beforeEach(async () => {
  data = await seed()
  await KPI.deleteMany({})
})
const create = (fields = {}) =>
  KPI.create({
    title: 'Customer interviews',
    description: 'Interview five customers',
    venture: data.ventures.alpha._id,
    founder: data.users.owner._id,
    createdBy: data.users.owner._id,
    status: 'ACCEPTED',
    dueDate: kpiDueDate('2026-12-01'),
    ...fields,
  })

it('preserves explicit timestamps and normalizes date-only deadlines', () => {
  assert.equal(
    kpiDueDate('2026-12-01T12:00:00Z').toISOString(),
    '2026-12-01T12:00:00.000Z'
  )
  assert.equal(
    kpiDueDate('2026-12-01T20:00:00Z').toISOString(),
    '2026-12-01T20:00:00.000Z'
  )
  assert.equal(kpiDueDate(null), null)
})

it('reminds once across concurrent runs and retries failed emails', async () => {
  await create()
  emailFailures.add(data.users.owner.email)
  const now = new Date('2026-12-01T10:00:00Z')
  await processKpiDeadlines(now)
  assert.equal(sentEmails.length, 0)
  emailFailures.clear()
  await Promise.all([processKpiDeadlines(now), processKpiDeadlines(now)])
  await processKpiDeadlines(now)
  assert.equal(sentEmails.length, 1)
  assert.equal(sentEmails[0].to, data.users.owner.email)
  assert.match(sentEmails[0].text, /zero/)
  assert.match(sentEmails[0].text, /India time/)
})

it('enforces the exact EOD boundary and preserves submitted work and human grades', async () => {
  const missed = await create({
    submissionDate: new Date('2026-11-01'),
    status: 'WAITING_FOR_APPROVAL',
  })
  const protectedKpis = await Promise.all([
    create({ evidence: { supportingText: 'Interview findings' } }),
    create({ evidence: { fileUrl: 'https://example.test/evidence.pdf' } }),
    create({ actualValue: '5 interviews' }),
    create({ status: 'GRADED', score: 73 }),
    create({ isLocked: true }),
    create({ dueDate: null }),
  ])
  const boundary = new Date('2026-12-01T18:29:59.999Z')
  assert.equal((await processKpiDeadlines(boundary)).graded, 0)
  const stale = await KPI.findById(missed._id)
  const results = await Promise.all([
    processKpiDeadlines(new Date(boundary.getTime() + 1)),
    processKpiDeadlines(new Date(boundary.getTime() + 1)),
  ])
  assert.equal(
    results.reduce((sum, result) => sum + result.graded, 0),
    1
  )
  const saved = await KPI.findById(missed._id)
  assert.equal(saved.status, 'GRADED')
  assert.equal(saved.score, 0)
  assert.match(saved.feedback, /Automatically graded zero/)
  for (const kpi of protectedKpis) {
    const current = await KPI.findById(kpi._id)
    assert.equal(current.status, kpi.status)
    assert.equal(current.score, kpi.score)
  }
  stale.status = 'WAITING_FOR_APPROVAL'
  stale.evidence = { supportingText: 'Stale submission' }
  await assert.rejects(stale.save(), { name: 'VersionError' })
})

it('recognizes progress submitted through the API before the deadline', async () => {
  const kpi = await create({ dueDate: kpiDueDate('2099-12-01') })
  const response = await request(app)
    .put(`/api/kpis/${kpi._id}/evidence`)
    .set('Cookie', cookieFor(data.users.owner))
    .send({ actualValue: '5', supportingText: 'Customer interview findings' })
  assert.equal(response.status, 200)
  await processKpiDeadlines(new Date('2099-12-02'))
  assert.equal((await KPI.findById(kpi._id)).status, 'ACCEPTED')
})

it('reminds active team members and sends a new reminder after a deadline extension', async () => {
  await Founder.create({
    user: data.users.applicant._id,
    venture: data.ventures.alpha._id,
  })
  const kpi = await create({ founder: null })
  await processKpiDeadlines(new Date('2026-12-01T10:00:00Z'))
  assert.deepEqual(
    sentEmails.map(email => email.to).sort(),
    [data.users.owner.email, data.users.applicant.email].sort()
  )
  await KPI.updateOne({ _id: kpi._id }, { dueDate: kpiDueDate('2026-12-03') })
  await processKpiDeadlines(new Date('2026-12-02T10:00:00Z'))
  assert.equal(sentEmails.length, 2)
  await processKpiDeadlines(new Date('2026-12-03T10:00:00Z'))
  assert.equal(sentEmails.length, 4)
})

it('does not treat an empty evidence submission as completion', async () => {
  const kpi = await create({
    evidence: { submittedAt: new Date('2026-12-01') },
  })
  await processKpiDeadlines(new Date('2026-12-02'))
  assert.equal((await KPI.findById(kpi._id)).status, 'GRADED')
})

it('returns a conflict when automatic grading wins a race with a submission', async t => {
  const kpi = await create({ dueDate: kpiDueDate('2099-12-01') })
  const save = KPI.prototype.save
  t.mock.method(KPI.prototype, 'save', async function (...args) {
    await processKpiDeadlines(new Date('2099-12-02'))
    return save.apply(this, args)
  })
  const response = await request(app)
    .put(`/api/kpis/${kpi._id}/evidence`)
    .set('Cookie', cookieFor(data.users.owner))
    .send({ supportingText: 'Submission in flight' })
  assert.equal(response.status, 409)
  assert.match(response.body.message, /Reload/)
  const saved = await KPI.findById(kpi._id)
  assert.equal(saved.status, 'GRADED')
  assert.equal(saved.evidence.supportingText, '')
})

it('rejects API evidence at an exact timestamp, with a dated error', async t => {
  const cutoff = Date.now() + 10000
  const kpi = await create({
    dueDate: new Date(cutoff),
    dueDateKind: 'timestamp',
  })
  let clock = cutoff - 1
  t.mock.method(Date, 'now', () => clock)
  const send = () =>
    request(app)
      .put('/api/kpis/' + kpi.id + '/evidence')
      .set('Cookie', cookieFor(data.users.owner))
      .send({ supportingText: 'Findings' })
  await send().expect(200)
  clock = cutoff
  const closed = await send().expect(403)
  assert.match(closed.body.message, /deadline was/)
  assert.match(closed.body.message, /IST/)
  clock = cutoff + 3600000
  await send().expect(403)
})

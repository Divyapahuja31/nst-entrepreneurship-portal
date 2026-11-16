import { after, before, it } from 'node:test'
import assert from 'node:assert/strict'
import BiWeeklySubmission from '../models/biWeeklySubmission.js'
import Observation from '../models/biWeeklyObservation.js'
import Evaluation from '../models/biWeeklyEvaluation.js'
import CheckIn from '../models/checkIn.js'
import Founder from '../models/founder.js'
import KPI from '../models/kpi.js'
import ReportSchedule from '../models/reportSchedule.js'
import { reportCardEvidence } from '../utils/reportCardEvidence.js'
import { seed, startDatabase, stopDatabase } from './helpers.js'

before(startDatabase)
after(stopDatabase)

it('dates evidence and membership eligibility from the configured report schedule', async () => {
  const { users, ventures } = await seed()
  await ventures.alpha.collection.updateOne(
    { _id: ventures.alpha._id },
    {
      $set: { createdAt: new Date('2026-01-01') },
    }
  )
  await Founder.updateOne(
    { user: users.owner._id },
    {
      joinedAt: new Date('2026-01-20'),
    }
  )
  await ReportSchedule.create({
    key: 'reports',
    startDate: '2026-01-19',
    timeZone: 'Asia/Kolkata',
  })
  await BiWeeklySubmission.create({
    custom_id: 'configured-schedule',
    cycle_number: 1,
    venture: ventures.alpha._id,
    submitted_at: new Date('2026-02-01'),
  })
  const evidence = await reportCardEvidence(users.owner._id)
  assert.equal(evidence.reports.length, 1)
  assert.equal(
    evidence.reports[0].periodStart.toISOString(),
    '2026-01-18T18:30:00.000Z'
  )
})

it('includes dated team reports and mentor feedback, excluding unrelated student work', async () => {
  const { users, ventures } = await seed()
  const joinedAt = new Date('2026-01-01')
  await Founder.updateOne({ user: users.owner._id }, { joinedAt })
  const observation = await Observation.create({
    cycle_number: 1,
    author_id: String(users.mentor._id),
    strengths: 'Good interviews',
    concerns: 'Needs paid validation',
  })
  const evaluation = await Evaluation.create({
    checklist_id: 1,
    month_number: 1,
    execution_score: 80,
  })
  const report = await BiWeeklySubmission.create({
    custom_id: 'evidence-alpha',
    cycle_number: 1,
    venture: ventures.alpha._id,
    submitted_by: users.owner._id,
    submitted_at: new Date('2026-02-01'),
    progress_summary: 'Tested a prototype',
    customer_interviews: 12,
    biWeeklyObservationSchema: observation._id,
    biWeeklyEvaluation: evaluation._id,
    evidence_links: [
      { title: 'Test notes', check: 'Interview records', self_confirmed: true },
    ],
  })
  await BiWeeklySubmission.create([
    {
      custom_id: 'draft',
      cycle_number: 2,
      venture: ventures.alpha._id,
      progress_summary: 'Unsubmitted draft',
    },
    {
      custom_id: 'other',
      cycle_number: 1,
      venture: ventures.beta._id,
      submitted_at: new Date('2026-02-01'),
      progress_summary: 'Other team private report',
    },
    {
      custom_id: 'before',
      cycle_number: 3,
      venture: ventures.alpha._id,
      submitted_at: new Date('2025-12-01'),
      progress_summary: 'Before membership',
    },
  ])
  await KPI.create([
    {
      title: 'Own KPI',
      description: 'Own work',
      founder: users.owner._id,
      venture: ventures.alpha._id,
      createdBy: users.owner._id,
    },
    {
      title: 'Other founder KPI',
      description: 'Private work',
      founder: users.outsider._id,
      venture: ventures.alpha._id,
      createdBy: users.outsider._id,
    },
  ])
  await CheckIn.create({
    venture: ventures.alpha._id,
    mentor: users.mentor._id,
    scheduledAt: new Date('2026-02-01'),
    timeZone: 'Asia/Kolkata',
    durationMinutes: 30,
    googleEventId: 'feedback',
    status: 'HELD',
    notes: 'Validate willingness to pay',
    attendees: [{ user: users.owner._id, email: users.owner.email }],
  })
  const context = await reportCardEvidence(users.owner._id)
  assert.equal(context.reports.length, 1)
  assert.equal(context.reports[0].sourceId, String(report._id))
  assert.equal(context.reports[0].scope, 'TEAM')
  assert.equal(context.reports[0].metrics.customer_interviews, 12)
  assert.equal(
    context.reports[0].mentorFeedback.concerns,
    'Needs paid validation'
  )
  assert.equal(context.reports[0].evaluation.execution, 80)
  assert.ok(context.reports[0].periodStart instanceof Date)
  assert.equal(context.meetingFeedback[0].notes, 'Validate willingness to pay')
  assert.ok(
    context.kpis.some(kpi => kpi.title === 'Own KPI' && kpi.score === null)
  )
  assert.ok(!context.kpis.some(kpi => kpi.title === 'Other founder KPI'))
  assert.ok(!JSON.stringify(context).includes(users.owner.email))
})

it('bounds source counts and text and works for a student without a startup', async () => {
  const { users, ventures } = await seed()
  await KPI.insertMany(
    Array.from({ length: 25 }, (_, n) => ({
      title: `Goal ${n}`,
      description: 'x'.repeat(5000),
      founder: users.applicant._id,
      venture: ventures.alpha._id,
      createdBy: users.applicant._id,
    }))
  )
  const context = await reportCardEvidence(users.applicant._id)
  assert.equal(context.kpis.length, 20)
  assert.equal(context.kpis[0].description.length, 1500)
  assert.deepEqual(context.reports, [])
  assert.deepEqual(context.meetingFeedback, [])
})

it('uses report periods and includes team KPIs completed during membership', async () => {
  const { users, ventures } = await seed()
  await KPI.deleteMany({})
  await ventures.alpha.collection.updateOne(
    { _id: ventures.alpha._id },
    { $set: { createdAt: new Date('2026-01-01') } }
  )
  await Founder.updateOne(
    { user: users.owner._id },
    { joinedAt: new Date('2026-01-20') }
  )
  await BiWeeklySubmission.create([
    {
      custom_id: 'late-old-period',
      cycle_number: 1,
      venture: ventures.alpha._id,
      submitted_at: new Date('2026-02-01'),
    },
    {
      custom_id: 'overlapping-period',
      cycle_number: 2,
      venture: ventures.alpha._id,
      submitted_at: new Date('2026-02-01'),
    },
  ])
  const goals = await KPI.create([
    {
      title: 'Completed during membership',
      description: 'Shared interviews',
      venture: ventures.alpha._id,
      createdBy: users.mentor._id,
      status: 'WAITING_FOR_APPROVAL',
      submissionDate: new Date('2026-02-01'),
    },
    {
      title: 'Graded during membership',
      description: 'Shared prototype',
      venture: ventures.alpha._id,
      createdBy: users.mentor._id,
      status: 'GRADED',
      score: 80,
      evaluationDate: new Date('2026-02-01'),
    },
    {
      title: 'Old team goal',
      description: 'Before membership',
      venture: ventures.alpha._id,
      createdBy: users.mentor._id,
    },
  ])
  await KPI.collection.updateMany(
    { _id: { $in: goals.map(goal => goal._id) } },
    { $set: { createdAt: new Date('2026-01-01') } }
  )
  const context = await reportCardEvidence(users.owner._id)
  assert.deepEqual(
    context.reports.map(report => report.cycle),
    [2]
  )
  assert.deepEqual(context.kpis.map(kpi => kpi.title).sort(), [
    'Completed during membership',
    'Graded during membership',
  ])
  assert.ok(context.kpis.every(kpi => kpi.scope === 'TEAM'))
})

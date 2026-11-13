import { after, before, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { REPORT_CARD_LIMITS as limits } from '@nst/shared/reportCards.js'

import app from '../app.js'
import EmailNotification from '../models/emailNotification.js'
import EmailSettings from '../models/emailSettings.js'
import ReportCardTemplate from '../models/reportCardTemplate.js'
import User from '../models/user.js'
import { seedReportCardTemplates } from '../seed/reportCardTemplates.js'
import { appUrl } from '../utils/kpiLockEmails.js'
import {
  cookieFor,
  emailFailures,
  seed,
  sentEmails,
  startDatabase,
  stopDatabase,
} from './helpers.js'

const adminPath = '/api/admin/report-cards'
const studentPath = '/api/report-card'
const as = user => request.agent(app).set('Cookie', cookieFor(user))

before(startDatabase)
after(stopDatabase)

it('publishes only to the intended student and keeps later draft changes private', async () => {
  const { users } = await seed()
  // This student has neither linked Google nor joined a startup.
  await User.updateOne(
    { _id: users.applicant._id },
    { $unset: { googleId: 1 } }
  )
  const target = `${adminPath}/students/${users.applicant._id}`
  const admin = as(users.admin)
  const student = as(users.applicant)
  const otherStudent = as(users.owner)
  const columns = ['Criterion', 'Marks', 'Feedback']

  for (const user of [users.board, users.mentor, users.owner]) {
    const actor = as(user)
    await actor.get(adminPath).expect(403)
    await actor
      .post(`${adminPath}/templates`)
      .send({ name: 'Assessment', columns })
      .expect(403)
    await actor.get(target).expect(403)
    await actor.post(target).expect(403)
    await actor.put(target).expect(403)
  }
  await request(app).get(studentPath).expect(401)
  await admin.get(studentPath).expect(403)
  await admin.get(`${adminPath}/students/${users.mentor._id}`).expect(404)
  const options = await admin.get(adminPath).expect(200)
  assert.equal(options.body.students.length, 3)
  assert.ok(
    options.body.students.some(user => user._id === String(users.applicant._id))
  )

  await admin
    .post(`${adminPath}/templates`)
    .send({
      name: 'Assessment',
      columns: ['Marks', 'marks'],
    })
    .expect(400)
  const {
    body: { template },
  } = await admin
    .post(`${adminPath}/templates`)
    .send({
      name: 'Assessment',
      columns,
    })
    .expect(201)
  const create = actor => actor.post(target).send({ templateId: template._id })
  const creations = await Promise.all([create(admin), create(as(users.admin2))])
  assert.deepEqual(creations.map(result => result.status).sort(), [201, 409])
  assert.deepEqual(
    creations.find(result => result.status === 201).body.card.draft.columns,
    columns
  )
  await student.get(studentPath).expect(200, { report: null })

  const report = {
    title: 'Assessment',
    columns,
    rows: [['Execution', '0', 'Keep going']],
  }
  await admin
    .put(target)
    .send({ ...report, rows: [['Too few cells']], revision: 0, publish: false })
    .expect(400)
  const draft = await admin
    .put(target)
    .send({ ...report, revision: 0, publish: false })
    .expect(200)
  assert.equal(draft.body.card.revision, 1)
  await student.get(studentPath).expect(200, { report: null })
  await admin
    .put(target)
    .send({ ...report, revision: 0, publish: true })
    .expect(409)

  assert.equal(sentEmails.length, 0)
  await admin
    .put(target)
    .send({ ...report, revision: 1, publish: true })
    .expect(200)
  assert.deepEqual(
    sentEmails.map(email => email.to),
    [users.applicant.email]
  )
  assert.ok(sentEmails[0].html.includes(`href="${appUrl()}/report-card"`))
  assert.ok(sentEmails[0].text.includes(`${appUrl()}/report-card`))
  assert.doesNotMatch(sentEmails[0].text, /Execution|Keep going/)
  const notice = await EmailNotification.findOne({
    type: 'REPORT_CARD_PUBLISHED',
  }).lean()
  assert.equal(String(notice.recipientUser), String(users.applicant._id))
  assert.equal(notice.status, 'SENT')
  await admin
    .put(target)
    .send({ ...report, revision: 1, publish: true })
    .expect(409)
  assert.equal(sentEmails.length, 1)
  const published = await student
    .get(studentPath)
    .expect(200)
    .expect('Cache-Control', 'no-store')
  assert.deepEqual(published.body.report.rows, report.rows)
  assert.deepEqual(published.body.report.columns, columns)
  await otherStudent
    .get(`${studentPath}?studentId=${users.applicant._id}`)
    .expect(200, { report: null })

  const revised = {
    ...report,
    columns: [...columns, 'Maximum'],
    rows: [['Execution', '8', 'Revised', '10']],
  }
  await admin
    .put(target)
    .send({ ...revised, revision: 2, publish: false })
    .expect(200)
  await student.get(studentPath).expect(200, published.body)
  assert.equal(sentEmails.length, 1)
  await admin
    .put(target)
    .send({ ...revised, revision: 3, publish: true })
    .expect(200)
  const latest = await student.get(studentPath).expect(200)
  assert.deepEqual(latest.body.report.rows, revised.rows)
  assert.deepEqual(latest.body.report.columns, revised.columns)
  assert.deepEqual(
    sentEmails.map(email => email.to),
    [users.applicant.email, users.applicant.email]
  )
})

it('publishes grouped terms and validates the grading mode while preserving the previous publication', async () => {
  const { users } = await seed()
  const admin = as(users.admin)
  const student = as(users.applicant)
  const target = `${adminPath}/students/${users.applicant._id}`
  const layout = {
    mode: 'numeric',
    terms: [
      {
        id: 'term-1',
        name: 'Term 1',
        assessments: [
          { id: 'practice', name: 'Practice', max: 20, showAverage: true },
          { id: 'final-1', name: 'Final', max: 80, showAverage: false },
        ],
      },
      {
        id: 'term-2',
        name: 'Term 2',
        assessments: [{ id: 'final-2', name: 'Final', max: 100 }],
      },
    ],
  }
  const title = 'Activity Report'
  const {
    body: { template },
  } = await admin
    .post(`${adminPath}/templates`)
    .send({ name: title, layout })
    .expect(201)
  assert.deepEqual(template.columns, ['Subject', 'Practice', 'Final', 'Final'])
  assert.equal(template.layout.terms[0].assessments[0].showAverage, true)
  const {
    body: { card },
  } = await admin.post(target).send({ templateId: template._id }).expect(201)
  assert.deepEqual(card.draft.layout, template.layout)

  const rows = [
    ['Eating', '16', '65', '84'],
    ['Dancing', '18.5', '72', '91'],
  ]
  const report = { title, layout, rows, revision: 0, publish: true }
  await admin
    .put(target)
    .send({ ...report, rows: [['Dancing', '21', '', '']] })
    .expect(400)
  await admin
    .put(target)
    .send({ ...report, rows: [['', '18', '', '']] })
    .expect(400)
  await EmailSettings.create({
    templates: { 'report-card-published': { enabled: false } },
  })
  await admin.put(target).send(report).expect(200)
  assert.equal(sentEmails.length, 0)
  assert.equal(await EmailNotification.countDocuments(), 0)
  const published = await student.get(studentPath).expect(200)
  assert.deepEqual(published.body.report.layout.terms, layout.terms)
  assert.deepEqual(published.body.report.rows, rows)

  const legend = {
    A: 'Advanced',
    B: 'Proficient',
    C: 'Developing',
    D: 'Beginning',
  }
  const letters = { ...layout, mode: 'letter', legend }
  const next = { ...report, layout: letters, revision: 1 }
  await admin
    .put(target)
    .send({ ...next, layout: { ...letters, legend: { A: 'Advanced' } } })
    .expect(400)
  await admin.put(target).send(next).expect(400)
  const draft = await admin
    .put(target)
    .send({ ...next, publish: false })
    .expect(200)
  assert.deepEqual(draft.body.card.draft.layout.terms, layout.terms)
  await student.get(studentPath).expect(200, published.body)

  const letterRows = [
    ['Eating', 'B', 'C', 'B'],
    ['Dancing', 'A', 'A', 'A'],
  ]
  await EmailSettings.deleteMany({})
  emailFailures.add(users.applicant.email)
  await admin
    .put(target)
    .send({ ...next, revision: 2, rows: letterRows })
    .expect(200)
  const latest = await student.get(studentPath).expect(200)
  assert.equal(latest.body.report.layout.mode, 'letter')
  assert.deepEqual(latest.body.report.layout.terms, layout.terms)
  assert.deepEqual(latest.body.report.layout.legend, legend)
  assert.deepEqual(latest.body.report.rows, letterRows)
  const failure = await EmailNotification.findOne({
    type: 'REPORT_CARD_PUBLISHED',
  }).lean()
  assert.equal(failure.status, 'FAILED')
  assert.equal(failure.recipientEmail, users.applicant.email)
})

it('seeds a reusable six-month rubric and applies its pillar marks to new drafts', async () => {
  const { users } = await seed()
  await Promise.all([seedReportCardTemplates(), seedReportCardTemplates()])

  const admin = as(users.admin)
  const {
    body: { templates },
  } = await admin.get(adminPath).expect(200)
  assert.equal(templates.length, 1)
  const [template] = templates
  assert.equal(template.name, 'Monthly Entrepreneurship Evaluation')
  assert.equal(template.layout.mode, 'numeric')
  assert.deepEqual(
    template.layout.terms.map(term => term.name),
    ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6']
  )
  assert.deepEqual(template.layout.subjects, [
    { name: 'Execution & Product', max: 40 },
    { name: 'Customer & Market', max: 25 },
    { name: 'Business & Metrics', max: 20 },
    { name: 'Founder Behaviour', max: 15 },
  ])

  const target = `${adminPath}/students/${users.applicant._id}`
  const {
    body: { card },
  } = await admin.post(target).send({ templateId: template._id }).expect(201)
  const blankRows = template.layout.subjects.map(({ name }) => [
    name,
    '',
    '',
    '',
    '',
    '',
    '',
  ])
  assert.deepEqual(card.draft.rows, blankRows)
  const rows = structuredClone(blankRows)
  const publication = { ...card.draft, rows, revision: 0, publish: true }
  const repeatedPillar = [' execution & product ', '40', '', '', '', '', '']
  const repeated = await admin
    .put(target)
    .send({ ...publication, rows: [...rows, repeatedPillar] })
    .expect(400)
  assert.match(repeated.body.error, /appears more than once/)
  rows[0][1] = '41'
  await admin.put(target).send(publication).expect(400)
  rows[0][1] = '40'
  rows[1][1] = '25'
  rows[2][1] = '20'
  rows[3][1] = '15'
  await admin.put(target).send(publication).expect(200)
  const {
    body: { report },
  } = await as(users.applicant).get(studentPath).expect(200)
  assert.deepEqual(report.layout.subjects, template.layout.subjects)
  assert.deepEqual(report.rows, rows)

  await ReportCardTemplate.updateOne(
    { _id: template._id },
    { name: 'Local rubric' }
  )
  const edited = await ReportCardTemplate.findById(template._id).lean()
  await seedReportCardTemplates()
  assert.deepEqual(
    await ReportCardTemplate.findById(template._id).lean(),
    edited
  )
  assert.equal(await ReportCardTemplate.countDocuments(), 1)
})

it('saves a draft at the grid limits with multibyte text', async () => {
  const { users } = await seed()
  const admin = as(users.admin)
  const target = `${adminPath}/students/${users.applicant._id}`
  const assessments = Array.from(
    { length: limits.assessments },
    (_, index) => ({
      id: `marks-${index}`,
      name: `Marks ${index + 1}`,
      max: 100,
    })
  )
  const layout = {
    mode: 'numeric',
    terms: [{ id: 'month-1', name: 'Month 1', assessments }],
  }
  const title = 'Maximum draft'
  const {
    body: { template },
  } = await admin
    .post(`${adminPath}/templates`)
    .send({ name: title, layout })
    .expect(201)
  await admin.post(target).send({ templateId: template._id }).expect(201)

  const text = '水'.repeat(limits.cell)
  const rows = Array.from({ length: limits.rows }, (_, index) => [
    `Subject ${index + 1}`,
    ...assessments.map(() => text),
  ])
  const update = { title, layout, rows, revision: 0, publish: false }
  assert.ok(Buffer.byteLength(JSON.stringify(update)) > 100 * 1024)
  const {
    body: { card },
  } = await admin.put(target).send(update).expect(200)
  assert.deepEqual(card.draft.rows, rows)
  assert.equal(card.revision, 1)
  assert.equal(sentEmails.length, 0)
})

import { after, before, beforeEach, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../app.js'
import BiweeklyForm from '../models/biweeklyForm.js'
import Venture from '../models/venture.js'
import BiWeeklySubmission from '../models/biWeeklySubmission.js'
import { seed, startDatabase, stopDatabase, cookieFor } from './helpers.js'
import { defaultBiweeklyForm } from '@nst/shared/biweeklyForm.js'
let data
before(startDatabase)
after(stopDatabase)
beforeEach(async () => {
  data = await seed()
  await BiweeklyForm.syncIndexes()
  await Venture.collection.updateOne(
    { _id: data.ventures.alpha._id },
    { $set: { createdAt: new Date(Date.now() - 45 * 86400000) } }
  )
})
const edit = (user, definition, revision = 0) =>
  request(app)
    .put('/api/biweekly/form')
    .set('Cookie', cookieFor(user))
    .send({ ventureId: data.ventures.alpha.id, revision, definition })
const block = (id, type = 'text', required = false) => ({
  id,
  type,
  label: id,
  description: '',
  required,
  options: type === 'select' ? ['One', 'Two'] : [],
})
const form = () => ({
  title: 'Discovery goals',
  description: 'For Alpha only',
  blocks: [
    block('q_goal', 'textarea', true),
    block('q_count', 'number'),
    block('q_stage', 'select'),
    block('q_confirm', 'checkbox', true),
  ],
})
const save = (answers, extra = {}) =>
  request(app)
    .post('/api/biweekly/submission')
    .set('Cookie', cookieFor(data.users.owner))
    .send({
      cycle_number: 4,
      custom_answers: answers,
      form_revision: 1,
      ...extra,
    })
it('strictly restricts editing to admins, including direct API requests', async () => {
  for (const role of ['owner', 'mentor', 'board', 'outsider']) {
    await edit(data.users[role], form()).expect(403)
  }
  await edit(data.users.admin, form()).expect(200)
})
it('isolates startup forms and rejects conflicting admin edits', async () => {
  await edit(data.users.admin, form()).expect(200)
  await edit(data.users.admin2, form()).expect(409)
  const own = await request(app)
    .get('/api/biweekly')
    .set('Cookie', cookieFor(data.users.owner))
    .expect(200)
  assert.equal(own.body.form.definition.title, 'Discovery goals')
  const other = await request(app)
    .get('/api/biweekly')
    .set('Cookie', cookieFor(data.users.outsider))
    .expect(200)
  assert.equal(other.body.form, null)
  await edit(data.users.admin, { ...form(), title: 'Revised goals' }, 1).expect(
    200
  )
  await edit(data.users.admin2, form(), 1).expect(409)
})
it('validates form definitions and typed answers and requires answers only on submission', async () => {
  const duplicate = form()
  duplicate.blocks.push(duplicate.blocks[0])
  await edit(data.users.admin, duplicate).expect(400)
  const invalid = defaultBiweeklyForm()
  invalid.blocks[0].type = 'number'
  await edit(data.users.admin, invalid).expect(400)
  await edit(data.users.admin, form()).expect(200)
  await save({}, { form_revision: 0 }).expect(409)
  await save({ q_count: -1 }).expect(400)
  await save({ q_stage: 'Unknown' }).expect(400)
  await save({ unknown: 'Injected' }).expect(400)
  await save({}).expect(200)
  await save({}, { isSubmit: true }).expect(400)
  await save(
    { q_goal: 'Interview 10 buyers', q_confirm: true },
    { isSubmit: true }
  ).expect(200)
  await save({ q_goal: 'Changed' }).expect(403)
})
it('preserves the saved form and answers across edits, without trusting student schema input', async () => {
  await edit(data.users.admin, form()).expect(200)
  await save(
    { q_goal: 'Original answer' },
    { form_snapshot: { title: 'Forged' } }
  ).expect(200)
  const revised = form()
  revised.blocks = [block('q_new', 'text', true)]
  await edit(data.users.admin, revised, 1).expect(200)
  const res = await save({ q_confirm: true }, { isSubmit: true }).expect(200)
  assert.equal(res.body.submission.form_snapshot.title, 'Discovery goals')
  assert.equal(res.body.submission.custom_answers.q_goal, 'Original answer')
  assert.equal(res.body.submission.form_revision, 1)
})
it('keeps legacy drafts on their original form and maps standard answers for analytics', async () => {
  const legacy = await request(app)
    .post('/api/biweekly/submission')
    .set('Cookie', cookieFor(data.users.owner))
    .send({ cycle_number: 4, progress_summary: 'Old draft' })
    .expect(200)
  await edit(data.users.admin, defaultBiweeklyForm()).expect(200)
  await save(
    {},
    { progress_summary: 'Updated legacy draft', isSubmit: true }
  ).expect(200)
  const saved = await BiWeeklySubmission.findById(legacy.body.submission._id)
  assert.equal(saved.form_snapshot, undefined)
  assert.equal(saved.progress_summary, 'Updated legacy draft')
  await BiWeeklySubmission.deleteMany({})
  const current = await save(
    { progress_summary: 'Current progress', hours_worked: 12 },
    { isSubmit: true }
  ).expect(200)
  assert.equal(current.body.submission.hours_worked, 12)
  assert.equal(current.body.submission.progress_summary, 'Current progress')
})

it('saves larger valid forms and responses beyond the default JSON parser limit', async () => {
  const definition = {
    title: 'Detailed report',
    description: '',
    blocks: Array.from({ length: 60 }, (_, i) => ({
      ...block('q_' + i),
      description: 'd'.repeat(2000),
    })),
  }
  await edit(data.users.admin, definition).expect(200)
  const answers = Object.fromEntries(
    definition.blocks.map(b => [b.id, 'a'.repeat(3000)])
  )
  const result = await save(answers, { isSubmit: true }).expect(200)
  assert.equal(Object.keys(result.body.submission.custom_answers).length, 60)
})

import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import request from 'supertest'

import app from '../app.js'
import Batch from '../models/batch.js'
import Founder from '../models/founder.js'
import KPI from '../models/kpi.js'
import Role from '../models/role.js'
import User from '../models/user.js'
import VentureJoinRequest from '../models/ventureJoinRequest.js'
import VentureProposal from '../models/ventureProposal.js'
import { cookieFor, seed, startDatabase, stopDatabase } from './helpers.js'

// The admin's batch filter (?batch=) on every staff list.
//   Batch A (2026–2030): owner (Alpha), applicant (no startup yet)
//   Batch B (2025–2029): outsider (Beta), mixer (Alpha), bea (no startup)
// So Alpha is in both batches and Beta only in B.
let data
let a
let b
let mixer
let bea
const get = (user, url) => request(app).get(url).set('Cookie', cookieFor(user))

before(startDatabase)
after(stopDatabase)
beforeEach(async () => {
  data = await seed()
  const { campus, users, ventures } = data
  ;[a, b] = await Batch.create([
    { name: '2026–2030', startYear: 2026, endYear: 2030, campus: campus._id },
    { name: '2025–2029', startYear: 2025, endYear: 2029, campus: campus._id },
  ])
  await User.updateMany(
    { _id: { $in: [users.owner._id, users.applicant._id] } },
    { batch: a._id, campus: campus._id }
  )
  await User.updateOne(
    { _id: users.outsider._id },
    { batch: b._id, campus: campus._id }
  )
  const student = await Role.findOne({ name: 'student' })
  ;[mixer, bea] = await User.create([
    {
      username: 'Mia Mixer',
      email: 'mia@adypu.edu.in',
      password: 'password123',
      role: student._id,
      batch: b._id,
      campus: campus._id,
      isEmailVerified: true,
    },
    {
      username: 'Bea Batch',
      email: 'bea@adypu.edu.in',
      password: 'password123',
      role: student._id,
      batch: b._id,
      campus: campus._id,
      isEmailVerified: true,
    },
  ])
  await Founder.create({ user: mixer._id, venture: ventures.alpha._id })

  const proposal = (submitter, startupName) =>
    VentureProposal.create({
      startupName,
      description: 'Tutoring marketplace',
      targetCustomer: 'Students',
      industryName: 'EdTech',
      stage: 'IDEATION',
      currentTraction: 'None yet',
      businessModel: 'Commission',
      assumptions: ['People pay'],
      risks: ['Competition'],
      sixMonthGoals: '100 users',
      techStack: 'React',
      capitalStatus: 'Bootstrapped',
      weeklyHours: 10,
      submittedBy: submitter._id,
      campus: campus._id,
      status: 'PENDING',
    })
  await proposal(users.applicant, 'Gamma')
  await proposal(bea, 'Delta')
  // A batch A student asks to join batch B's startup.
  await VentureJoinRequest.create({
    venture: ventures.beta._id,
    requestedBy: users.applicant._id,
    status: 'PENDING',
  })

  const memberKpi = (founder, title) =>
    KPI.create({
      title,
      description: 'A member goal',
      venture: ventures.alpha._id,
      founder: founder._id,
      createdBy: founder._id,
    })
  await memberKpi(users.owner, 'Owner goal')
  await memberKpi(mixer, 'Mixer goal')
})

const names = list => list.map(item => item.name).sort()

describe('batch filter', () => {
  it('lists the startups with a founder in the batch', async () => {
    const { admin } = data.users
    const all = await get(admin, '/api/ventures')
    assert.deepEqual(names(all.body), ['Alpha', 'Beta'])

    const inA = await get(admin, `/api/ventures?batch=${a._id}`)
    assert.equal(inA.status, 200)
    assert.deepEqual(names(inA.body), ['Alpha'])

    const inB = await get(admin, `/api/ventures?batch=${b._id}`)
    assert.deepEqual(names(inB.body), ['Alpha', 'Beta'])
  })

  it("lists only the batch's founders, with their batch", async () => {
    const res = await get(
      data.users.admin,
      `/api/admin/founders?batch=${a._id}`
    )
    assert.equal(res.status, 200)
    assert.deepEqual(
      res.body.students.map(s => s.founder),
      ['Olu Owner']
    )
    const [row] = res.body.students
    assert.equal(row.batch, '2026–2030 · ADYPU')
    // The team is still the whole team.
    assert.equal(row.team, 2)
    assert.deepEqual(res.body.batch, ['2026–2030 · ADYPU', '2025–2029 · ADYPU'])
  })

  it("counts the batch's startups, founders and work on the overview", async () => {
    const res = await get(
      data.users.admin,
      `/api/admin/overview?batch=${a._id}`
    )
    assert.equal(res.status, 200)
    assert.equal(res.body.overview.ventures, 1)
    assert.equal(res.body.overview.founders, 1)
    assert.equal(res.body.actions.proposals.count, 1)
    // The request to join Beta counts, though Beta is in batch B.
    assert.equal(res.body.actions.joinRequests.count, 1)

    const inB = await get(
      data.users.admin,
      `/api/admin/overview?batch=${b._id}`
    )
    assert.equal(inB.body.overview.ventures, 2)
    assert.equal(inB.body.overview.founders, 2)
    assert.equal(inB.body.actions.joinRequests.count, 0)
  })

  it("shows only the batch's students' applications", async () => {
    const { admin } = data.users
    const inA = await get(admin, `/api/admin/applications?batch=${a._id}`)
    assert.equal(inA.status, 200)
    assert.deepEqual(
      inA.body.proposals.map(p => p.startupName),
      ['Gamma']
    )
    assert.equal(inA.body.joinRequests.length, 1)

    const inB = await get(admin, `/api/admin/applications?batch=${b._id}`)
    assert.deepEqual(
      inB.body.proposals.map(p => p.startupName),
      ['Delta']
    )
    assert.equal(inB.body.joinRequests.length, 0)

    const all = await get(admin, '/api/admin/applications')
    assert.equal(all.body.proposals.length, 2)
  })

  it("leaves out another batch's members' KPIs", async () => {
    const res = await get(data.users.admin, `/api/kpis/all?batch=${a._id}`)
    assert.equal(res.status, 200)
    const titles = res.body.data.map(kpi => kpi.title).sort()
    // Alpha's two startup KPIs and the owner's own goal.
    assert.deepEqual(titles, ['Interviews', 'Interviews', 'Owner goal'])

    const inB = await get(data.users.admin, `/api/kpis/all?batch=${b._id}`)
    const bTitles = inB.body.data.map(kpi => kpi.title)
    assert.ok(bTitles.includes('Mixer goal'))
    assert.ok(!bTitles.includes('Owner goal'))
    assert.equal(inB.body.count, 4)
  })

  it("shows the batch's students and every staff account", async () => {
    const res = await get(
      data.users.admin,
      `/api/admin/accounts?batch=${a._id}`
    )
    assert.equal(res.status, 200)
    const students = res.body.accounts
      .filter(account => account.role === 'student')
      .map(account => account.username)
      .sort()
    assert.deepEqual(students, ['Ana Applicant', 'Olu Owner'])
    const staff = res.body.accounts.filter(
      account => account.role !== 'student'
    )
    assert.equal(staff.length, 5)
    assert.equal(res.body.adminCount, 2)
  })

  it('refuses a batch that does not exist', async () => {
    const { admin } = data.users
    const gone = new mongoose.Types.ObjectId()
    for (const url of [
      '/api/ventures',
      '/api/admin/founders',
      '/api/admin/overview',
      '/api/admin/applications',
      '/api/kpis/all',
      '/api/admin/accounts',
    ]) {
      const bad = await get(admin, `${url}?batch=nope`)
      assert.equal(bad.status, 400, url)
      const missing = await get(admin, `${url}?batch=${gone}`)
      assert.equal(missing.status, 400, url)
      assert.match(JSON.stringify(missing.body), /no longer exists/)
    }
  })

  it("never widens a mentor's startups", async () => {
    const { mentor, otherMentor } = data.users
    const own = await get(mentor, `/api/ventures?batch=${b._id}`)
    assert.deepEqual(names(own.body), ['Alpha'])

    const none = await get(otherMentor, `/api/ventures?batch=${a._id}`)
    assert.deepEqual(names(none.body), [])
  })

  it('students still see every startup', async () => {
    const res = await get(data.users.owner, `/api/ventures?batch=${a._id}`)
    assert.equal(res.status, 200)
    assert.deepEqual(names(res.body), ['Alpha', 'Beta'])
  })

  it('treats an empty batch as every batch and refuses odd values', async () => {
    const { admin } = data.users
    const empty = await get(admin, '/api/ventures?batch=')
    assert.equal(empty.status, 200)
    assert.deepEqual(names(empty.body), ['Alpha', 'Beta'])

    const twice = await get(
      admin,
      `/api/ventures?batch=${a._id}&batch=${b._id}`
    )
    assert.equal(twice.status, 400)
    // Twelve characters pass isValidObjectId but name no batch.
    const twelve = await get(admin, '/api/ventures?batch=aaaaaaaaaaaa')
    assert.equal(twelve.status, 400)
  })

  it('a founder who left no longer puts the startup in their batch', async () => {
    await Founder.updateOne(
      { user: data.users.owner._id },
      { status: 'INACTIVE', leftAt: new Date() }
    )
    const { admin } = data.users
    const ventures = await get(admin, `/api/ventures?batch=${a._id}`)
    assert.deepEqual(names(ventures.body), [])
    const founders = await get(admin, `/api/admin/founders?batch=${a._id}`)
    assert.deepEqual(founders.body.students, [])
  })

  it('an empty batch shows nothing, not everything', async () => {
    const empty = await Batch.create({
      name: '2027–2031',
      startYear: 2027,
      endYear: 2031,
      campus: data.campus._id,
    })
    const { admin } = data.users
    const q = `?batch=${empty._id}`
    assert.deepEqual((await get(admin, `/api/ventures${q}`)).body, [])
    const overview = (await get(admin, `/api/admin/overview${q}`)).body
    assert.equal(overview.overview.ventures, 0)
    assert.equal(overview.overview.founders, 0)
    assert.equal(overview.actions.proposals.count, 0)
    assert.equal(overview.actions.kpisToGrade.count, 0)
    const kpis = (await get(admin, `/api/kpis/all${q}`)).body
    assert.equal(kpis.count, 0)
    const apps = (await get(admin, `/api/admin/applications${q}`)).body
    assert.equal(apps.proposals.length, 0)
    const accounts = (await get(admin, `/api/admin/accounts${q}`)).body
    assert.ok(accounts.accounts.every(account => account.role !== 'student'))
  })

  it('keeps accounts with no role, and deactivated staff, in view', async () => {
    await User.updateOne(
      { _id: data.users.board._id },
      { deletedAt: new Date() }
    )
    // An old record from before roles were required.
    await User.collection.insertOne({
      username: 'Nora Noname',
      email: 'nora@newtonschool.co',
      password: 'x',
      isEmailVerified: true,
      createdAt: new Date(),
    })
    const res = await get(
      data.users.admin,
      `/api/admin/accounts?batch=${a._id}`
    )
    const usernames = res.body.accounts.map(account => account.username)
    assert.ok(usernames.includes('Nora Noname'))
    assert.ok(usernames.includes('Bo Board'))
    assert.ok(!usernames.includes('Oz Outsider'))
  })

  it("narrows a mentor's KPIs and applications to the batch", async () => {
    const { mentor } = data.users
    const kpis = await get(mentor, `/api/kpis/all?batch=${b._id}`)
    assert.equal(kpis.status, 200)
    // Alpha only, and of its member goals only the batch B member's.
    const titles = kpis.body.data.map(kpi => kpi.title).sort()
    assert.deepEqual(titles, ['Interviews', 'Interviews', 'Mixer goal'])

    const apps = await get(mentor, `/api/admin/applications?batch=${a._id}`)
    assert.deepEqual(
      apps.body.proposals.map(p => p.startupName),
      ['Gamma']
    )
    // The request to join Beta is Beta's mentor's, not this one's.
    assert.equal(apps.body.joinRequests.length, 0)
  })

  it('the academic board can narrow by batch too', async () => {
    const res = await get(data.users.board, `/api/ventures?batch=${a._id}`)
    assert.equal(res.status, 200)
    assert.deepEqual(names(res.body), ['Alpha'])
  })
})

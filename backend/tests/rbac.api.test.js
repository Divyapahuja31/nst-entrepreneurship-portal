import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app from '../app.js'
import AuditLog from '../models/auditLog.js'
import KPI from '../models/kpi.js'
import Role from '../models/role.js'
import User from '../models/user.js'
import Venture from '../models/venture.js'
import VentureJoinRequest from '../models/ventureJoinRequest.js'
import VentureProposal from '../models/ventureProposal.js'
import { migrateRbac } from '../utils/rbacMigration.js'
import { cookieFor, seed, startDatabase, stopDatabase } from './helpers.js'

// Each request runs as a real signed-in user: the API loads their role from
// the database, as it does in production.
let data
const as = user => ({
  get: url => request(app).get(url).set('Cookie', cookieFor(user)),
  post: (url, body) =>
    request(app).post(url).set('Cookie', cookieFor(user)).send(body),
  put: (url, body) =>
    request(app).put(url).set('Cookie', cookieFor(user)).send(body),
  patch: (url, body) =>
    request(app).patch(url).set('Cookie', cookieFor(user)).send(body),
  delete: url => request(app).delete(url).set('Cookie', cookieFor(user)),
})

before(startDatabase)
after(stopDatabase)
beforeEach(async () => {
  data = await seed()
})

const grade = (user, kpi, score) =>
  as(user).put(`/api/kpis/${kpi._id}/evaluate`, { status: 'GRADED', score })

describe('signed out', () => {
  it('gets 401 from private data', async () => {
    for (const url of [
      '/api/ventures',
      '/api/kpis/all',
      '/api/admin/overview',
    ]) {
      const res = await request(app).get(url)
      assert.equal(res.status, 401, url)
    }
  })
})

describe('reading startups', () => {
  it("a student can't read another startup's KPIs", async () => {
    const { outsider } = data.users
    const res = await as(outsider).get(
      `/api/kpis/venture/${data.ventures.alpha._id}`
    )
    assert.equal(res.status, 403)
  })

  it('a mentor sees only the startups assigned to them', async () => {
    const { mentor } = data.users
    const blocked = await as(mentor).get(
      `/api/kpis/venture/${data.ventures.beta._id}`
    )
    assert.equal(blocked.status, 403)

    const all = await as(mentor).get('/api/kpis/all')
    assert.equal(all.status, 200)
    const ventures = new Set(all.body.data.map(k => String(k.venture._id)))
    assert.deepEqual([...ventures], [String(data.ventures.alpha._id)])

    const list = await as(mentor).get('/api/ventures')
    assert.deepEqual(
      list.body.map(v => v.name),
      ['Alpha']
    )

    const overview = await as(mentor).get('/api/admin/overview')
    assert.equal(overview.status, 200)
    assert.equal(overview.body.overview.ventures, 1)

    const detail = await as(mentor).get(
      `/api/ventures/${data.ventures.beta._id}`
    )
    assert.equal(detail.status, 403)
  })

  it('the board sees every startup', async () => {
    const res = await as(data.users.board).get('/api/kpis/all')
    assert.equal(res.status, 200)
    assert.equal(res.body.data.length, 3)
  })

  it("students can't reach staff pages", async () => {
    const res = await as(data.users.owner).get('/api/admin/overview')
    assert.equal(res.status, 403)
  })
})

describe('grading and locking KPIs', () => {
  it("a mentor can't review a startup that isn't theirs", async () => {
    const res = await as(data.users.mentor).put(
      `/api/kpis/${data.kpis.betaWaiting._id}/evaluate`,
      { status: 'ACCEPTED' }
    )
    assert.equal(res.status, 403)
  })

  it('a mentor re-grades until they lock, then only the board can', async () => {
    const { mentor, board } = data.users
    const kpi = data.kpis.alphaGraded

    assert.equal((await grade(mentor, kpi, 75)).status, 200)
    assert.equal((await grade(mentor, kpi, 80)).status, 200)

    const lock = await as(mentor).post(`/api/kpis/${kpi._id}/lock`)
    assert.equal(lock.status, 200)
    assert.equal(lock.body.data.isLocked, true)

    const regrade = await grade(mentor, kpi, 90)
    assert.equal(regrade.status, 403)
    assert.match(regrade.body.message, /locked/)
    assert.equal(
      (await as(mentor).post(`/api/kpis/${kpi._id}/unlock`)).status,
      403
    )
    assert.equal((await KPI.findById(kpi._id)).score, 80)

    // The board may change a locked grade and unlock it.
    assert.equal((await grade(board, kpi, 85)).status, 200)
    const unlock = await as(board).post(`/api/kpis/${kpi._id}/unlock`)
    assert.equal(unlock.status, 200)
    assert.equal(unlock.body.data.isLocked, false)
    assert.equal((await grade(mentor, kpi, 70)).status, 200)
  })

  it('only a graded KPI can be locked', async () => {
    const res = await as(data.users.board).post(
      `/api/kpis/${data.kpis.alphaDraft._id}/lock`
    )
    assert.equal(res.status, 403)
  })

  it("a mentor can't edit or delete a locked KPI; the board can", async () => {
    const { mentor, board } = data.users
    const kpi = data.kpis.alphaGraded
    await as(board).post(`/api/kpis/${kpi._id}/lock`)

    const edit = await as(mentor).put(`/api/kpis/${kpi._id}`, { title: 'X' })
    assert.equal(edit.status, 403)
    assert.equal((await as(mentor).delete(`/api/kpis/${kpi._id}`)).status, 403)
    const boardEdit = await as(board).put(`/api/kpis/${kpi._id}`, {
      title: 'Customer interviews',
    })
    assert.equal(boardEdit.status, 200)
  })
})

describe('evidence', () => {
  it('only the owning student submits progress, and not once locked', async () => {
    const { owner, mentor, board } = data.users
    const draft = data.kpis.alphaDraft

    const ok = await as(owner).put(`/api/kpis/${draft._id}/evidence`, {
      actualValue: '12',
      supportingText: 'Notes',
    })
    assert.equal(ok.status, 200)

    const staff = await as(mentor).put(`/api/kpis/${draft._id}/evidence`, {
      actualValue: '13',
    })
    assert.equal(staff.status, 403)

    const graded = data.kpis.alphaGraded
    await as(board).post(`/api/kpis/${graded._id}/lock`)
    const locked = await as(owner).put(`/api/kpis/${graded._id}/evidence`, {
      actualValue: '20',
    })
    assert.equal(locked.status, 403)
    const upload = await as(owner).post(`/api/kpis/${graded._id}/evidence`)
    assert.equal(upload.status, 403)
  })

  it('a student creates KPIs only for their own startup', async () => {
    const body = venture => ({
      title: 'Revenue',
      description: 'First paying users',
      venture: venture._id,
    })
    const own = await as(data.users.owner).post(
      '/api/kpis',
      body(data.ventures.alpha)
    )
    assert.equal(own.status, 201)
    const other = await as(data.users.owner).post(
      '/api/kpis',
      body(data.ventures.beta)
    )
    assert.equal(other.status, 403)
    const mentor = await as(data.users.mentor).post(
      '/api/kpis',
      body(data.ventures.beta)
    )
    assert.equal(mentor.status, 403)
  })
})

describe('applications', () => {
  const proposalFor = applicant =>
    VentureProposal.create({
      startupName: 'Gamma',
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
      submittedBy: applicant._id,
      campus: data.campus._id,
      status: 'PENDING',
    })

  it('the board must pick a mentor to accept a proposal', async () => {
    const proposal = await proposalFor(data.users.applicant)
    const url = `/api/admin/proposals/${proposal._id}/review`

    const missing = await as(data.users.board).patch(url, {
      status: 'APPROVED',
    })
    assert.equal(missing.status, 400)

    const notMentor = await as(data.users.board).patch(url, {
      status: 'APPROVED',
      mentorId: String(data.users.board._id),
    })
    assert.equal(notMentor.status, 400)

    const ok = await as(data.users.board).patch(url, {
      status: 'APPROVED',
      mentorId: String(data.users.otherMentor._id),
    })
    assert.equal(ok.status, 200)
    const venture = await Venture.findById(ok.body.proposal.venture)
    assert.equal(String(venture.mentor), String(data.users.otherMentor._id))
  })

  it('a mentor who accepts a proposal becomes its mentor', async () => {
    const proposal = await proposalFor(data.users.applicant)
    const res = await as(data.users.mentor).patch(
      `/api/admin/proposals/${proposal._id}/review`,
      // Ignored: a mentor can't hand the startup to someone else.
      { status: 'APPROVED', mentorId: String(data.users.otherMentor._id) }
    )
    assert.equal(res.status, 200)
    const venture = await Venture.findById(res.body.proposal.venture)
    assert.equal(String(venture.mentor), String(data.users.mentor._id))
  })

  it("join requests go to the startup's own mentor", async () => {
    const joinRequest = await VentureJoinRequest.create({
      venture: data.ventures.beta._id,
      requestedBy: data.users.applicant._id,
      status: 'PENDING',
    })
    const url = `/api/admin/join-requests/${joinRequest._id}/review`
    const blocked = await as(data.users.mentor).patch(url, {
      status: 'REJECTED',
    })
    assert.equal(blocked.status, 403)

    const listed = await as(data.users.mentor).get('/api/admin/applications')
    assert.equal(listed.body.joinRequests.length, 0)

    const ok = await as(data.users.otherMentor).patch(url, {
      status: 'REJECTED',
    })
    assert.equal(ok.status, 200)
  })

  it('staff cannot apply', async () => {
    const res = await as(data.users.mentor).post('/api/proposals', {})
    assert.equal(res.status, 403)
  })
})

describe('bi-weekly reviews', () => {
  const target = venture => ({
    ventureId: String(venture._id),
    cycle_number: 1,
  })

  it("mentors review their startups' reports; only the board reopens", async () => {
    const { mentor, board } = data.users
    const { alpha, beta } = data.ventures

    const own = await as(mentor).post('/api/biweekly/observation', {
      ...target(alpha),
      observation: 'Good progress',
    })
    assert.equal(own.status, 200)

    const other = await as(mentor).post('/api/biweekly/evaluation', {
      ...target(beta),
      execution_score: 50,
    })
    assert.equal(other.status, 403)

    const read = await as(mentor).get(`/api/biweekly?ventureId=${beta._id}`)
    assert.equal(read.status, 403)

    assert.equal(
      (await as(mentor).post('/api/biweekly/reopen', target(alpha))).status,
      403
    )
    assert.equal(
      (await as(board).post('/api/biweekly/reopen', target(alpha))).status,
      200
    )
  })
})

describe('accounts', () => {
  it('only admins manage accounts', async () => {
    for (const who of ['board', 'mentor', 'owner']) {
      const user = data.users[who]
      assert.equal((await as(user).get('/api/admin/accounts')).status, 403, who)
      const write = await as(user).patch(
        `/api/admin/accounts/${data.users.outsider._id}/role`,
        { role: 'admin' }
      )
      assert.equal(write.status, 403, who)
    }
  })

  it("an admin can't change or deactivate their own account", async () => {
    const { admin } = data.users
    const role = await as(admin).patch(
      `/api/admin/accounts/${admin._id}/role`,
      { role: 'student' }
    )
    assert.equal(role.status, 403)
    const remove = await as(admin).delete(`/api/admin/accounts/${admin._id}`)
    assert.equal(remove.status, 403)
  })

  it('changes a role and logs who did it', async () => {
    const { admin, outsider } = data.users
    const res = await as(admin).patch(
      `/api/admin/accounts/${outsider._id}/role`,
      { role: 'mentor' }
    )
    assert.equal(res.status, 200)
    assert.equal(res.body.account.role, 'mentor')

    const log = await as(admin).get('/api/admin/accounts/audit-log')
    assert.equal(log.status, 200)
    const [entry] = log.body.entries
    assert.equal(entry.action, 'ROLE_CHANGED')
    assert.equal(entry.actor.email, admin.email)
    assert.equal(entry.target.email, outsider.email)
    assert.equal(entry.previousRole, 'student')
    assert.equal(entry.newRole, 'mentor')
  })

  it('demoting a mentor frees their startups', async () => {
    const { admin, mentor } = data.users
    await as(admin).patch(`/api/admin/accounts/${mentor._id}/role`, {
      role: 'student',
    })
    const alpha = await Venture.findById(data.ventures.alpha._id)
    assert.equal(alpha.mentor, null)
  })

  it('always keeps an admin, even when two demote each other', async () => {
    const { admin, admin2 } = data.users
    await Promise.all([
      as(admin).patch(`/api/admin/accounts/${admin2._id}/role`, {
        role: 'mentor',
      }),
      as(admin2).patch(`/api/admin/accounts/${admin._id}/role`, {
        role: 'mentor',
      }),
    ])
    const adminRole = await Role.findOne({ name: 'admin' })
    const admins = await User.countDocuments({
      role: adminRole._id,
      deletedAt: null,
    })
    assert.ok(admins >= 1, `${admins} admins left`)
  })

  it("a deactivated account's session stops working", async () => {
    const { admin, owner } = data.users
    assert.equal((await as(owner).get('/api/auth/portfolio')).status, 200)

    const res = await as(admin).delete(`/api/admin/accounts/${owner._id}`)
    assert.equal(res.status, 200)
    assert.ok(res.body.account.deactivatedAt)

    // The old cookie, and a freshly signed one, are both refused.
    assert.equal((await as(owner).get('/api/auth/portfolio')).status, 401)
    const fresh = await User.findById(owner._id)
    assert.equal((await as(fresh).get('/api/kpis')).status, 401)

    const signIn = await request(app)
      .post('/api/auth/signin')
      .send({ email: owner.email, password: 'password123' })
    assert.equal(signIn.status, 403)
    assert.equal(
      await AuditLog.countDocuments({ action: 'ACCOUNT_DEACTIVATED' }),
      1
    )
  })

  it('creates accounts, requiring a batch and campus for students', async () => {
    const { admin } = data.users
    const student = await as(admin).post('/api/admin/accounts', {
      username: 'New Student',
      email: 'new@adypu.edu.in',
      role: 'student',
    })
    assert.equal(student.status, 400)
    assert.ok(student.body.error.batch)

    const mentor = await as(admin).post('/api/admin/accounts', {
      username: 'New Mentor',
      email: 'newmentor@newtonschool.co',
      role: 'mentor',
    })
    assert.equal(mentor.status, 201)
    assert.equal(mentor.body.account.role, 'mentor')
    assert.equal(
      await AuditLog.countDocuments({ action: 'ACCOUNT_CREATED' }),
      1
    )

    const again = await as(admin).post('/api/admin/accounts', {
      username: 'New Mentor',
      email: 'newmentor@newtonschool.co',
      role: 'mentor',
    })
    assert.equal(again.status, 400)
  })

  it('assigning a mentor is for the board only', async () => {
    const url = `/api/admin/ventures/${data.ventures.beta._id}/mentor`
    const body = { mentorId: String(data.users.mentor._id) }
    assert.equal((await as(data.users.mentor).patch(url, body)).status, 403)
    const ok = await as(data.users.board).patch(url, body)
    assert.equal(ok.status, 200)
    assert.equal(ok.body.mentor.email, data.users.mentor.email)
  })
})

describe('migration', () => {
  it('renames the old academic board role and is safe to rerun', async () => {
    const current = await Role.findOne({ name: 'academic_board' })
    await Role.updateOne(
      { _id: current._id },
      { $set: { name: 'academic board' } }
    )

    const first = await migrateRbac()
    assert.equal(first.renamed, 1)
    const board = await User.findById(data.users.board._id).populate('role')
    assert.equal(board.role.name, 'academic_board')

    const second = await migrateRbac()
    assert.deepEqual(second, {
      renamed: 0,
      usersGivenStudent: 0,
      kpisUnlocked: 0,
    })
  })
})

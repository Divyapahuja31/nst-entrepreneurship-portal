import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import * as can from './permissions.js'

// One of each kind of user. The startup under test is mentored by `mentor`
// and founded by `owner` and `teammate`.
const ACTORS = {
  admin: { id: 'u-admin', role: 'admin' },
  board: { id: 'u-board', role: 'academic_board' },
  mentor: { id: 'u-mentor', role: 'mentor' },
  otherMentor: { id: 'u-mentor-2', role: 'mentor' },
  owner: { id: 'u-owner', role: 'student' },
  teammate: { id: 'u-teammate', role: 'student' },
  outsider: { id: 'u-outsider', role: 'student' },
}
const MEMBERS = new Set(['owner', 'teammate'])
const STATUSES = ['DRAFT', 'WAITING_FOR_APPROVAL', 'REJECTED', 'ACCEPTED']
const ALL_STATUSES = [...STATUSES, 'GRADED']

const kpiContext = (who, { status, isLocked, isPastDue, personal }) => ({
  ventureMentorId: ACTORS.mentor.id,
  isMember: MEMBERS.has(who),
  kpiFounderId: personal ? ACTORS.owner.id : null,
  status,
  isLocked,
  isPastDue,
})

const cases = function* () {
  for (const status of ALL_STATUSES) {
    for (const isLocked of [false, true]) {
      for (const isPastDue of [false, true]) {
        for (const personal of [false, true]) {
          yield { status, isLocked, isPastDue, personal }
        }
      }
    }
  }
}

// The students who own a KPI: the whole team for a startup KPI, only the
// assignee for a personal one.
const owners = ({ personal }) => (personal ? ['owner'] : ['owner', 'teammate'])

// Who may do each thing, straight from the matrix in the README.
const EXPECTED = {
  canReadKpi: k => ['admin', 'board', 'mentor', ...owners(k)],
  canEditKpi: k => {
    if (k.isLocked) {
      return ['admin', 'board']
    }
    const studentsMay =
      can.EDITABLE_KPI_STATUSES.includes(k.status) && !k.isPastDue
    return ['admin', 'board', 'mentor', ...(studentsMay ? owners(k) : [])]
  },
  canEvaluateKpi: k =>
    k.isLocked ? ['admin', 'board'] : ['admin', 'board', 'mentor'],
  canLockKpi: k =>
    !k.isLocked && k.status === 'GRADED' ? ['admin', 'board', 'mentor'] : [],
  canUnlockKpi: k => (k.isLocked ? ['admin', 'board'] : []),
  canSubmitEvidence: k =>
    !k.isLocked && k.status !== 'GRADED' && !k.isPastDue ? owners(k) : [],
  canClearEvidence: k => [
    'admin',
    'board',
    ...(!k.isLocked && k.status !== 'GRADED' && !k.isPastDue ? owners(k) : []),
  ],
  canSubmitKpiForApproval: k =>
    ['DRAFT', 'REJECTED'].includes(k.status) && !k.isLocked && !k.isPastDue
      ? owners(k)
      : [],
}

describe('KPI permissions follow the matrix', () => {
  for (const [fn, expected] of Object.entries(EXPECTED)) {
    it(fn, () => {
      for (const k of cases()) {
        const allowed = new Set(expected(k))
        for (const [who, actor] of Object.entries(ACTORS)) {
          assert.equal(
            can[fn](actor, kpiContext(who, k)),
            allowed.has(who),
            `${fn}: ${who} on ${JSON.stringify(k)}`
          )
        }
      }
    })
  }

  it('canDeleteKpi is the same rule as canEditKpi', () => {
    assert.equal(can.canDeleteKpi, can.canEditKpi)
  })

  it('canAddKpi: staff by assignment, students for their startup or themselves', () => {
    const target = (who, founderId = null) => ({
      ventureMentorId: ACTORS.mentor.id,
      isMember: MEMBERS.has(who),
      founderId,
    })
    const allowed = {
      admin: true,
      board: true,
      mentor: true,
      otherMentor: false,
      owner: true,
      teammate: true,
      outsider: false,
    }
    for (const [who, actor] of Object.entries(ACTORS)) {
      assert.equal(can.canAddKpi(actor, target(who)), allowed[who], who)
    }
    // A personal KPI for a teammate would be hidden from its creator.
    assert.equal(
      can.canAddKpi(ACTORS.teammate, target('teammate', ACTORS.owner.id)),
      false
    )
    assert.equal(
      can.canAddKpi(ACTORS.owner, target('owner', ACTORS.owner.id)),
      true
    )
    assert.equal(
      can.canAddKpi(ACTORS.board, target('board', ACTORS.owner.id)),
      true
    )
  })

  it('a mentor of another startup can do nothing to this one', () => {
    for (const k of cases()) {
      const ctx = kpiContext('otherMentor', k)
      for (const fn of Object.keys(EXPECTED)) {
        assert.equal(can[fn](ACTORS.otherMentor, ctx), false, fn)
      }
    }
  })

  it('a mentor id is never matched by a missing assignment', () => {
    const ctx = {
      ...kpiContext('mentor', { status: 'ACCEPTED' }),
      ventureMentorId: null,
    }
    assert.equal(can.canEvaluateKpi(ACTORS.mentor, ctx), false)
    assert.equal(
      can.isMentorOf({ id: undefined, role: 'mentor' }, undefined),
      false
    )
  })
})

describe('startups', () => {
  const expectRead = {
    admin: true,
    board: true,
    mentor: true,
    otherMentor: false,
    owner: true,
    teammate: true,
    outsider: false,
  }
  it('canReadVenture', () => {
    for (const [who, actor] of Object.entries(ACTORS)) {
      const venture = { mentorId: ACTORS.mentor.id, isMember: MEMBERS.has(who) }
      assert.equal(can.canReadVenture(actor, venture), expectRead[who], who)
    }
  })

  it('canManageVentures and canCreateVenture', () => {
    for (const [who, actor] of Object.entries(ACTORS)) {
      const board = who === 'admin' || who === 'board'
      assert.equal(can.canManageVentures(actor), board, who)
      // A mentor may only create a startup assigned to themselves.
      assert.equal(
        can.canCreateVenture(actor, ACTORS.mentor.id),
        board || who === 'mentor',
        who
      )
      assert.equal(can.canCreateVenture(actor, null), board, who)
    }
  })
})

describe('applications', () => {
  it('only students apply; staff review', () => {
    for (const [who, actor] of Object.entries(ACTORS)) {
      const student = ['owner', 'teammate', 'outsider'].includes(who)
      assert.equal(can.canApply(actor), student, who)
      assert.equal(can.canReviewApplication(actor), !student, who)
    }
  })

  it('join requests: the board, or the startup mentor', () => {
    const allowed = new Set(['admin', 'board', 'mentor'])
    for (const [who, actor] of Object.entries(ACTORS)) {
      assert.equal(
        can.canReviewJoinRequest(actor, ACTORS.mentor.id),
        allowed.has(who),
        who
      )
    }
  })

  it('accepting a proposal assigns a mentor', () => {
    assert.equal(can.mustPickMentorToAccept(ACTORS.admin), true)
    assert.equal(can.mustPickMentorToAccept(ACTORS.board), true)
    assert.equal(can.mustPickMentorToAccept(ACTORS.mentor), false)
    assert.equal(can.resolveMentorForAccept(ACTORS.board, 'picked'), 'picked')
    assert.equal(can.resolveMentorForAccept(ACTORS.board, ''), null)
    // A mentor can't hand a startup to someone else.
    assert.equal(
      can.resolveMentorForAccept(ACTORS.mentor, 'picked'),
      ACTORS.mentor.id
    )
    assert.equal(can.resolveMentorForAccept(ACTORS.owner, 'picked'), null)
  })
})

describe('bi-weekly reports', () => {
  it('students of the startup submit; the board and mentor review; the board reopens', () => {
    for (const [who, actor] of Object.entries(ACTORS)) {
      assert.equal(
        can.canSubmitBiweekly(actor, { isMember: MEMBERS.has(who) }),
        MEMBERS.has(who),
        who
      )
      assert.equal(
        can.canAuthorBiweeklyReview(actor, ACTORS.mentor.id),
        ['admin', 'board', 'mentor'].includes(who),
        who
      )
      assert.equal(
        can.canReopenBiweekly(actor),
        ['admin', 'board'].includes(who),
        who
      )
    }
    // A staff member who is somehow a founder still can't submit.
    assert.equal(
      can.canSubmitBiweekly(ACTORS.mentor, { isMember: true }),
      false
    )
  })
})

describe('check-ins', () => {
  it('only the startup mentor manages them; whoever reads the startup reads them', () => {
    for (const [who, actor] of Object.entries(ACTORS)) {
      assert.equal(
        can.canConnectCalendar(actor),
        ['admin', 'mentor', 'otherMentor'].includes(who),
        who
      )
      assert.equal(can.canManageProgramme(actor), who === 'admin', who)
      // A programme meeting run by `otherMentor`, whoever mentors the startup.
      assert.equal(
        can.canRunCheckIn(actor, [ACTORS.otherMentor.id]),
        ['admin', 'otherMentor'].includes(who),
        who
      )
      assert.equal(
        can.canManageCheckIns(actor, ACTORS.mentor.id),
        who === 'mentor',
        who
      )
      assert.equal(
        can.canReadCheckIns(actor, {
          mentorId: ACTORS.mentor.id,
          isMember: MEMBERS.has(who),
        }),
        ['admin', 'board', 'mentor', 'owner', 'teammate'].includes(who),
        who
      )
    }
    assert.equal(can.canManageCheckIns(ACTORS.mentor, null), false)
    // A student listed as staff by mistake still can't run it.
    assert.equal(can.canRunCheckIn(ACTORS.owner, [ACTORS.owner.id]), false)
  })
})

describe('accounts', () => {
  it('only admins manage accounts, never their own', () => {
    for (const [who, actor] of Object.entries(ACTORS)) {
      const admin = who === 'admin'
      assert.equal(can.canManageAccounts(actor), admin, who)
      assert.equal(can.canReadAuditLog(actor), admin, who)
      assert.equal(can.canChangeRoleOf(actor, 'someone-else'), admin, who)
      assert.equal(can.canDeleteAccountOf(actor, 'someone-else'), admin, who)
      assert.equal(can.canChangeRoleOf(actor, actor.id), false, who)
      assert.equal(can.canDeleteAccountOf(actor, actor.id), false, who)
    }
  })
})

describe('role groups', () => {
  it('derives staff, board and admin from the role', () => {
    const table = {
      admin: [true, true, true],
      academic_board: [true, true, false],
      mentor: [true, false, false],
      student: [false, false, false],
      undefined: [false, false, false],
    }
    for (const [role, [staff, board, admin]] of Object.entries(table)) {
      const actor = role === 'undefined' ? null : { id: 'x', role }
      assert.equal(can.isStaff(actor), staff, role)
      assert.equal(can.isBoard(actor), board, role)
      assert.equal(can.isAdmin(actor), admin, role)
    }
  })

  it('has a label for every role', () => {
    for (const role of can.ROLE_NAMES) {
      assert.ok(can.ROLE_LABELS[role], role)
    }
    assert.equal(can.isRole('academic board'), false)
  })
})

describe('kpiLockReason', () => {
  it('explains the strongest lock first', () => {
    assert.match(
      can.kpiLockReason({ status: 'GRADED', isLocked: true, isPastDue: true }),
      /locked/
    )
    assert.match(
      can.kpiLockReason({ status: 'GRADED', isLocked: false }),
      /graded/
    )
    assert.match(
      can.kpiLockReason({ status: 'DRAFT', isPastDue: true }),
      /deadline/
    )
    assert.equal(can.kpiLockReason({ status: 'DRAFT' }), null)
  })
})

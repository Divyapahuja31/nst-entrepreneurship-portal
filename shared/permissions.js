// Who may do what, in one place. The API enforces these rules on data it
// loads itself; the UI uses the same functions only to hide controls a user
// can't use. The matrix they implement is in the README ("Roles and
// permissions"); change both together.
//
// An actor is { id, role }. Ids may be strings or ObjectIds: they are
// compared as strings.

export const ROLES = Object.freeze({
  ADMIN: 'admin',
  ACADEMIC_BOARD: 'academic_board',
  MENTOR: 'mentor',
  STUDENT: 'student',
})

export const ROLE_NAMES = Object.freeze(Object.values(ROLES))

// Everyone who evaluates students, and the subset with final authority.
export const STAFF_ROLES = Object.freeze([
  ROLES.ADMIN,
  ROLES.ACADEMIC_BOARD,
  ROLES.MENTOR,
])
export const BOARD_ROLES = Object.freeze([ROLES.ADMIN, ROLES.ACADEMIC_BOARD])

export const ROLE_LABELS = Object.freeze({
  [ROLES.ADMIN]: 'Admin',
  [ROLES.ACADEMIC_BOARD]: 'Academic Board',
  [ROLES.MENTOR]: 'Mentor',
  [ROLES.STUDENT]: 'Student',
})

// Statuses in which a student may still reshape or delete their KPI. Once
// accepted it is what faculty signed off on, so only staff may change it.
export const EDITABLE_KPI_STATUSES = Object.freeze([
  'DRAFT',
  'WAITING_FOR_APPROVAL',
  'REJECTED',
])

// What a reviewer may change a KPI to from each status. A draft hasn't been
// submitted, so there is nothing to review; a KPI is graded only once it has
// been accepted. Keeping the current status lets rejection feedback or a
// grade be revised.
export const EVALUATION_TRANSITIONS = Object.freeze({
  WAITING_FOR_APPROVAL: ['ACCEPTED', 'REJECTED'],
  REJECTED: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['GRADED'],
  GRADED: ['GRADED'],
})

export const isRole = role => ROLE_NAMES.includes(role)

const sameId = (a, b) =>
  a !== null && a !== undefined && String(a) === String(b)

export const isStudent = actor => actor?.role === ROLES.STUDENT
export const isMentor = actor => actor?.role === ROLES.MENTOR
export const isStaff = actor => STAFF_ROLES.includes(actor?.role)
export const isBoard = actor => BOARD_ROLES.includes(actor?.role)
export const isAdmin = actor => actor?.role === ROLES.ADMIN

// A mentor acting on a startup assigned to them.
export const isMentorOf = (actor, mentorId) =>
  isMentor(actor) && sameId(mentorId, actor.id)

// ---------------------------------------------------------------- startups

// venture: { mentorId, isMember } where isMember says whether the actor is
// an active founder of it.
export const canReadVenture = (actor, { mentorId, isMember }) =>
  isBoard(actor) ||
  isMentorOf(actor, mentorId) ||
  (isStudent(actor) && Boolean(isMember))

// Assign mentors and remove founders.
export const canManageVentures = actor => isBoard(actor)

// mentorId is who the new startup would be assigned to.
export const canCreateVenture = (actor, mentorId) =>
  isBoard(actor) || isMentorOf(actor, mentorId)

// ------------------------------------------------------------------- KPIs
//
// A KPI context is { ventureMentorId, isMember, kpiFounderId, status,
// isLocked, isPastDue }, built from the KPI and its startup.

// A student's own KPI: a startup KPI of their startup, or a personal KPI
// assigned to them.
const ownsKpi = (actor, { isMember, kpiFounderId }) =>
  isStudent(actor) &&
  Boolean(isMember) &&
  (!kpiFounderId || sameId(kpiFounderId, actor.id))

export const canReadKpi = (actor, ctx) =>
  isBoard(actor) ||
  isMentorOf(actor, ctx.ventureMentorId) ||
  ownsKpi(actor, ctx)

// target: { ventureMentorId, isMember, founderId } for the KPI to create;
// students may create personal KPIs only for themselves.
export const canAddKpi = (actor, { ventureMentorId, isMember, founderId }) =>
  isBoard(actor) ||
  isMentorOf(actor, ventureMentorId) ||
  ownsKpi(actor, { isMember, kpiFounderId: founderId })

const studentMayChange = (actor, ctx) =>
  ownsKpi(actor, ctx) &&
  EDITABLE_KPI_STATUSES.includes(ctx.status) &&
  !ctx.isLocked &&
  !ctx.isPastDue

export const canEditKpi = (actor, ctx) =>
  isBoard(actor) ||
  (isMentorOf(actor, ctx.ventureMentorId) && !ctx.isLocked) ||
  studentMayChange(actor, ctx)

export const canDeleteKpi = canEditKpi

export const canSubmitKpiForApproval = (actor, ctx) =>
  ownsKpi(actor, ctx) &&
  ['DRAFT', 'REJECTED'].includes(ctx.status) &&
  !ctx.isLocked &&
  !ctx.isPastDue

// Accept, reject, grade and re-grade. The assigned mentor may revise a grade
// until the KPI is locked; after that only the board may.
export const canEvaluateKpi = (actor, ctx) =>
  isBoard(actor) || (isMentorOf(actor, ctx.ventureMentorId) && !ctx.isLocked)

// Locking makes a grade final, so only a graded KPI can be locked.
export const canLockKpi = (actor, ctx) =>
  !ctx.isLocked &&
  ctx.status === 'GRADED' &&
  (isBoard(actor) || isMentorOf(actor, ctx.ventureMentorId))

export const canUnlockKpi = (actor, ctx) =>
  Boolean(ctx.isLocked) && isBoard(actor)

// Progress and evidence come only from the student whose KPI it is, while it
// is still open: not locked, not graded, not past its due date.
export const canSubmitEvidence = (actor, ctx) =>
  ownsKpi(actor, ctx) &&
  !ctx.isLocked &&
  ctx.status !== 'GRADED' &&
  !ctx.isPastDue

export const canClearEvidence = (actor, ctx) =>
  isBoard(actor) || canSubmitEvidence(actor, ctx)

// Why a student can't change their KPI's progress, or null when they can.
// Shown next to disabled controls.
export const kpiLockReason = ({ status, isLocked, isPastDue }) => {
  if (isLocked) {
    return 'This KPI is locked. Its grade is final.'
  }
  if (status === 'GRADED') {
    return 'KPI has already been graded. Changes and submissions are locked.'
  }
  if (isPastDue) {
    return 'KPI deadline has passed. Submissions and edits are closed.'
  }
  return null
}

// ----------------------------------------------------------- applications

export const canApply = actor => isStudent(actor)

export const canReviewApplication = actor => isStaff(actor)

export const canReviewJoinRequest = (actor, ventureMentorId) =>
  isBoard(actor) || isMentorOf(actor, ventureMentorId)

// The board assigns a mentor when it accepts a proposal; a mentor who
// accepts one becomes its mentor.
export const mustPickMentorToAccept = actor => isBoard(actor)

export const resolveMentorForAccept = (actor, pickedMentorId) => {
  if (isMentor(actor)) {
    return actor.id
  }
  return isBoard(actor) ? pickedMentorId || null : null
}

// ------------------------------------------------------- bi-weekly reports

export const canSubmitBiweekly = (actor, { isMember }) =>
  isStudent(actor) && Boolean(isMember)

// Observations and evaluations of a startup's report.
export const canAuthorBiweeklyReview = (actor, ventureMentorId) =>
  isBoard(actor) || isMentorOf(actor, ventureMentorId)

// Reopening a submitted report unlocks it for the students.
export const canReopenBiweekly = actor => isBoard(actor)

// -------------------------------------------------------------- check-ins

// Check-ins are events on the mentor's own Google Calendar, so only mentors
// connect a calendar, and only the startup's mentor schedules, moves or
// cancels its check-ins and writes their notes.
export const canConnectCalendar = actor => isMentor(actor)

export const canManageCheckIns = (actor, ventureMentorId) =>
  isMentorOf(actor, ventureMentorId)

// Check-ins and their transcripts are part of the startup's record.
export const canReadCheckIns = canReadVenture

// --------------------------------------------------------------- accounts

export const canManageAccounts = actor => isAdmin(actor)

export const canReadAuditLog = actor => isAdmin(actor)

// No one changes or deactivates their own account, so an admin can't lock
// themselves out.
export const canChangeRoleOf = (actor, targetId) =>
  isAdmin(actor) && !sameId(targetId, actor.id)

export const canDeleteAccountOf = (actor, targetId) =>
  isAdmin(actor) && !sameId(targetId, actor.id)

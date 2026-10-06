import mongoose from 'mongoose'
import { ROLES } from '@nst/shared/permissions.js'
import Founder from '../models/founder.js'
import KPI from '../models/kpi.js'
import Role from '../models/role.js'
import User from '../models/user.js'
import { LOW_PERCENT, escalationsFor, percentageOf } from './kpiEscalation.js'
import {
  sendBoardLowScore,
  sendMentorFollowUp,
  sendMentorLowScore,
  sendStudentResult,
} from './emailService.js'

// The emails sent once a KPI's grade is locked: the result to its students
// and, after a run of poor grades, an alert to the mentor or the academic
// board. Started by the lock route (controllers/kpi.js), which has already
// checked that the caller may lock the KPI.

const TOTAL_MARKS = 100
const UNASSIGNED = 'Unassigned'
const NOT_RECORDED = 'Not recorded'

// Where links in emails point: APP_URL, else the frontend the API serves.
export const appUrl = () =>
  (process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173')
    .trim()
    .replace(/\/+$/, '')

const STUDENT_FIELDS = 'username email batch deletedAt'
const withBatch = { path: 'batch', select: 'name' }

// Whose grade it is: the founder of a personal KPI, or every active founder
// of the startup for a startup-wide one.
const findStudents = async kpi => {
  if (kpi.founder) {
    const founder = await User.findOne({ _id: kpi.founder, deletedAt: null })
      .select(STUDENT_FIELDS)
      .populate(withBatch)
      .lean()
    return founder ? [founder] : []
  }
  const founders = await Founder.find({
    venture: kpi.venture._id,
    status: 'ACTIVE',
  })
    .populate({ path: 'user', select: STUDENT_FIELDS, populate: withBatch })
    .lean()
  return founders
    .map(({ user }) => user)
    .filter(user => user && !user.deletedAt)
}

// The startup's own mentor, or null. Never someone else's mentor.
const findMentor = venture =>
  venture.mentor && mongoose.isValidObjectId(venture.mentor)
    ? User.findOne({ _id: venture.mentor, deletedAt: null })
        .select('username email')
        .lean()
    : null

const findBoard = async () => {
  const role = await Role.findOne({ name: ROLES.ACADEMIC_BOARD }).lean()
  return role
    ? User.find({ role: role._id, deletedAt: null })
        .select('username email')
        .lean()
    : []
}

// The run this KPI belongs to: the startup's locked grades about the same
// founder, or about the startup as a whole. One founder's grades never
// count towards another's alert.
const findRun = kpi =>
  KPI.find({
    venture: kpi.venture._id,
    founder: kpi.founder ?? null,
    isLocked: true,
    status: 'GRADED',
  })
    .select('score dueDate lockedAt evaluationDate createdAt')
    .lean()

const listOr = (values, fallback) =>
  [...new Set(values.filter(Boolean))].join(', ') || fallback

// What every email about this grade says.
const describe = ({ kpi, students, mentor }) => {
  const venture = kpi.venture
  const founder = kpi.founder ? students[0] : null
  return {
    dedupeKey: `kpi:${kpi._id}`,
    result: {
      score: kpi.score,
      totalMarks: TOTAL_MARKS,
      percentage: percentageOf(kpi.score, TOTAL_MARKS),
      evaluationName: kpi.title,
      ventureName: venture.name,
    },
    staff: {
      studentName: founder?.username || venture.name,
      studentEmail: listOr(
        students.map(student => student.email),
        NOT_RECORDED
      ),
      batch: listOr(
        students.map(student => student.batch?.name),
        NOT_RECORDED
      ),
      mentorName: mentor ? mentor.username || mentor.email : UNASSIGNED,
      dashboardUrl: `${appUrl()}/admin/venture/${venture._id}`,
    },
  }
}

const recipient = user => ({ email: user.email, userId: user._id })

// Sends to everyone even if some fail, and returns how many failed.
const sendAll = async (label, sends) => {
  const results = await Promise.allSettled(sends)
  const failed = results.filter(result => result.status === 'rejected')
  for (const { reason } of failed) {
    console.error(`KPI emails, ${label}:`, reason?.message ?? reason)
  }
  return failed.length
}

const emailStudents = (about, students, kpiId) => {
  if (!students.length) {
    console.warn(`KPI emails: no student email found for KPI ${kpiId}`)
    return 0
  }
  return sendAll(
    'student result',
    students.map(student =>
      sendStudentResult({
        recipient: recipient(student),
        dedupeKey: about.dedupeKey,
        ...about.result,
        studentName: student.username,
        dashboardUrl: `${appUrl()}/kpis`,
      })
    )
  )
}

const emailBoard = (about, board, send = sendBoardLowScore) => {
  if (!board.length) {
    console.warn('KPI emails: an alert is due but there is no academic board')
    return 0
  }
  return sendAll(
    'board alert',
    board.map(member =>
      send({
        recipient: recipient(member),
        dedupeKey: about.dedupeKey,
        ...about.result,
        ...about.staff,
      })
    )
  )
}

// Without a mentor the board is told instead. A low score then goes out as
// the board's own alert under the same key, so a member who already got that
// alert for this KPI isn't emailed twice.
const emailMentor = (about, mentor, board) => {
  const low = about.result.percentage <= LOW_PERCENT
  if (!mentor) {
    return emailBoard(
      about,
      board,
      low ? sendBoardLowScore : sendMentorFollowUp
    )
  }
  const send = low ? sendMentorLowScore : sendMentorFollowUp
  return sendAll('mentor alert', [
    send({
      recipient: recipient(mentor),
      dedupeKey: about.dedupeKey,
      ...about.result,
      ...about.staff,
    }),
  ])
}

// The board goes first so a redirected mentor alert can skip anyone it has
// just reached. Returns how many emails failed.
const escalate = async (about, due, mentor) => {
  if (!due.board && !due.mentor) {
    return 0
  }
  const board = await findBoard()
  const boardFailed = due.board ? await emailBoard(about, board) : 0
  const mentorFailed = due.mentor ? await emailMentor(about, mentor, board) : 0
  return boardFailed + mentorFailed
}

// Sends every email a newly locked KPI calls for. Never throws: a failed
// email is logged and the rest still go. Returns { success, error? }.
export const sendLockedKpiEmails = async kpiId => {
  try {
    const kpi = await KPI.findById(kpiId).populate('venture', 'name mentor')
    if (!kpi?.isLocked || kpi.status !== 'GRADED' || !kpi.venture) {
      return { success: false, error: 'The KPI is not locked and graded' }
    }
    const [students, mentor, run] = await Promise.all([
      findStudents(kpi),
      findMentor(kpi.venture),
      findRun(kpi),
    ])
    const about = describe({ kpi, students, mentor })

    const failed =
      (await emailStudents(about, students, kpi._id)) +
      (await escalate(about, escalationsFor(run, kpi._id), mentor))
    return failed
      ? { success: false, error: `${failed} email(s) could not be sent` }
      : { success: true }
  } catch (error) {
    console.error(`KPI emails for ${kpiId} failed:`, error)
    return { success: false, error: error.message }
  }
}

const inFlight = new Set()

// Starts the emails without holding up the lock request.
export const queueLockedKpiEmails = kpiId => {
  const job = sendLockedKpiEmails(kpiId)
    .then(({ success, error }) => {
      if (!success) {
        console.error(`KPI emails for ${kpiId}: ${error}`)
      }
    })
    .finally(() => inFlight.delete(job))
  inFlight.add(job)
}

// Resolves once every queued job has finished, for tests and shutdown.
export const settleEmailJobs = () => Promise.allSettled([...inFlight])

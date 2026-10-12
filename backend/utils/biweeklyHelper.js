import mongoose from 'mongoose'
import { isStaff, isStudent } from '@nst/shared/permissions.js'
import { CYCLES, cycleStart } from '@nst/shared/biweeklyCycles.js'
import User from '../models/user.js'
import Venture from '../models/venture.js'
import Founder from '../models/founder.js'
import BiWeeklySubmission from '../models/biWeeklySubmission.js'
import { findVentureForUser } from './founderHelper.js'

// The only fields a student may write on a submission. Everything else
// (evaluation and observation links, submitter, the cycle key) is set by
// the server or by faculty; accepting it from the body let students swap in
// another venture's grade or move a submission out from under its lock.
const STUDENT_SUBMISSION_FIELDS = [
  'progress_summary',
  'wins',
  'blockers',
  'hours_worked',
  'customer_interviews',
  'features_shipped',
  'revenue',
  'users_acquired',
  'experiments_run',
  'mentor_meeting_date',
  'mentor_meeting_notes',
  'goals_next_cycle',
  'ask_for_help',
  'evidence_links',
]

export const pickStudentSubmissionFields = body =>
  Object.fromEntries(
    STUDENT_SUBMISSION_FIELDS.filter(field => body[field] !== undefined).map(
      field => [field, body[field]]
    )
  )

export const validateCycleNumber = n => {
  const num = Number(n)
  return Number.isInteger(num) && num >= 1 && num <= CYCLES ? num : null
}

const MAX_EVIDENCE_LINKS = 20
const DAY_MS = 24 * 60 * 60 * 1000

// Evidence URLs are typed by students and shown to faculty as links, so only
// web addresses are kept: no javascript:, data: or other schemes.
const isWebUrl = value => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

const isValidEvidenceLink = link =>
  link !== null &&
  typeof link === 'object' &&
  (link.url === undefined ||
    link.url === '' ||
    (typeof link.url === 'string' && isWebUrl(link.url.trim())))

// Returns an error message, or null when the evidence links are acceptable.
export const validateEvidenceLinks = links => {
  if (links === undefined) {
    return null
  }
  if (!Array.isArray(links) || links.length > MAX_EVIDENCE_LINKS) {
    return `Add at most ${MAX_EVIDENCE_LINKS} evidence links`
  }
  if (!links.every(isValidEvidenceLink)) {
    return 'Evidence links must be web addresses starting with http:// or https://'
  }
  return null
}

// Cycles open every 14 days from the venture's creation, as on the bi-weekly
// page. A day of slack covers the student's time zone.
export const hasCycleStarted = (ventureCreatedAt, cycleNum, now = Date.now()) =>
  cycleStart(ventureCreatedAt, cycleNum).getTime() - DAY_MS <= now

// Checks a student's submit or save request. Returns { error } or the
// cleaned { cycleNum, data, isSubmit }.
export const parseStudentSubmission = body => {
  const cycleNum = validateCycleNumber(body.cycle_number)
  if (!cycleNum) {
    return { error: 'Invalid cycle number (1-13)' }
  }

  const data = pickStudentSubmissionFields(body)
  const linkError = validateEvidenceLinks(data.evidence_links)
  if (linkError) {
    return { error: linkError }
  }

  // Only a real `true` submits and locks the cycle; "false" must not.
  return { cycleNum, data, isSubmit: body.isSubmit === true }
}

const SCORE_FIELDS = [
  'execution_score',
  'customer_score',
  'business_score',
  'behavior_score',
]

// Returns { error } or { scores } with each pillar a number from 0 to 100.
// Pillars left out keep their current value.
export const parseEvaluationScores = body => {
  const scores = {}
  for (const field of SCORE_FIELDS) {
    const value = body[field]
    if (value === undefined) {
      continue
    }
    if (typeof value !== 'number' || !(value >= 0 && value <= 100)) {
      return { error: 'Each pillar score must be a number from 0 to 100' }
    }
    scores[field] = value
  }
  return { scores }
}

const OBSERVATION_TEXT_FIELDS = [
  'observation',
  'strengths',
  'concerns',
  'action_items',
]

// Returns { error } or the observation fields from the body.
export const parseObservation = body => {
  const fields = {}
  for (const field of OBSERVATION_TEXT_FIELDS) {
    if (body[field] === undefined) {
      continue
    }
    if (typeof body[field] !== 'string') {
      return { error: `${field} must be text` }
    }
    fields[field] = body[field]
  }

  const reviewed = body.evidence_reviewed
  if (reviewed !== undefined) {
    const valid =
      Array.isArray(reviewed) &&
      reviewed.length <= MAX_EVIDENCE_LINKS &&
      reviewed.every(i => Number.isInteger(i) && i >= 0)
    if (!valid) {
      return { error: 'evidence_reviewed must list evidence link positions' }
    }
    fields.evidence_reviewed = reviewed
  }

  return { fields }
}

// The key a startup's report for a cycle is stored under.
export const ventureCycleKey = (ventureId, cycleNumber) =>
  `venture_${ventureId}_cycle_${cycleNumber}`

const findVentureById = ventureId =>
  mongoose.isValidObjectId(ventureId)
    ? Venture.findById(ventureId).populate('campus industry').exec()
    : null

export const findCoFounders = async ventureId => {
  if (!ventureId) {
    return []
  }
  const founderRecords = await Founder.find({
    venture: ventureId,
    status: 'ACTIVE',
  })
    .populate('user', 'username email')
    .exec()

  return founderRecords.map(r => r.user).filter(Boolean)
}

// Only what the bi-weekly page shows; not role, batch or Google IDs.
const findFounder = founderId =>
  mongoose.isValidObjectId(founderId)
    ? User.findById(founderId).select('username email createdAt').exec()
    : null

// Whose reports to show. Reports belong to a startup: students always get
// their own startup's; staff name a startup, or a founder to get the startup
// they are in now (for the founder profile page).
export const resolveVentureAndContext = async (user, query = {}) => {
  let founder = null
  let venture = null
  if (isStudent(user)) {
    venture = await findVentureForUser(user.id)
  } else if (isStaff(user) && query.ventureId) {
    venture = await findVentureById(query.ventureId)
  } else if (isStaff(user) && query.founderId) {
    founder = await findFounder(query.founderId)
    venture = founder ? await findVentureForUser(founder._id) : null
  }
  const coFounders = await findCoFounders(venture?._id)
  return { venture, founder, coFounders }
}

export const loadVentureSubmissions = ventureId =>
  BiWeeklySubmission.find({ venture: ventureId })
    .populate('biWeeklyEvaluation')
    .populate('biWeeklyObservationSchema')
    .populate('submitted_by', 'username email')
    .sort({ cycle_number: 1 })
    .exec()

export const updateOrCreateVentureSubmission = async ({
  ventureId,
  userId,
  cycle_number,
  data = {},
  isSubmit = false,
}) => {
  const updateData = { ...data, cycle_number, venture: ventureId }

  if (isSubmit) {
    updateData.submitted_at = new Date()
    if (userId) {
      updateData.submitted_by = userId
    }
  }

  const updateQuery = { $set: updateData }
  if (userId && !isSubmit) {
    updateQuery.$setOnInsert = { submitted_by: userId }
  }

  return BiWeeklySubmission.findOneAndUpdate(
    { custom_id: ventureCycleKey(ventureId, cycle_number) },
    updateQuery,
    {
      upsert: true,
      returnDocument: 'after',
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  )
}

// The startup staff named in a review or reopen request.
export const findTargetVenture = ventureId =>
  mongoose.isValidObjectId(ventureId) ? Venture.findById(ventureId) : null

import mongoose from 'mongoose'
import { canAddKpi, isStudent } from '@nst/shared/permissions.js'

import Founder from '../models/founder.js'
import KPI from '../models/kpi.js'
import KpiRecommendation from '../models/kpiRecommendation.js'
import { isPastDue, isVentureMember, ventureAccess } from '../utils/access.js'
import { findVentureForUser } from '../utils/founderHelper.js'

// The KPIs the bot recommends (utils/kpiBot.js). Whoever may add a KPI for
// a founder sees that founder's recommendations and accepts or dismisses
// them: the founder, the startup's mentors and the academic board.

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message })

const PENDING = 'PENDING'

const listFor = filter =>
  KpiRecommendation.find({ ...filter, status: PENDING })
    .select('-__v')
    .populate('founder', 'username email')
    .sort({ meetingDate: -1, createdAt: 1 })

// A student's own recommendations, for the startup they are in now.
const listForStudent = async (req, res) => {
  const venture = await findVentureForUser(req.user.id)
  const data = venture
    ? await listFor({ venture: venture._id, founder: req.user.id })
    : []
  return res.json({ success: true, data })
}

// A startup's recommendations, for its mentors and the board. A founder who
// has left no longer gets theirs.
const listForVenture = async (req, res, ventureId) => {
  if (!mongoose.isValidObjectId(ventureId)) {
    return fail(res, 400, 'Valid ventureId is required')
  }
  const { venture, mentorIds } = await ventureAccess(req.user, ventureId)
  if (!venture) {
    return fail(res, 404, 'Venture not found')
  }
  if (
    !canAddKpi(req.user, {
      ventureMentorIds: mentorIds,
      isMember: false,
      founderId: null,
    })
  ) {
    return fail(res, 403, 'This startup is not assigned to you')
  }
  const founders = await Founder.find({
    venture: venture._id,
    status: 'ACTIVE',
  }).distinct('user')
  return res.json({
    success: true,
    data: await listFor({ venture: venture._id, founder: { $in: founders } }),
  })
}

export const listRecommendations = async (req, res) => {
  try {
    if (isStudent(req.user)) {
      return await listForStudent(req, res)
    }
    return await listForVenture(req, res, req.query.ventureId)
  } catch (error) {
    console.error('List KPI recommendations error:', error)
    return fail(res, 500, 'Failed to fetch recommended KPIs')
  }
}

// The pending recommendation in the URL, if the caller may decide it.
// Sends the error response and returns null otherwise.
const findDecidable = async (req, res) => {
  const { id } = req.params
  if (!mongoose.isValidObjectId(id)) {
    fail(res, 400, 'Valid recommendation id is required')
    return null
  }
  const recommendation = await KpiRecommendation.findById(id)
  if (!recommendation) {
    fail(res, 404, 'Recommendation not found')
    return null
  }
  const { venture, mentorIds, isMember } = await ventureAccess(
    req.user,
    recommendation.venture
  )
  if (
    !venture ||
    !canAddKpi(req.user, {
      ventureMentorIds: mentorIds,
      isMember,
      founderId: recommendation.founder,
    })
  ) {
    fail(res, 403, 'You cannot decide this recommendation')
    return null
  }
  if (recommendation.status !== PENDING) {
    fail(
      res,
      409,
      `This recommendation was already ${recommendation.status.toLowerCase()}`
    )
    return null
  }
  if (!(await isVentureMember(recommendation.founder, venture._id))) {
    fail(res, 409, 'This founder is no longer part of the startup')
    return null
  }
  return recommendation
}

// Marks it decided, if no one else has in the meantime. Returns whether
// this call did.
const decide = async (recommendation, status, userId) =>
  Boolean(
    await KpiRecommendation.findOneAndUpdate(
      { _id: recommendation._id, status: PENDING },
      { $set: { status, decidedBy: userId, decidedAt: new Date() } }
    )
  )

const kpiFrom = (recommendation, userId) => ({
  _id: recommendation._id,
  title: recommendation.title,
  description: recommendation.description,
  targetValue: recommendation.targetValue,
  dueDate: recommendation.dueDate,
  scope: 'FOUNDER',
  founder: recommendation.founder,
  venture: recommendation.venture,
  createdBy: userId,
  status: 'DRAFT',
})

// Turns a recommendation into the founder's draft KPI, with the same id, so
// two clicks never make two KPIs.
export const acceptRecommendation = async (req, res) => {
  try {
    const recommendation = await findDecidable(req, res)
    if (!recommendation) {
      return null
    }
    if (isPastDue(recommendation.dueDate)) {
      return fail(res, 409, 'Its due date has passed. Add it as a new KPI.')
    }
    const doc = kpiFrom(recommendation, req.user.id)
    await new KPI(doc).validate()
    if (!(await decide(recommendation, 'ACCEPTED', req.user.id))) {
      return fail(res, 409, 'This recommendation was already decided')
    }
    try {
      await KPI.updateOne(
        { _id: doc._id },
        { $setOnInsert: doc },
        { upsert: true, setDefaultsOnInsert: true }
      )
    } catch (error) {
      await KpiRecommendation.updateOne(
        { _id: recommendation._id },
        { $set: { status: PENDING, decidedBy: null, decidedAt: null } }
      )
      throw error
    }
    const kpi = await KPI.findById(doc._id).populate(
      'founder',
      'username email'
    )
    return res.status(201).json({
      success: true,
      message: 'KPI added',
      data: kpi,
    })
  } catch (error) {
    console.error('Accept KPI recommendation error:', error)
    return fail(res, 500, 'Failed to add the KPI')
  }
}

export const dismissRecommendation = async (req, res) => {
  try {
    const recommendation = await findDecidable(req, res)
    if (!recommendation) {
      return null
    }
    if (!(await decide(recommendation, 'DISMISSED', req.user.id))) {
      return fail(res, 409, 'This recommendation was already decided')
    }
    return res.json({ success: true, message: 'Recommendation dismissed' })
  } catch (error) {
    console.error('Dismiss KPI recommendation error:', error)
    return fail(res, 500, 'Failed to dismiss the recommendation')
  }
}

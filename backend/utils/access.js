import mongoose from 'mongoose'
import {
  ROLES,
  isBoard,
  isMentor,
  isStudent,
  mustPickMentorToAccept,
  resolveMentorForAccept,
} from '@nst/shared/permissions.js'

import Batch from '../models/batch.js'
import Founder from '../models/founder.js'
import User from '../models/user.js'
import Venture from '../models/venture.js'

// What the shared permission rules need to know, built only from the
// database, never from the request body.

// The startups a staff member may see: every one for the board, the ones
// assigned to a mentor, none for anyone else.
export const ventureScope = actor => {
  if (isBoard(actor)) {
    return {}
  }
  if (isMentor(actor)) {
    return { mentors: actor.id }
  }
  return { _id: { $in: [] } }
}

// The ids of the startups in scope, or null when every startup is.
export const scopedVentureIds = async actor =>
  isBoard(actor) ? null : Venture.find(ventureScope(actor)).distinct('_id')

// ---------------------------------------------------------- batch filter
// Staff lists can be narrowed to one batch with ?batch=<id>. A startup is in
// every batch that has an active founder on it. The batch only ever narrows
// what the caller may already see.

export const BATCH_GONE = 'That batch no longer exists'

// The batch in the query and its students' ids, { batch: null } when there
// is none, or { error } when it doesn't name a batch.
export const readBatch = async query => {
  const id = query?.batch
  if (id === undefined || id === '') {
    return { batch: null, userIds: null }
  }
  const batch =
    typeof id === 'string' && mongoose.isValidObjectId(id)
      ? await Batch.findById(id).select('_id')
      : null
  if (!batch) {
    return { error: BATCH_GONE }
  }
  const userIds = await User.find({ batch: batch._id }).distinct('_id')
  return { batch: batch._id, userIds }
}

// What a staff list may show: `scope` (a Venture filter), `ventureIds` (null
// for every startup), and the batch and its students' ids (null for every
// batch). Or { error } for a batch that doesn't exist.
export const listScope = async (actor, query) => {
  const { batch, userIds, error } = await readBatch(query)
  if (error) {
    return { error }
  }
  if (!batch) {
    return {
      batchId: null,
      batchUserIds: null,
      scope: ventureScope(actor),
      ventureIds: await scopedVentureIds(actor),
    }
  }
  const inBatch = await Founder.find({
    user: { $in: userIds },
    status: 'ACTIVE',
  }).distinct('venture')
  const scope = { $and: [ventureScope(actor), { _id: { $in: inBatch } }] }
  return {
    batchId: batch,
    batchUserIds: userIds,
    scope,
    ventureIds: await Venture.find(scope).distinct('_id'),
  }
}

// A filter on records made by a student (a proposal's submittedBy, a join
// request's requestedBy) for the batch's students; {} for every batch.
export const byBatchStudent = (field, batchUserIds) =>
  batchUserIds ? { [field]: { $in: batchUserIds } } : {}

// KPIs in a batch: a startup's own KPIs, and members' KPIs only when the
// member is in the batch. {} for every batch.
export const kpisInBatch = batchUserIds =>
  batchUserIds
    ? { $or: [{ founder: null }, { founder: { $in: batchUserIds } }] }
    : {}

export const isVentureMember = async (userId, ventureId) =>
  Boolean(
    await Founder.exists({ user: userId, venture: ventureId, status: 'ACTIVE' })
  )

const idOf = value => value?._id ?? value ?? null

// The startup (with its mentors) and whether the caller is one of its
// founders. venture is null when it doesn't exist.
export const ventureAccess = async (actor, ventureOrId) => {
  const ventureId = idOf(ventureOrId)
  const venture = mongoose.isValidObjectId(ventureId)
    ? await Venture.findById(ventureId).select('mentors')
    : null
  const isMember =
    Boolean(venture) &&
    isStudent(actor) &&
    (await isVentureMember(actor.id, venture._id))
  return { venture, mentorIds: venture?.mentors ?? [], isMember }
}

export const isPastDue = (dueDate, now = Date.now()) =>
  Boolean(dueDate) && new Date(dueDate).getTime() < now

// The KPI context the shared can*Kpi rules take.
export const kpiContext = async (actor, kpi) => {
  const { mentorIds, isMember } = await ventureAccess(actor, kpi.venture)
  return {
    ventureMentorIds: mentorIds,
    isMember,
    kpiFounderId: idOf(kpi.founder),
    status: kpi.status,
    isLocked: Boolean(kpi.isLocked),
    isPastDue: isPastDue(kpi.dueDate),
  }
}

// Whether mentorId is an active account with the mentor role, so a startup
// can be assigned to it.
export const isActiveMentor = async mentorId => {
  if (!mongoose.isValidObjectId(mentorId)) {
    return false
  }
  const user = await User.findOne({ _id: mentorId, deletedAt: null })
    .select('role')
    .populate('role', 'name')
  return user?.role?.name === ROLES.MENTOR
}

// The mentor a new startup gets when this caller creates it: themselves for
// a mentor, the one picked for the board. Returns { mentorId } or { error }.
export const resolveNewVentureMentor = async (actor, pickedMentorId) => {
  const mentorId = resolveMentorForAccept(actor, pickedMentorId)
  if (!mentorId) {
    return mustPickMentorToAccept(actor)
      ? { error: 'Choose a mentor for this startup' }
      : { error: 'You are not authorized to create a startup' }
  }
  if (!(await isActiveMentor(mentorId))) {
    return { error: 'Choose an active mentor account' }
  }
  return { mentorId }
}

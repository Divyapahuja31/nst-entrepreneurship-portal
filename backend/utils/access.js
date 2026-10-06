import mongoose from 'mongoose'
import {
  ROLES,
  isBoard,
  isMentor,
  isStudent,
  mustPickMentorToAccept,
  resolveMentorForAccept,
} from '@nst/shared/permissions.js'

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
    return { mentor: actor.id }
  }
  return { _id: { $in: [] } }
}

// The ids of the startups in scope, or null when every startup is.
export const scopedVentureIds = async actor =>
  isBoard(actor) ? null : Venture.find(ventureScope(actor)).distinct('_id')

export const isVentureMember = async (userId, ventureId) =>
  Boolean(
    await Founder.exists({ user: userId, venture: ventureId, status: 'ACTIVE' })
  )

const idOf = value => value?._id ?? value ?? null

// The startup (with its mentor) and whether the caller is one of its
// founders. venture is null when it doesn't exist.
export const ventureAccess = async (actor, ventureOrId) => {
  const ventureId = idOf(ventureOrId)
  const venture = mongoose.isValidObjectId(ventureId)
    ? await Venture.findById(ventureId).select('mentor')
    : null
  const isMember =
    Boolean(venture) &&
    isStudent(actor) &&
    (await isVentureMember(actor.id, venture._id))
  return { venture, mentorId: venture?.mentor ?? null, isMember }
}

export const isPastDue = (dueDate, now = Date.now()) =>
  Boolean(dueDate) && new Date(dueDate).getTime() < now

// The KPI context the shared can*Kpi rules take.
export const kpiContext = async (actor, kpi) => {
  const { mentorId, isMember } = await ventureAccess(actor, kpi.venture)
  return {
    ventureMentorId: mentorId,
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

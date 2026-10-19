import mongoose from 'mongoose'
import {
  canManageVentures,
  canReadVenture,
  isStudent,
  ROLES,
} from '@nst/shared/permissions.js'

import Founder from '../models/founder.js'
import Venture from '../models/venture.js'
import VentureJoinRequest from '../models/ventureJoinRequest.js'
import startupStage from '../models/enums/startupStage.js'
import User from '../models/user.js'
import Role from '../models/role.js'
import { findVentureForUser } from '../utils/founderHelper.js'
import { isActiveMentor, ventureAccess, ventureScope } from '../utils/access.js'
import { cancelFutureCheckIns } from '../utils/checkInHelper.js'

// Readable label ("Fund Raising"), not the stored key.
const stageLabel = stage => startupStage[stage] ?? stage

const mentorSummary = mentor =>
  mentor
    ? { id: mentor._id, username: mentor.username, email: mentor.email }
    : null

// A startup's mentors, leaving out any account since deleted.
const mentorSummaries = mentors =>
  (mentors ?? []).filter(mentor => mentor?._id).map(mentorSummary)

// Students get every startup, to choose one to join. Staff get the startups
// they may review, with their mentors.
export const getVentures = async (req, res) => {
  try {
    const data = await Venture.find(
      isStudent(req.user) ? {} : ventureScope(req.user)
    )
      .select('_id name campus stage industry mentors')
      .populate([
        { path: 'campus', select: 'name' },
        { path: 'industry', select: 'name' },
        { path: 'founders', populate: { path: 'user', select: 'username' } },
        ...(isStudent(req.user)
          ? []
          : [{ path: 'mentors', select: 'username email' }]),
      ])

    const venture = data.map(data => {
      const founders = data.founders
        .map(founder => founder.user)
        .filter(Boolean)

      return {
        id: data._id,
        name: data.name,
        campus: data.campus?.name || '-',
        stage: stageLabel(data.stage) ?? '-',
        industry: data.industry?.name || '-',
        founders: founders.map(founder => founder.username).join(', ') || '-',
        team: founders.length,
        ...(isStudent(req.user)
          ? {}
          : { mentors: mentorSummaries(data.mentors) }),
      }
    })

    return res.status(200).json(venture)
  } catch (error) {
    console.error('Error fetching venture:', error)

    return res.status(500).json({
      error: 'Could not fetch venture',
    })
  }
}

const ventureDetail = venture => ({
  id: venture._id,
  name: venture.name,
  description: venture.description || null,
  campus: venture.campus?.name || null,
  industry: venture.industry?.name || null,
  stage: stageLabel(venture.stage),
  website: venture.website || null,
  createdAt: venture.createdAt,
  mentors: mentorSummaries(venture.mentors),
})

export const getVentureById = async (req, res) => {
  try {
    const { ventureId } = req.params

    if (!mongoose.isValidObjectId(ventureId)) {
      return res.status(400).json({ error: 'Valid ventureId is required' })
    }

    const access = await ventureAccess(req.user, ventureId)
    if (access.venture && !canReadVenture(req.user, access)) {
      return res
        .status(403)
        .json({ error: 'This startup is not assigned to you' })
    }

    const venture = await Venture.findById(ventureId)
      .populate([
        { path: 'campus', select: 'name' },
        { path: 'industry', select: 'name' },
        { path: 'mentors', select: 'username email' },
      ])
      .populate({
        path: 'founders',
        populate: { path: 'user', select: 'username email' },
      })

    if (!venture) {
      return res.status(404).json({ error: 'Venture not found' })
    }

    const pastFounders = await Founder.find({
      venture: ventureId,
      status: 'INACTIVE',
    }).populate('user', 'username email')

    return res.status(200).json({
      venture: ventureDetail(venture),
      founders: venture.founders
        .filter(founder => founder.user)
        .map(founder => ({
          id: founder.user._id,
          username: founder.user.username,
          email: founder.user.email,
          joinedAt: founder.joinedAt,
        })),
      pastFounders: pastFounders
        .filter(founder => founder.user)
        .map(founder => ({
          id: founder.user._id,
          username: founder.user.username,
          email: founder.user.email,
          joinedAt: founder.joinedAt,
          leftAt: founder.leftAt,
        })),
    })
  } catch (error) {
    console.error('Error fetching venture:', error)

    return res.status(500).json({
      error: 'Could not fetch venture',
    })
  }
}

export const getMyJoinRequest = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const joinRequest = await VentureJoinRequest.findOne({
      requestedBy: req.user.id,
    })
      .sort({ createdAt: -1 })
      .populate('venture', 'name')

    return res.status(200).json({
      joinRequest: joinRequest || null,
    })
  } catch (error) {
    console.error('Error fetching join request:', error)

    return res.status(500).json({
      error: 'Could not fetch join request',
    })
  }
}

export const createJoinRequest = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { ventureId } = req.params
    const message =
      typeof req.body.message === 'string' ? req.body.message.trim() : ''

    if (!mongoose.isValidObjectId(ventureId)) {
      return res.status(400).json({ error: 'Valid ventureId is required' })
    }

    const venture = await Venture.findById(ventureId)
    if (!venture) {
      return res.status(404).json({ error: 'Venture not found' })
    }

    const currentVenture = await findVentureForUser(req.user.id)
    if (currentVenture) {
      return res.status(409).json({
        error: 'You are already part of a venture',
      })
    }

    const existingRequest = await VentureJoinRequest.findOne({
      requestedBy: req.user.id,
      status: 'PENDING',
    })

    if (existingRequest) {
      return res.status(409).json({
        error: 'You already have a pending request to join a venture',
      })
    }

    const joinRequest = await VentureJoinRequest.findOneAndUpdate(
      { venture: ventureId, requestedBy: req.user.id },
      {
        venture: ventureId,
        requestedBy: req.user.id,
        message,
        status: 'PENDING',
        $unset: { reviewedBy: '', reviewedAt: '' },
      },
      { returnDocument: 'after', upsert: true }
    ).populate('venture', 'name')

    return res.status(201).json({ joinRequest })
  } catch (error) {
    console.error('Error creating join request:', error)

    return res.status(500).json({
      error: 'Could not submit join request',
    })
  }
}

// Active mentor accounts, for choosing who mentors a startup.
export const getMentors = async (req, res) => {
  try {
    const mentorRole = await Role.findOne({ name: ROLES.MENTOR }).select('_id')
    const mentors = mentorRole
      ? await User.find({ role: mentorRole._id, deletedAt: null })
          .select('username email')
          .sort({ username: 1 })
      : []
    return res.status(200).json({ mentors: mentors.map(mentorSummary) })
  } catch (error) {
    console.error('Error fetching mentors:', error)
    return res.status(500).json({ error: 'Could not fetch mentors' })
  }
}

// Sets who mentors a startup: mentorIds is the whole list, possibly
// empty. Board only.
export const setVentureMentors = async (req, res) => {
  try {
    const { ventureId } = req.params
    const { mentorIds } = req.body ?? {}

    if (!canManageVentures(req.user)) {
      return res
        .status(403)
        .json({ error: 'Only the academic board can assign mentors' })
    }
    if (!mongoose.isValidObjectId(ventureId)) {
      return res.status(400).json({ error: 'Valid ventureId is required' })
    }
    if (!Array.isArray(mentorIds)) {
      return res.status(400).json({ error: 'mentorIds must be a list' })
    }
    const ids = [...new Set(mentorIds.map(String))]
    for (const id of ids) {
      if (!(await isActiveMentor(id))) {
        return res
          .status(400)
          .json({ error: 'Choose active mentor accounts only' })
      }
    }

    const previous = await Venture.findByIdAndUpdate(ventureId, {
      $set: { mentors: ids },
    }).select('mentors')
    if (!previous) {
      return res.status(404).json({ error: 'Venture not found' })
    }
    // A mentor's check-ins live on their own calendar; those of a mentor
    // taken off the startup are cancelled. The others' stay.
    const removed = previous.mentors.filter(id => !ids.includes(String(id)))
    if (removed.length) {
      await cancelFutureCheckIns({
        venture: previous._id,
        mentor: { $in: removed },
      })
    }
    const venture = await Venture.findById(ventureId).populate(
      'mentors',
      'username email'
    )

    return res.status(200).json({ mentors: mentorSummaries(venture.mentors) })
  } catch (error) {
    console.error('Error assigning mentors:', error)
    return res.status(500).json({ error: 'Could not assign the mentors' })
  }
}

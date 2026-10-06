import { randomUUID } from 'node:crypto'
import mongoose from 'mongoose'
import { ROLES, mustPickMentorToAccept } from '@nst/shared/permissions.js'

import Venture from '../models/venture.js'
import Campus from '../models/campus.js'
import Batch from '../models/batch.js'
import Industry from '../models/industry.js'
import Role from '../models/role.js'
import User from '../models/user.js'
import startupStage from '../models/enums/startupStage.js'
import ventureHealth from '../models/enums/ventureHealth.js'
import { validateEmail, validateName } from '../utils/validator.js'
import {
  addFounderToVenture,
  deactivateFounder,
} from '../utils/founderHelper.js'
import { getFounderPortfolioData } from '../utils/founderPortfolio.js'
import { resolveNewVentureMentor, ventureScope } from '../utils/access.js'

const getFounders = async (req, res) => {
  try {
    const [{ students }, campuses] = await Promise.all([
      getFounderPortfolioData(ventureScope(req.user)),
      Campus.find().sort({ name: 1 }),
    ])

    return res.json({
      students,
      campus: campuses.map(campus => campus.name),
      stage: Object.values(startupStage),
      status: Object.values(ventureHealth),
    })
  } catch (err) {
    console.error('Get founders error:', err)

    return res.status(500).json({
      error: 'Failed to load founders',
    })
  }
}

// Active mentors, for the board to choose one for the new startup.
const mentorOptions = async () => {
  const mentorRole = await Role.findOne({ name: ROLES.MENTOR }).select('_id')
  if (!mentorRole) {
    return []
  }
  const mentors = await User.find({ role: mentorRole._id, deletedAt: null })
    .select('username email')
    .sort({ username: 1 })
  return mentors.map(mentor => ({
    value: mentor._id,
    label: `${mentor.username} · ${mentor.email}`,
  }))
}

const getFounderFormOptions = async (req, res) => {
  try {
    const [industries, batches, mentors] = await Promise.all([
      Industry.find().sort({ name: 1 }),
      Batch.find().populate('campus', 'name').sort({ name: 1 }),
      // A mentor's new startup is always theirs, so only the board picks.
      mustPickMentorToAccept(req.user) ? mentorOptions() : null,
    ])

    return res.json({
      industry: industries.map(industry => ({
        value: industry._id,
        label: industry.name,
      })),
      batch: batches.map(batch => ({
        value: batch._id,
        label: `${batch.name} — ${batch.campus?.name ?? 'Unknown campus'}`,
      })),
      stage: Object.entries(startupStage).map(([value, label]) => ({
        value,
        label,
      })),
      ...(mentors && { mentorId: mentors }),
    })
  } catch (err) {
    console.error('Get founder options error:', err)

    return res.status(500).json({
      error: 'Failed to load founder options',
    })
  }
}

const validateCreateFounderInput = payload => ({
  founder: validateName(payload.founder),
  email: validateEmail(payload.email),
  startup:
    typeof payload.startup === 'string' && payload.startup.trim()
      ? ''
      : 'Startup name is required',
  industry: mongoose.isValidObjectId(payload.industry)
    ? ''
    : 'Industry is required',
  batch: mongoose.isValidObjectId(payload.batch) ? '' : 'Batch is required',
  stage: Object.hasOwn(startupStage, payload.stage ?? '')
    ? ''
    : 'Stage is required',
})

const validateAndResolveFounderReferences = async ({
  email,
  industry,
  batch,
}) => {
  const [batchDoc, industryDoc, studentRole, existingUser] = await Promise.all([
    Batch.findById(batch),
    Industry.findById(industry),
    Role.findOne({ name: ROLES.STUDENT }),
    User.findOne({ email }),
  ])

  if (!studentRole) {
    console.error('Student role does not exist in database')
    return { status: 500, error: 'Student role is not configured' }
  }
  if (!batchDoc) {
    return { status: 400, error: { batch: 'Batch does not exist' } }
  }
  if (!industryDoc) {
    return { status: 400, error: { industry: 'Industry does not exist' } }
  }
  if (existingUser) {
    return {
      status: 409,
      error: { email: 'An account already exists with this email' },
    }
  }

  return { batchDoc, industryDoc, studentRole }
}

const createFounderAndVenture = async ({
  founder,
  email,
  startup,
  stage,
  batchDoc,
  industryDoc,
  studentRole,
  mentorId,
}) => {
  const user = await User.create({
    username: founder,
    email,
    password: randomUUID(),
    role: studentRole._id,
    batch: batchDoc._id,
    campus: batchDoc.campus,
  })

  try {
    const venture = await Venture.create({
      name: startup.trim(),
      campus: batchDoc.campus,
      stage,
      industry: industryDoc._id,
      mentor: mentorId,
    })

    await addFounderToVenture(user._id, venture._id)

    return { user, venture }
  } catch (err) {
    await User.deleteOne({ _id: user._id })
    throw err
  }
}

const createFounder = async (req, res) => {
  const payload = req.body ?? {}
  const error = validateCreateFounderInput(payload)

  if (Object.values(error).some(Boolean)) {
    return res.status(400).json({ error })
  }

  try {
    // A mentor's new startup is theirs; the board assigns one.
    const mentor = await resolveNewVentureMentor(req.user, payload.mentorId)
    if (mentor.error) {
      return res.status(400).json({ error: { mentorId: mentor.error } })
    }

    const refs = await validateAndResolveFounderReferences(payload)

    if (refs.error) {
      return res.status(refs.status).json({ error: refs.error })
    }

    const { user, venture } = await createFounderAndVenture({
      ...payload,
      ...refs,
      mentorId: mentor.mentorId,
    })

    return res.status(201).json({
      founder: user.username,
      email: user.email,
      startup: venture.name,
      stage: venture.stage,
    })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        error: { email: 'Email already in use' },
      })
    }

    console.error('Create founder error:', err)

    return res.status(500).json({
      error: 'Failed to create founder',
    })
  }
}

const removeFounderFromVentureById = async founderId => {
  if (!mongoose.isValidObjectId(founderId)) {
    return {
      founderId,
      message: 'Valid founderId is required',
    }
  }

  const founder = await deactivateFounder(founderId)

  if (!founder) {
    return {
      founderId,
      message: 'Startup not found for founder',
    }
  }

  return {
    founderId,
    startup: founder.venture?.name,
    message: 'Founder removed successfully',
  }
}

// Removes founders from their startups (their accounts stay). One request may
// remove at most this many, matching what an admin can select on one page.
const MAX_FOUNDERS_PER_REQUEST = 100

const deleteFounders = async (req, res) => {
  try {
    const founders = req.body?.founders
    if (
      !Array.isArray(founders) ||
      founders.length === 0 ||
      founders.length > MAX_FOUNDERS_PER_REQUEST
    ) {
      return res.status(400).json({
        error: `Send a list of 1 to ${MAX_FOUNDERS_PER_REQUEST} founder IDs`,
      })
    }

    const response = await Promise.all(
      founders.map(removeFounderFromVentureById)
    )

    return res.status(200).json({ result: response })
  } catch (err) {
    console.error('Delete founders error:', err)
    return res.status(500).json({
      error: 'Failed to delete founders',
    })
  }
}

export { getFounders, getFounderFormOptions, createFounder, deleteFounders }

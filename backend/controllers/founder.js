import { randomUUID } from 'node:crypto'
import mongoose from 'mongoose'

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
import { calculateFounderStudents } from '../utils/founderPortfolio.js'

const getFounders = async (_, res) => {
  try {
    const [{ students }, campuses] = await Promise.all([
      calculateFounderStudents(),
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

const getFounderOptions = async (_, res) => {
  try {
    const [industries, batches] = await Promise.all([
      Industry.find().sort({ name: 1 }),
      Batch.find().populate('campus', 'name').sort({ name: 1 }),
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
    })
  } catch (err) {
    console.error('Get founder options error:', err)

    return res.status(500).json({
      error: 'Failed to load founder options',
    })
  }
}

const validateFounderPayload = payload => ({
  founder: validateName(payload.founder),
  email: validateEmail(payload.email),
  startup: payload.startup ? '' : 'Startup name is required',
  industry: mongoose.isValidObjectId(payload.industry)
    ? ''
    : 'Industry is required',
  batch: mongoose.isValidObjectId(payload.batch) ? '' : 'Batch is required',
  stage: Object.hasOwn(startupStage, payload.stage ?? '')
    ? ''
    : 'Stage is required',
})

const resolveFounderRefs = async ({ email, industry, batch }) => {
  const [batchDoc, industryDoc, studentRole, existingUser] = await Promise.all([
    Batch.findById(batch),
    Industry.findById(industry),
    Role.findOne({ name: 'student' }),
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

const createFounderAccount = async ({
  founder,
  email,
  startup,
  stage,
  batchDoc,
  industryDoc,
  studentRole,
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
      name: startup,
      campus: batchDoc.campus,
      stage,
      industry: industryDoc._id,
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
  const error = validateFounderPayload(payload)

  if (Object.values(error).some(Boolean)) {
    return res.status(400).json({ error })
  }

  try {
    const refs = await resolveFounderRefs(payload)

    if (refs.error) {
      return res.status(refs.status).json({ error: refs.error })
    }

    const { user, venture } = await createFounderAccount({
      ...payload,
      ...refs,
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

const removeFounderFromVenture = async founderId => {
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

const deleteFounders = async (req, res) => {
  try {
    const founders = req.body.founders || []
    const response = await Promise.all(founders.map(removeFounderFromVenture))

    return res.status(200).json({ result: response })
  } catch (err) {
    console.error('Delete founders error:', err)
    return res.status(500).json({
      error: 'Failed to delete founders',
    })
  }
}

export { getFounders, getFounderOptions, createFounder, deleteFounders }

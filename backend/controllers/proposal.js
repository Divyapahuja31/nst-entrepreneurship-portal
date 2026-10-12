import mongoose from 'mongoose'
import Batch from '../models/batch.js'
import Campus from '../models/campus.js'
import VentureProposal from '../models/ventureProposal.js'
import User from '../models/user.js'
import {
  validateProposalInput,
  buildProposalData,
  checkExistingProposal,
  saveOrResubmitProposal,
} from '../utils/proposalHelper.js'
import { findVentureForUser } from '../utils/founderHelper.js'
import {
  DUPLICATE_STARTUP_NAME,
  isStartupNameTaken,
} from '../utils/ventureName.js'

export const CAMPUS_REQUIRED = 'CAMPUS_REQUIRED'

const NO_CAMPUS = {
  code: CAMPUS_REQUIRED,
  error:
    'Your user profile must have a campus assigned before submitting a proposal.',
}

// What is wrong with the proposal itself, as { status, error }, or null.
const proposalProblem = async body => {
  const validationError = validateProposalInput(body)
  if (validationError) {
    return { status: 400, error: validationError }
  }
  if (await isStartupNameTaken(body.startupName)) {
    return { status: 409, error: DUPLICATE_STARTUP_NAME }
  }
  return null
}

// The campus a proposal is filed under: the student's, else their batch's,
// else one they pick on the form. Whichever is found is kept on the
// account, so they are only asked once.
const campusFor = async (user, chosen) => {
  let campus = user.campus
  if (!campus && user.batch) {
    campus = (await Batch.findById(user.batch).select('campus'))?.campus
  }
  if (
    !campus &&
    mongoose.isValidObjectId(chosen) &&
    (await Campus.exists({ _id: chosen }))
  ) {
    campus = chosen
  }
  if (campus && !user.campus) {
    await User.updateOne({ _id: user._id }, { $set: { campus } })
  }
  return campus ?? null
}

export const getMyProposal = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const proposal = await VentureProposal.findOne({
      submittedBy: req.user.id,
    })
      .populate('reviews.reviewer', 'username')
      .populate('industry', 'name')
      .populate('campus', 'name')
      .populate('venture')

    return res.status(200).json({
      proposal: proposal || null,
    })
  } catch (error) {
    console.error('Error fetching proposal:', error)

    return res.status(500).json({
      error: 'Could not fetch proposal',
    })
  }
}

export const createProposal = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const campus = await campusFor(user, req.body?.campus)
    if (!campus) {
      return res.status(400).json(NO_CAMPUS)
    }

    const currentVenture = await findVentureForUser(req.user.id)
    if (currentVenture) {
      return res.status(409).json({
        error: 'You are already part of an active venture.',
      })
    }

    const existingProposal = await VentureProposal.findOne({
      submittedBy: req.user.id,
      status: { $in: ['PENDING', 'APPROVED'] },
    })

    const existingError = checkExistingProposal(existingProposal)
    if (existingError) {
      return res
        .status(existingError.status)
        .json({ error: existingError.error })
    }

    const invalid = await proposalProblem(req.body)
    if (invalid) {
      return res.status(invalid.status).json({ error: invalid.error })
    }

    const proposalData = buildProposalData(req.body, req.user.id, campus)
    const proposal = await saveOrResubmitProposal(proposalData, req.user.id)

    return res.status(201).json({
      success: true,
      proposal,
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'You already have an active proposal or venture.',
      })
    }

    console.error('Error creating proposal:', error)

    return res.status(500).json({
      error: 'Could not create proposal. Please try again.',
    })
  }
}

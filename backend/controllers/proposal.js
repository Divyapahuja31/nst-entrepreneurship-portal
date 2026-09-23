import VentureProposal from '../models/ventureProposal.js'
import User from '../models/user.js'
import {
  validateProposalInput,
  buildProposalData,
  checkExistingProposal,
  saveOrResubmitProposal,
} from '../utils/proposalHelper.js'
import { findVentureForUser } from '../utils/founderHelper.js'

export const getMyProposal = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const proposal = await VentureProposal.findOne({
      submittedBy: req.user.id,
    })
      .populate('reviews.reviewer', 'name email')
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

    if (!user.campus) {
      return res.status(400).json({
        error:
          'Your user profile must have a campus assigned before submitting a proposal.',
      })
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

    const validationError = validateProposalInput(req.body)
    if (validationError) {
      return res.status(400).json({ error: validationError })
    }

    const proposalData = buildProposalData(req.body, req.user.id, user.campus)
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

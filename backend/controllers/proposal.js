import VentureProposal from '../models/ventureProposal.js'
import User from '../models/user.js'
import {
  validateProposalInput,
  buildProposalData,
} from '../utils/proposalHelper.js'

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

    const existingProposal = await VentureProposal.findOne({
      submittedBy: req.user.id,
      status: { $in: ['PENDING', 'APPROVED'] },
    })

    if (existingProposal) {
      return res.status(409).json({
        error:
          existingProposal.status === 'PENDING'
            ? 'You already have a proposal under review.'
            : 'You already have an approved venture proposal.',
      })
    }

    const validationError = validateProposalInput(req.body)
    if (validationError) {
      return res.status(400).json({ error: validationError })
    }

    const proposalData = buildProposalData(req.body, req.user.id, user.campus)

    const existingRejected = await VentureProposal.findOne({
      submittedBy: req.user.id,
      status: 'REJECTED',
    })

    let proposal
    if (existingRejected) {
      Object.assign(existingRejected, proposalData, {
        status: 'PENDING',
        reviews: existingRejected.reviews,
      })
      proposal = await existingRejected.save()
    } else {
      proposal = await VentureProposal.create(proposalData)
    }

    return res.status(201).json({
      success: true,
      proposal,
    })
  } catch (error) {
    console.error('Error creating proposal:', error)

    return res.status(500).json({
      error: 'Could not create proposal. Please try again.',
    })
  }
}

export const getAllProposals = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const user = await User.findById(req.user.id)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  const proposals = await VentureProposal.find({})
    .populate('submittedBy', 'username email')
    .populate('reviews.reviewer', 'username email')
    .populate('industry', 'name')
    .populate('campus', 'name')
    .populate('venture')

  return res.status(200).json({
    proposals,
  })
}

import VentureProposal from '../models/ventureProposal.js'
import User from '../models/user.js'
import startupStage from '../models/enums/startupStage.js'

const REQUIRED_STRING_FIELDS = [
  { field: 'startupName', message: 'Startup name is required' },
  { field: 'description', message: 'Problem description is required' },
  { field: 'targetCustomer', message: 'Target customer is required' },
  { field: 'currentTraction', message: 'Current traction is required' },
  { field: 'businessModel', message: 'Business model is required' },
  { field: 'sixMonthGoals', message: 'Six-month goals are required' },
  { field: 'techStack', message: 'Tech stack is required' },
  { field: 'capitalStatus', message: 'Capital status is required' },
]

const validateStrings = body => {
  for (const item of REQUIRED_STRING_FIELDS) {
    if (!body[item.field]?.trim()) {
      return item.message
    }
  }
  return null
}

const validateIndustryAndStage = body => {
  if (!body.industry && !body.industryName?.trim()) {
    return 'Industry is required'
  }
  if (!body.stage || !Object.keys(startupStage).includes(body.stage)) {
    return 'A valid startup stage is required'
  }
  return null
}

const validateArraysAndHours = body => {
  if (
    !Array.isArray(body.assumptions) ||
    body.assumptions.filter(Boolean).length === 0
  ) {
    return 'Assumptions are required'
  }
  if (!Array.isArray(body.risks) || body.risks.filter(Boolean).length === 0) {
    return 'Risks are required'
  }
  if (
    body.weeklyHours === undefined ||
    body.weeklyHours === null ||
    isNaN(Number(body.weeklyHours)) ||
    Number(body.weeklyHours) < 0
  ) {
    return 'Weekly hours must be a valid non-negative number'
  }
  return null
}

const validateProposalInput = body => {
  return (
    validateStrings(body) ||
    validateIndustryAndStage(body) ||
    validateArraysAndHours(body)
  )
}

const buildProposalData = (body, userId, campusId) => {
  return {
    startupName: body.startupName.trim(),
    description: body.description.trim(),
    targetCustomer: body.targetCustomer.trim(),
    stage: body.stage,
    currentTraction: body.currentTraction.trim(),
    businessModel: body.businessModel.trim(),
    assumptions: body.assumptions.map(a => a.trim()).filter(Boolean),
    risks: body.risks.map(r => r.trim()).filter(Boolean),
    sixMonthGoals: body.sixMonthGoals.trim(),
    techStack: body.techStack.trim(),
    capitalStatus: body.capitalStatus.trim(),
    weeklyHours: Number(body.weeklyHours),
    website: body.website?.trim() || undefined,
    submittedBy: userId,
    campus: campusId,
    status: 'PENDING',
    industry: body.industry || undefined,
    industryName: body.industry
      ? undefined
      : body.industryName?.trim() || undefined,
  }
}

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

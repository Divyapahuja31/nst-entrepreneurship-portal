import mongoose from 'mongoose'
import Industry from '../models/industry.js'
import Venture from '../models/venture.js'
import Founder from '../models/founder.js'
import { addFounderToVenture, findVentureForUser } from './founderHelper.js'

export const validateReviewPayload = (id, status, typeName) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return `Invalid ${typeName} ID`
  }
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return 'Invalid review status'
  }
  return null
}

export const validateReviewRequest = (req, id, status, typeName) => {
  if (!req.user?.id) {
    return { status: 401, error: 'Unauthorized' }
  }
  const payloadError = validateReviewPayload(id, status, typeName)
  if (payloadError) {
    return { status: 400, error: payloadError }
  }
  return null
}

export const findOrCreateIndustry = async name => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let industry = await Industry.findOne({
    name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
  })

  if (!industry) {
    try {
      industry = await Industry.create({ name })
    } catch (err) {
      if (err.code === 11000) {
        return Industry.findOne({
          name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
        })
      }
      throw err
    }
  }

  return industry
}

export const resolveIndustryId = async (existingIndustry, industryName) => {
  const existingIndustryId = existingIndustry?._id || existingIndustry
  if (existingIndustryId && mongoose.isValidObjectId(existingIndustryId)) {
    const found = await Industry.findById(existingIndustryId)
    if (found) {
      return found._id
    }
  }

  const trimmedName = industryName?.trim()
  if (!trimmedName) {
    return null
  }

  const industry = await findOrCreateIndustry(trimmedName)
  return industry?._id || null
}

export const createVentureFromProposal = async (proposal, industryId) => {
  const venture = await Venture.create({
    name: proposal.startupName,
    description: proposal.description,
    campus: proposal.campus,
    industry: industryId,
    stage: proposal.stage,
    website: proposal.website,
  })

  try {
    // first founder is the user who submitted the proposal
    await addFounderToVenture(proposal.submittedBy, venture._id)
  } catch (err) {
    await Venture.deleteOne({ _id: venture._id })
    throw err
  }

  return venture._id
}

export const rollbackProposalApproval = async (ventureId, submittedById) => {
  if (ventureId) {
    await Venture.deleteOne({ _id: ventureId })
    if (submittedById) {
      await Founder.deleteOne({
        user: submittedById,
        venture: ventureId,
      })
    }
  }
}

export const ensureProposalCanBeReviewed = proposal => {
  if (!proposal) {
    return { status: 404, error: 'Proposal not found' }
  }
  if (proposal.status !== 'PENDING') {
    return { status: 409, error: 'This proposal has already been reviewed' }
  }
  return null
}

export const handleProposalApproval = async proposal => {
  const existingVenture = await findVentureForUser(proposal.submittedBy)
  if (existingVenture) {
    return {
      status: 409,
      error: 'This student is already part of an active venture',
    }
  }

  const industryId = await resolveIndustryId(
    proposal.industry,
    proposal.industryName
  )
  if (!industryId) {
    return {
      status: 400,
      error: 'Could not resolve industry for proposal',
    }
  }

  const ventureId = await createVentureFromProposal(proposal, industryId)
  return { ventureId, industryId }
}

export const buildProposalUpdate = ({
  status,
  reviewerId,
  remarks,
  ventureId,
  industryId,
  hasIndustry,
}) => {
  const updateFields = { status }
  if (ventureId) {
    updateFields.venture = ventureId
  }
  if (industryId && !hasIndustry) {
    updateFields.industry = industryId
  }

  const reviewEntry = {
    reviewer: reviewerId,
    status,
    reviewedAt: new Date(),
  }
  if (typeof remarks === 'string' && remarks.trim()) {
    reviewEntry.remarks = remarks.trim()
  }

  return {
    $set: updateFields,
    $push: { reviews: reviewEntry },
  }
}

export const ensureJoinRequestCanBeReviewed = joinRequest => {
  if (!joinRequest) {
    return { status: 404, error: 'Join request not found' }
  }
  if (joinRequest.status !== 'PENDING') {
    return { status: 409, error: 'This join request has already been reviewed' }
  }
  return null
}

export const handleJoinRequestApproval = async joinRequest => {
  const existingVenture = await findVentureForUser(joinRequest.requestedBy)
  if (existingVenture) {
    return {
      status: 409,
      error: 'This student is already part of a venture',
    }
  }

  const venture = await Venture.findById(joinRequest.venture)
  if (!venture) {
    return { status: 404, error: 'Venture not found' }
  }

  await addFounderToVenture(joinRequest.requestedBy, venture._id)
  return null
}

export const buildJoinRequestUpdate = ({ status, reviewerId }) => ({
  $set: {
    status,
    reviewedBy: reviewerId,
    reviewedAt: new Date(),
  },
})

export const rollbackJoinRequestApproval = async (
  joinRequest,
  wasApproved = true
) => {
  if (
    wasApproved &&
    joinRequest &&
    joinRequest.requestedBy &&
    joinRequest.venture
  ) {
    await Founder.deleteOne({
      user: joinRequest.requestedBy,
      venture: joinRequest.venture,
    })
  }
}

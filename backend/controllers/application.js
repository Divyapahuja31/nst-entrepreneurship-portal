import Industry from '../models/industry.js'
import mongoose from 'mongoose'
import Venture from '../models/venture.js'
import VentureJoinRequest from '../models/ventureJoinRequest.js'
import VentureProposal from '../models/ventureProposal.js'
import {
  addFounderToVenture,
  findVentureForUser,
} from '../utils/founderHelper.js'

export const getPendingApplications = async (req, res) => {
  try {
    const [proposals, joinRequests] = await Promise.all([
      VentureProposal.find({ status: 'PENDING' })
        .populate('submittedBy', 'username email')
        .populate('industry', 'name')
        .populate('campus', 'name'),
      VentureJoinRequest.find({ status: 'PENDING' })
        .populate('requestedBy', 'username email')
        .populate('venture', 'name'),
    ])

    return res.status(200).json({ proposals, joinRequests })
  } catch (error) {
    console.error('Error fetching pending applications:', error)

    return res.status(500).json({
      error: 'Could not fetch pending applications',
    })
  }
}

const resolveIndustryId = async (existingIndustry, industryName) => {
  const existingIndustryId = existingIndustry?._id || existingIndustry
  if (existingIndustryId) {
    return existingIndustryId
  }

  const trimmedName = industryName?.trim()
  if (!trimmedName) {
    return null
  }

  const escapedName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let industry = await Industry.findOne({
    name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
  })

  if (!industry) {
    industry = await Industry.create({ name: trimmedName })
  }

  return industry._id
}

const createVentureFromProposal = async (proposal, industryId) => {
  let venture
  try {
    venture = await Venture.create({
      name: proposal.startupName,
      description: proposal.description,
      campus: proposal.campus,
      industry: industryId,
      stage: proposal.stage,
      website: proposal.website,
    })

    // first founder is the user who submitted the proposal
    await addFounderToVenture(proposal.submittedBy, venture._id)

    return venture._id
  } catch (error) {
    if (venture?._id) {
      await Venture.findByIdAndDelete(venture._id).catch(err =>
        console.error('Error rolling back orphaned venture:', err)
      )
    }
    throw error
  }
}

export const reviewProposal = async (req, res) => {
  try {
    const { proposalId } = req.params
    const { status, remarks } = req.body

    if (!mongoose.Types.ObjectId.isValid(proposalId)) {
      return res.status(400).json({ error: 'Invalid proposal ID' })
    }

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid review status' })
    }

    const proposal = await VentureProposal.findById(proposalId)
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' })
    }

    if (proposal.status !== 'PENDING') {
      return res.status(409).json({
        error: 'This proposal has already been reviewed',
      })
    }

    if (status === 'APPROVED') {
      const existingVenture = await findVentureForUser(proposal.submittedBy)

      if (existingVenture) {
        return res.status(409).json({
          error: 'This student is already part of an active venture',
        })
      }

      const industryId = await resolveIndustryId(
        proposal.industry,
        proposal.industryName
      )

      if (!industryId) {
        return res.status(400).json({
          error: 'Industry is required to approve proposal',
        })
      }

      proposal.industry = industryId
      const ventureId = await createVentureFromProposal(proposal, industryId)
      proposal.venture = ventureId
    }

    proposal.status = status
    proposal.reviews.push({
      reviewer: req.user.id,
      status,
      remarks,
    })

    await proposal.save()

    return res.status(200).json({ proposal })
  } catch (error) {
    console.error('Error reviewing proposal:', error)

    return res.status(500).json({
      error: 'Could not review proposal',
    })
  }
}

export const reviewJoinRequest = async (req, res) => {
  try {
    const { requestId } = req.params
    const { status } = req.body

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ error: 'Invalid join request ID' })
    }

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid review status' })
    }

    const joinRequest = await VentureJoinRequest.findById(requestId)
    if (!joinRequest) {
      return res.status(404).json({ error: 'Join request not found' })
    }

    if (joinRequest.status !== 'PENDING') {
      return res.status(409).json({
        error: 'This join request has already been reviewed',
      })
    }

    if (status === 'APPROVED') {
      const existingVenture = await findVentureForUser(joinRequest.requestedBy)

      if (existingVenture) {
        return res.status(409).json({
          error: 'This student is already part of a venture',
        })
      }

      const venture = await Venture.findById(joinRequest.venture)

      if (!venture) {
        return res.status(404).json({ error: 'Venture not found' })
      }

      await addFounderToVenture(joinRequest.requestedBy, venture._id)
    }

    joinRequest.status = status
    joinRequest.reviewedBy = req.user.id
    joinRequest.reviewedAt = new Date()

    await joinRequest.save()

    return res.status(200).json({ joinRequest })
  } catch (error) {
    console.error('Error reviewing join request:', error)

    return res.status(500).json({
      error: 'Could not review join request',
    })
  }
}

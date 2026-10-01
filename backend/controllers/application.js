import VentureJoinRequest from '../models/ventureJoinRequest.js'
import VentureProposal from '../models/ventureProposal.js'
import {
  validateReviewRequest,
  ensureProposalCanBeReviewed,
  handleProposalApproval,
  buildProposalUpdate,
  rollbackProposalApproval,
  ensureJoinRequestCanBeReviewed,
  handleJoinRequestApproval,
  buildJoinRequestUpdate,
  rollbackJoinRequestApproval,
  closeOtherApplications,
} from '../utils/applicationHelper.js'
import Venture from '../models/venture.js'

// Best effort: the approval already succeeded, so a failure here is logged
// rather than reported as a failed review.
const closeOthersAfterApproval = async args => {
  try {
    await closeOtherApplications(args)
  } catch (error) {
    console.error('Could not close other applications:', error)
  }
}

export const getPendingApplications = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

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

export const reviewProposal = async (req, res) => {
  let ventureId = null
  let proposal = null

  try {
    const { proposalId } = req.params
    const { status, remarks } = req.body

    const validationError = validateReviewRequest(
      req,
      proposalId,
      status,
      'proposal'
    )
    if (validationError) {
      return res
        .status(validationError.status)
        .json({ error: validationError.error })
    }

    proposal = await VentureProposal.findById(proposalId)
    const stateError = ensureProposalCanBeReviewed(proposal)
    if (stateError) {
      return res.status(stateError.status).json({ error: stateError.error })
    }

    let industryId = null

    if (status === 'APPROVED') {
      const approvalResult = await handleProposalApproval(proposal)
      if (approvalResult.error) {
        return res
          .status(approvalResult.status)
          .json({ error: approvalResult.error })
      }
      ventureId = approvalResult.ventureId
      industryId = approvalResult.industryId
    }

    const updateQuery = buildProposalUpdate({
      status,
      reviewerId: req.user.id,
      remarks,
      ventureId,
      industryId,
      hasIndustry: Boolean(proposal.industry),
    })

    const updatedProposal = await VentureProposal.findOneAndUpdate(
      { _id: proposalId, status: 'PENDING' },
      updateQuery,
      { new: true }
    )

    if (!updatedProposal) {
      await rollbackProposalApproval(ventureId, proposal.submittedBy)
      return res.status(409).json({
        error: 'This proposal has already been reviewed',
      })
    }

    if (status === 'APPROVED') {
      await closeOthersAfterApproval({
        studentId: proposal.submittedBy,
        reviewerId: req.user.id,
        ventureName: proposal.startupName,
        keepProposalId: proposal._id,
      })
    }

    return res.status(200).json({ proposal: updatedProposal })
  } catch (error) {
    await rollbackProposalApproval(
      ventureId,
      proposal ? proposal.submittedBy : null
    )
    console.error('Error reviewing proposal:', error)

    return res.status(500).json({
      error: 'Could not review proposal',
    })
  }
}

export const reviewJoinRequest = async (req, res) => {
  let approvedFounderAdded = false
  let joinRequest = null

  try {
    const { requestId } = req.params
    const { status } = req.body

    const validationError = validateReviewRequest(
      req,
      requestId,
      status,
      'join request'
    )
    if (validationError) {
      return res
        .status(validationError.status)
        .json({ error: validationError.error })
    }

    joinRequest = await VentureJoinRequest.findById(requestId)
    const stateError = ensureJoinRequestCanBeReviewed(joinRequest)
    if (stateError) {
      return res.status(stateError.status).json({ error: stateError.error })
    }

    if (status === 'APPROVED') {
      const approvalError = await handleJoinRequestApproval(joinRequest)
      if (approvalError) {
        return res
          .status(approvalError.status)
          .json({ error: approvalError.error })
      }
      approvedFounderAdded = true
    }

    const updatedJoinRequest = await VentureJoinRequest.findOneAndUpdate(
      { _id: requestId, status: 'PENDING' },
      buildJoinRequestUpdate({ status, reviewerId: req.user.id }),
      { new: true }
    )

    if (!updatedJoinRequest) {
      await rollbackJoinRequestApproval(joinRequest, approvedFounderAdded)
      return res.status(409).json({
        error: 'This join request has already been reviewed',
      })
    }

    if (status === 'APPROVED') {
      const venture = await Venture.findById(joinRequest.venture).select('name')
      await closeOthersAfterApproval({
        studentId: joinRequest.requestedBy,
        reviewerId: req.user.id,
        ventureName: venture?.name ?? 'a venture',
        keepJoinRequestId: joinRequest._id,
      })
    }

    return res.status(200).json({ joinRequest: updatedJoinRequest })
  } catch (error) {
    await rollbackJoinRequestApproval(joinRequest, approvedFounderAdded)
    console.error('Error reviewing join request:', error)

    return res.status(500).json({
      error: 'Could not review join request',
    })
  }
}

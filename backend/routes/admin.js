import { Router } from 'express'

import {
  createFounder,
  getFounderOptions,
  getFounders,
  deleteFounders,
} from '../controllers/founder.js'

import { getOverview } from '../controllers/analytics.js'

import {
  getPendingApplications,
  reviewProposal,
  reviewJoinRequest,
} from '../controllers/application.js'

const router = Router()

router.get('/founders', getFounders)
router.post('/founders', createFounder)
router.get('/founder-options', getFounderOptions)
router.get('/overview', getOverview)
router.delete('/founders/delete', deleteFounders)

router.get('/applications', getPendingApplications)
router.patch('/proposals/:proposalId/review', reviewProposal)
router.patch('/join-requests/:requestId/review', reviewJoinRequest)

export default router

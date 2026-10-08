import { Router } from 'express'
import { BOARD_ROLES, ROLES } from '@nst/shared/permissions.js'

import requireRole from '../middleware/requireRole.js'
import accounts from './accounts.js'
import programme from './programme.js'

import {
  createFounder,
  getFounderFormOptions,
  getFounders,
  deleteFounders,
} from '../controllers/founder.js'

import { getOverview } from '../controllers/analytics.js'

import {
  getPendingApplications,
  reviewProposal,
  reviewJoinRequest,
} from '../controllers/application.js'

import { getMentors, setVentureMentor } from '../controllers/venture.js'

// Mounted behind requireRole(...STAFF_ROLES). Each handler limits mentors to
// the startups assigned to them; routes for the board or admins only say so.
const router = Router()

router.get('/founders', getFounders)
router.post('/founders', createFounder)
router.get('/founder-options', getFounderFormOptions)
router.get('/overview', getOverview)
router.delete('/founders/delete', requireRole(...BOARD_ROLES), deleteFounders)

router.get('/applications', getPendingApplications)
router.patch('/proposals/:proposalId/review', reviewProposal)
router.patch('/join-requests/:requestId/review', reviewJoinRequest)

router.get('/mentors', getMentors)
router.patch(
  '/ventures/:ventureId/mentor',
  requireRole(...BOARD_ROLES),
  setVentureMentor
)

router.use('/accounts', requireRole(ROLES.ADMIN), accounts)
router.use('/programme', requireRole(ROLES.ADMIN), programme)

export default router

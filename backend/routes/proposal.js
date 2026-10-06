import { Router } from 'express'

import { ROLES } from '@nst/shared/permissions.js'
import { getMyProposal, createProposal } from '../controllers/proposal.js'
import requireRole from '../middleware/requireRole.js'

const router = Router()

router.get('/me', getMyProposal)
// Only students apply to start a startup.
router.post('/', requireRole(ROLES.STUDENT), createProposal)

export default router

import { Router } from 'express'

import { getMyProposal, createProposal } from '../controllers/proposal.js'

const router = Router()

router.get('/me', getMyProposal)
router.post('/', createProposal)

export default router

import { Router } from 'express'

import {
  getMyProposal,
  createProposal,
  getAllProposals,
} from '../controllers/proposal.js'

const router = Router()

router.get('/me', getMyProposal)
router.post('/', createProposal)
router.get('/all', getAllProposals)

export default router

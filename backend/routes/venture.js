import { Router } from 'express'

import {
  getVentures,
  getVentureById,
  getMyJoinRequest,
  createJoinRequest,
} from '../controllers/venture.js'

const router = Router()

router.get('/', getVentures)
router.get('/join-requests/me', getMyJoinRequest)
router.get('/:ventureId', getVentureById)
router.post('/:ventureId/join', createJoinRequest)

export default router

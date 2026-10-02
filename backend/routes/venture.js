import { Router } from 'express'

import {
  getVentures,
  getVentureById,
  getMyJoinRequest,
  createJoinRequest,
} from '../controllers/venture.js'
import requireRole from '../middleware/requireRole.js'

const router = Router()

router.get('/', getVentures)
router.get('/join-requests/me', getMyJoinRequest)
// Founder emails and past members: only the admin startup page needs these.
router.get('/:ventureId', requireRole('admin'), getVentureById)
router.post('/:ventureId/join', createJoinRequest)

export default router

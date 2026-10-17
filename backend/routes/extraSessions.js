import { Router } from 'express'
import {
  cancelExtraSession,
  createExtraSession,
  getExtraSessions,
  updateExtraSession,
} from '../controllers/extraSession.js'

// Mounted for admins and the academic board (routes/admin.js).
const router = Router()

router.get('/', getExtraSessions)
router.post('/', createExtraSession)
router.put('/:sessionId', updateExtraSession)
router.post('/:sessionId/cancel', cancelExtraSession)

export default router

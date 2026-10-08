import { Router } from 'express'
import {
  cancelProgrammeSession,
  getProgrammePage,
  redrawSession,
  saveProgramme,
  scheduleSessionNow,
} from '../controllers/programme.js'

// Mounted for admins only (routes/admin.js).
const router = Router()

router.get('/', getProgrammePage)
router.put('/', saveProgramme)
router.post('/sessions/:sessionId/schedule', scheduleSessionNow)
router.post('/sessions/:sessionId/redraw', redrawSession)
router.post('/sessions/:sessionId/cancel', cancelProgrammeSession)

export default router

import { Router } from 'express'
import {
  cancelProgrammeSession,
  clearProgrammeSessions,
  getProgrammePage,
  redrawSession,
  saveProgramme,
  saveReportSchedule,
  scheduleSessionNow,
} from '../controllers/programme.js'

// Mounted for admins only (routes/admin.js).
const router = Router()

router.get('/', getProgrammePage)
router.put('/', saveProgramme)
router.put('/reports', saveReportSchedule)
router.post('/sessions/:sessionId/schedule', scheduleSessionNow)
router.post('/sessions/:sessionId/redraw', redrawSession)
router.post('/sessions/:sessionId/cancel', cancelProgrammeSession)
router.post('/sessions/clear', clearProgrammeSessions)

export default router

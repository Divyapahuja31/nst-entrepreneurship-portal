import express from 'express'
import multer from 'multer'

import { STAFF_ROLES } from '@nst/shared/permissions.js'
import requireRole from '../middleware/requireRole.js'

import {
  createKPI,
  getMyKPIs,
  getVentureKPIs,
  getFounderKPIs,
  getAllKPIs,
  submitKPIForApproval,
  evaluateKPI,
  lockKPI,
  unlockKPI,
  submitKPIEvidence,
  updateKPI,
  deleteKPI,
  uploadKPIEvidence,
  deleteKPIEvidence,
  downloadKPIEvidence,
} from '../controllers/kpi.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})

const router = express.Router()

router.get('/', getMyKPIs)
router.post('/', createKPI)
// Every KPI the caller may review (all for the board, assigned for mentors).
router.get('/all', requireRole(...STAFF_ROLES), getAllKPIs)
router.get('/venture/:ventureId', getVentureKPIs)
router.get('/founder/:founderId', getFounderKPIs)
router.get('/:kpiId/evidence/download', downloadKPIEvidence)
router.get('/:kpiId/download', downloadKPIEvidence)
router.post('/:kpiId/submit', submitKPIForApproval)
// Who may review, lock or unlock is decided per KPI (see @nst/shared).
router.put('/:kpiId/evaluate', evaluateKPI)
router.post('/:kpiId/lock', lockKPI)
router.post('/:kpiId/unlock', unlockKPI)
router.put('/:kpiId/evidence', submitKPIEvidence)
router.put('/:kpiId', updateKPI)
router.delete('/:kpiId', deleteKPI)
router.post('/:kpiId/evidence', upload.single('file'), uploadKPIEvidence)
router.delete('/:kpiId/evidence', deleteKPIEvidence)

export default router

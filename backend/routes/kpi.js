import express from 'express'
import multer from 'multer'

import {
  createKPI,
  getMyKPIs,
  getVentureKPIs,
  getFounderKPIs,
  submitKPIForApproval,
  evaluateKPI,
  submitKPIEvidence,
  updateKPI,
  deleteKPI,
  uploadKPIEvidence,
  deleteKPIEvidence,
} from '../controllers/kpi.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})

const router = express.Router()

router.get('/', getMyKPIs)
router.post('/', createKPI)
router.get('/venture/:ventureId', getVentureKPIs)
router.get('/founder/:founderId', getFounderKPIs)
router.post('/:kpiId/submit', submitKPIForApproval)
router.put('/:kpiId/evaluate', evaluateKPI)
router.put('/:kpiId/evidence', submitKPIEvidence)
router.put('/:kpiId', updateKPI)
router.delete('/:kpiId', deleteKPI)
router.post('/:kpiId/evidence', upload.single('file'), uploadKPIEvidence)
router.delete('/:kpiId/evidence', deleteKPIEvidence)

export default router

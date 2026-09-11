import express from 'express'
import multer from 'multer'

import {
  createKPI,
  getVentureKPIs,
  submitKPIForApproval,
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

router.post('/', createKPI)
router.get('/venture/:ventureId', getVentureKPIs)
router.post('/:kpiId/submit', submitKPIForApproval)
router.put('/:kpiId', updateKPI)
router.delete('/:kpiId', deleteKPI)
router.post('/:kpiId/evidence', upload.single('file'), uploadKPIEvidence)
router.delete('/:kpiId/evidence', deleteKPIEvidence)

export default router

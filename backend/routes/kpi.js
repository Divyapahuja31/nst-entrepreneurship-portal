import express from 'express'

import {
  createKPI,
  getVentureKPIs,
  submitKPIForApproval,
  updateKPI,
  deleteKPI,
} from '../controllers/kpi.js'

const router = express.Router()

router.post('/', createKPI)
router.get('/venture/:ventureId', getVentureKPIs)
router.post('/:kpiId/submit', submitKPIForApproval)
router.put('/:kpiId', updateKPI)
router.delete('/:kpiId', deleteKPI)

export default router

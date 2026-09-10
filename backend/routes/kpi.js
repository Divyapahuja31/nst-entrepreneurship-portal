import express from 'express'

import {
  createKPI,
  getVentureKPIs,
  submitKPIForApproval,
} from '../controllers/kpi.js'

const router = express.Router()

router.post('/', createKPI)

router.get('/venture/:ventureId', getVentureKPIs)

router.post('/:kpiId/submit', submitKPIForApproval)

export default router

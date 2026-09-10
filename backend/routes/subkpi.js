import express from 'express'

import { createSubKPI } from '../controllers/subKPI.js'

const router = express.Router()

router.post('/kpi/:kpiId', createSubKPI)

export default router

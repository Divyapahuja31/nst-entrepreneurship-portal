import express from 'express'

import {
  createSubKPI,
  updateSubKPI,
  deleteSubKPI,
} from '../controllers/subKPI.js'

const router = express.Router()

router.post('/kpi/:kpiId', createSubKPI)
router.put('/:id', updateSubKPI)
router.delete('/:id', deleteSubKPI)

export default router

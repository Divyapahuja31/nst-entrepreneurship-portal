import { Router } from 'express'

import {
  createFounder,
  getFounderOptions,
  getFounders,
  getOverview,
  deleteFounders,
} from '../controllers/admin.js'

const router = Router()

router.get('/founders', getFounders)
router.post('/founders', createFounder)
router.get('/founder-options', getFounderOptions)
router.get('/overview', getOverview)
router.delete('/founders/delete', deleteFounders)
export default router

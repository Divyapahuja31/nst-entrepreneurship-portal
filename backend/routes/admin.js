import { Router } from 'express'

import { getFounders, getOverview } from '../controllers/admin.js'

const router = Router()

router.get('/founders', getFounders)
router.get('/overview', getOverview)
export default router

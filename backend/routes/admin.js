import { Router } from 'express'

import { getFounders } from '../controllers/admin.js'

const router = Router()

router.get('/founders', getFounders)

export default router

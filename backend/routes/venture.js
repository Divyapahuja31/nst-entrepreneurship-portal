import { Router } from 'express'

import { getVenture } from '../controllers/venture.js'

const router = Router()

router.get('/', getVenture)

export default router

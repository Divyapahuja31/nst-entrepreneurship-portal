import { Router } from 'express'

import { getIndustries } from '../controllers/industry.js'

const router = Router()

router.get('/', getIndustries)

export default router

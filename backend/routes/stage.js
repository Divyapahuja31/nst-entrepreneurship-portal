import { Router } from 'express'

import { getStages } from '../controllers/stage.js'

const router = Router()

router.get('/', getStages)

export default router

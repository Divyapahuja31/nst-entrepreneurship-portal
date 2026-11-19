import { Router } from 'express'
import {
  acceptRecommendation,
  dismissRecommendation,
  listRecommendations,
} from '../controllers/kpiRecommendation.js'

// Mounted behind the admin role check in index.js.
const router = Router()

router.get('/', listRecommendations)
router.post('/:id/accept', acceptRecommendation)
router.post('/:id/dismiss', dismissRecommendation)

export default router

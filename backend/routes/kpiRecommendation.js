import { Router } from 'express'
import {
  acceptRecommendation,
  dismissRecommendation,
  listRecommendations,
} from '../controllers/kpiRecommendation.js'

// Who may see and decide each recommendation is checked per startup and
// founder (see controllers/kpiRecommendation.js).
const router = Router()

router.get('/', listRecommendations)
router.post('/:id/accept', acceptRecommendation)
router.post('/:id/dismiss', dismissRecommendation)

export default router

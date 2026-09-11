import { Router } from 'express'
import {
  getBiWeeklyData,
  submitBiWeeklyCycle,
  saveBiWeeklyObservation,
  saveBiWeeklyEvaluation,
  reopenBiWeeklySubmission,
} from '../controllers/biweekly.js'

const router = Router()

router.get('/', getBiWeeklyData)
router.post('/submission', submitBiWeeklyCycle)
router.post('/observation', saveBiWeeklyObservation)
router.post('/evaluation', saveBiWeeklyEvaluation)
router.post('/reopen', reopenBiWeeklySubmission)

export default router

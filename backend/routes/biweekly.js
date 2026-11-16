import { Router } from 'express'
import {
  getBiWeeklyData,
  submitBiWeeklyCycle,
  saveBiWeeklyObservation,
  saveBiWeeklyEvaluation,
  reopenBiWeeklySubmission,
  openBiWeeklyWindows,
} from '../controllers/biweekly.js'

const router = Router()

router.get('/', getBiWeeklyData)
router.post('/submission', submitBiWeeklyCycle)
router.post('/observation', saveBiWeeklyObservation)
router.post('/evaluation', saveBiWeeklyEvaluation)
router.post('/reopen', reopenBiWeeklySubmission)
router.post('/windows', openBiWeeklyWindows)

export default router

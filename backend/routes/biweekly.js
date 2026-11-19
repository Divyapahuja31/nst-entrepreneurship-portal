import { Router } from 'express'
import {
  getBiWeeklyData,
  saveBiweeklyForm,
  submitBiWeeklyCycle,
  saveBiWeeklyObservation,
  saveBiWeeklyEvaluation,
  reopenBiWeeklySubmission,
  openBiWeeklyWindows,
} from '../controllers/biweekly.js'

const router = Router()

router.put('/form', saveBiweeklyForm)
router.get('/', getBiWeeklyData)
router.post('/submission', submitBiWeeklyCycle)
router.post('/observation', saveBiWeeklyObservation)
router.post('/evaluation', saveBiWeeklyEvaluation)
router.post('/reopen', reopenBiWeeklySubmission)
router.post('/windows', openBiWeeklyWindows)

export default router

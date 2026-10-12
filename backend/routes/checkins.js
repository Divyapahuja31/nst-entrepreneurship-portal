import { Router } from 'express'
import {
  cancelCheckIn,
  createCheckIns,
  endCheckInSeries,
  listCheckIns,
  rescheduleCheckIn,
} from '../controllers/checkin.js'

const router = Router()

router.get('/', listCheckIns)
router.post('/', createCheckIns)
router.patch('/:id', rescheduleCheckIn)
router.delete('/:id', cancelCheckIn)
router.delete('/series/:seriesId', endCheckInSeries)

export default router

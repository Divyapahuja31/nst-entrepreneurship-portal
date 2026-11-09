import { Router } from 'express'
import {
  addKpiBot,
  cancelCheckIn,
  createCheckIns,
  endCheckInSeries,
  getCheckIn,
  listCheckIns,
  refreshTranscript,
  rescheduleCheckIn,
  saveCheckInNotes,
} from '../controllers/checkin.js'

const router = Router()

router.get('/', listCheckIns)
router.post('/', createCheckIns)
router.get('/:id', getCheckIn)
router.patch('/:id', rescheduleCheckIn)
router.put('/:id/notes', saveCheckInNotes)
router.post('/:id/transcript/refresh', refreshTranscript)
router.post('/:id/kpi-bot', addKpiBot)
router.delete('/:id', cancelCheckIn)
router.delete('/series/:seriesId', endCheckInSeries)

export default router

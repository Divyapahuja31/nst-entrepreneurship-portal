import { Router } from 'express'
import {
  connectGoogle,
  disconnectGoogle,
  googleCallback,
  googleStatus,
} from '../controllers/google.js'

const router = Router()

router.get('/connect', connectGoogle)
router.get('/callback', googleCallback)
router.get('/status', googleStatus)
router.delete('/connection', disconnectGoogle)

export default router

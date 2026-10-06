import { Router } from 'express'
import { listEmailNotifications } from '../controllers/notification.js'

const router = Router()

router.get('/emails', listEmailNotifications)

export default router

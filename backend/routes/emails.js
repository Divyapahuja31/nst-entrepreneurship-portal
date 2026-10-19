import { Router } from 'express'
import {
  getEmailSettings,
  previewEmail,
  saveEmailSettings,
} from '../controllers/emailSettings.js'

// Mounted for admins only (routes/admin.js).
const router = Router()

router.get('/', getEmailSettings)
router.put('/', saveEmailSettings)
router.post('/preview', previewEmail)

export default router

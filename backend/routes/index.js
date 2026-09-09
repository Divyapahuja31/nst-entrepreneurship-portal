import { Router } from 'express'
import admin from './admin.js'
import auth from './auth.js'
import requireRole from '../middleware/requireRole.js'

const router = Router()

router.use('/auth', auth)
router.use('/admin', requireRole('admin'), admin)

export default router

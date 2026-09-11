import { Router } from 'express'
import admin from './admin.js'
import auth from './auth.js'
import requireRole from '../middleware/requireRole.js'
import kpiRoutes from './kpi.js'
import subKpiRoutes from './subkpi.js'
import biweeklyRoutes from './biweekly.js'
const router = Router()

router.use('/auth', auth)
router.use('/admin', requireRole('admin'), admin)
router.use('/kpis', kpiRoutes)
router.use('/subkpis', subKpiRoutes)
router.use('/biweekly', biweeklyRoutes)

export default router

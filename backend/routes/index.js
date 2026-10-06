import { Router } from 'express'
import { STAFF_ROLES } from '@nst/shared/permissions.js'
import admin from './admin.js'
import auth from './auth.js'
import requireAuth from '../middleware/requireAuth.js'
import requireRole from '../middleware/requireRole.js'
import kpiRoutes from './kpi.js'
import subKpiRoutes from './subkpi.js'
import proposalRoutes from './proposal.js'
import industryRoutes from './industry.js'
import stageRoutes from './stage.js'
import ventures from './venture.js'
import biweeklyRoutes from './biweekly.js'
const router = Router()

// unprotected routes
router.use('/auth', auth)

// staff routes; admin.js narrows some to the board or admins
router.use('/admin', requireRole(...STAFF_ROLES), admin)

// protected routes with sign in only
router.use('/kpis', requireAuth, kpiRoutes)
router.use('/subkpis', requireAuth, subKpiRoutes)
router.use('/proposals', requireAuth, proposalRoutes)
router.use('/industries', requireAuth, industryRoutes)
router.use('/stages', requireAuth, stageRoutes)
router.use('/biweekly', requireAuth, biweeklyRoutes)
router.use('/ventures', requireAuth, ventures)

export default router

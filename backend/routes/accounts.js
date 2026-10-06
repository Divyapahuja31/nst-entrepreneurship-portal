import { Router } from 'express'

import {
  changeRole,
  createAccount,
  deactivateAccount,
  getAuditLog,
  listAccounts,
} from '../controllers/accounts.js'

// Mounted behind requireRole('admin') in routes/admin.js.
const router = Router()

router.get('/', listAccounts)
router.post('/', createAccount)
router.get('/audit-log', getAuditLog)
router.patch('/:userId/role', changeRole)
router.delete('/:userId', deactivateAccount)

export default router

import { Router } from 'express'
import {
  createBatch,
  createCampus,
  createDomain,
  deleteBatch,
  deleteCampus,
  deleteDomain,
  getSetupPage,
  updateDomain,
} from '../controllers/setup.js'

// Mounted for admins only (routes/admin.js).
const router = Router()

router.get('/', getSetupPage)
router.post('/campuses', createCampus)
router.delete('/campuses/:campusId', deleteCampus)
router.post('/batches', createBatch)
router.delete('/batches/:batchId', deleteBatch)
router.post('/domains', createDomain)
router.patch('/domains/:domainId', updateDomain)
router.delete('/domains/:domainId', deleteDomain)

export default router

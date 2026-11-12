import { Router } from 'express'
import {
  createReportCard,
  createTemplate,
  getStudentReportCard,
  listReportCardOptions,
  loadStudent,
  saveReportCard,
} from '../controllers/reportCards.js'

// Mounted behind the admin-only role check.
const router = Router()
router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

router.get('/', listReportCardOptions)
router.post('/templates', createTemplate)
router.get('/students/:studentId', loadStudent, getStudentReportCard)
router.post('/students/:studentId', loadStudent, createReportCard)
router.put('/students/:studentId', loadStudent, saveReportCard)

export default router

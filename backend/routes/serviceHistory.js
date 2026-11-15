import { Router } from 'express'
import {
  historyWindow,
  serviceHistory,
  validReference,
} from '../utils/serviceHistory.js'

const router = Router()

router.get('/', async (req, res) => {
  const window = historyWindow(req.query.day)
  const rawReference = req.query.reference
  const reference =
    typeof rawReference === 'string'
      ? rawReference.trim().toLowerCase()
      : rawReference
  res.set('Cache-Control', 'no-store')
  if (!window) {
    return res.status(400).json({ error: 'Choose a valid date up to today.' })
  }
  if (
    reference !== undefined &&
    reference !== '' &&
    !validReference(reference)
  ) {
    return res.status(400).json({ error: 'Enter a valid request reference.' })
  }
  return res.json(await serviceHistory(window, reference))
})

export default router

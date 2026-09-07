import { Router } from 'express'

import {
  signUp,
  signIn,
  signout,
  googleAuthCallback,
  googleAuth,
} from '../controllers/user.js'

const router = Router()

router.get('/google', googleAuth)
router.get('/google/callback', googleAuthCallback)

router.post('/signup', signUp)
router.post('/login', signIn)
router.post('/signout', signout)

export default router

import { Router } from 'express'

import {
  signUp,
  signIn,
  signOut,
  googleAuthCallback,
  googleAuth,
} from '../controllers/user.js'

const router = Router()

router.get('/google', googleAuth)
router.get('/google/callback', googleAuthCallback)

router.post('/signup', signUp)
router.post('/signin', signIn)
router.post('/signout', signOut)

export default router

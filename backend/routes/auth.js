import { Router } from 'express'

import {
  signUp,
  signIn,
  signOut,
  googleAuthCallback,
  googleAuth,
  completeGoogleSignup,
  getGoogleSignupOptions,
  portfolio,
} from '../controllers/user.js'

const router = Router()

router.get('/google', googleAuth)
router.get('/google/callback', googleAuthCallback)
router.post('/google/complete-signup', completeGoogleSignup)
router.get('/google/signup-options', getGoogleSignupOptions)

router.post('/signup', signUp)
router.post('/signin', signIn)
router.post('/signout', signOut)

router.get('/portfolio', portfolio)

export default router

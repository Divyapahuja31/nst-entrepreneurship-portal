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
  forgotPassword,
  verifyOtp,
  resetPassword,
  verifySignupOtp,
  resendSignupOtp,
} from '../controllers/user.js'

const router = Router()

router.get('/google', googleAuth)
router.get('/google/callback', googleAuthCallback)
router.post('/google/complete-signup', completeGoogleSignup)
router.get('/google/signup-options', getGoogleSignupOptions)

router.post('/signup', signUp)
router.post('/verify-signup-otp', verifySignupOtp)
router.post('/resend-signup-otp', resendSignupOtp)
router.post('/signin', signIn)
router.post('/signout', signOut)
router.post('/forgot-password', forgotPassword)
router.post('/verify-otp', verifyOtp)
router.post('/reset-password', resetPassword)

router.get('/portfolio', portfolio)

export default router

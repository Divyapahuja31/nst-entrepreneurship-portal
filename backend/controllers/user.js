import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import User from '../models/user.js'
import Campus from '../models/campus.js'
import Batch from '../models/batch.js'
import {
  validateAll,
  validateBatchAndCampus,
  validateName,
  validatePassword,
} from '../utils/validator.js'
import { getUserPortfolio } from '../utils/userPortfolio.js'
import {
  otpCooldownMessage,
  sendSignupCode,
  redeemSignupCode,
  clearSignupCode,
  sendPasswordResetCode,
  checkPasswordResetCode,
  redeemPasswordResetCode,
} from '../utils/otpHelper.js'
import {
  cookieOptions,
  signToken,
  signGoogleSignupToken,
  verifyGoogleSignupToken,
} from '../utils/token.js'
import {
  findRoleForEmail,
  getGoogleAuthUrl,
  normalizeEmail,
  startSession,
  verifyGoogleAuthCode,
} from '../utils/authHelper.js'

// Responses must not reveal whether an email has an account, so endpoints
// that take only an email answer the same way either way.
const SIGNUP_CODE_MESSAGE =
  'If this email is not registered yet, a 6-digit verification code has been sent to it. Already have an account? Sign in or reset your password instead.'
const RESET_CODE_MESSAGE =
  'If an account exists for this email, a 6-digit verification code has been sent to it. You can request a new code once a minute.'
const INVALID_VERIFICATION = 'Invalid or expired verification request'

// Compared against when no user matches, so sign-in takes as long as a real
// password check and its timing doesn't reveal which emails exist.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('no-such-user', 10)

export const signUp = async (req, res) => {
  try {
    const { username, email, password, batch, campus } = req.body

    const { position, role } = await findRoleForEmail(email)
    if (!role) {
      return res.status(500).json({
        error: `${position} role is not configured`,
      })
    }

    const error = {
      ...(await validateAll({ username, email, password, position })),
      ...(await validateBatchAndCampus({ batch, campus }, { required: false })),
    }
    if (Object.values(error).some(value => value.trim() !== '')) {
      return res.status(400).json({ error })
    }

    const normalizedEmail = normalizeEmail(email)
    let user = await User.findOne({ email: normalizedEmail })

    const codeResponse = {
      requireOtp: true,
      email: normalizedEmail,
      message: SIGNUP_CODE_MESSAGE,
    }

    if (user && user.isEmailVerified) {
      return res.status(200).json(codeResponse)
    }

    if (user) {
      // The account exists but nobody has proved they own this email, so it
      // may be someone else's (e.g. created by an admin). Leave it as it is
      // and keep these details until the emailed code is used.
      user.pendingSignup = {
        username,
        passwordHash: await bcrypt.hash(password, 10),
        batch: batch || undefined,
        campus: campus || undefined,
        role: role._id,
      }
    } else {
      user = new User({
        username,
        email: normalizedEmail,
        password,
        role: role._id,
        batch,
        campus,
        isEmailVerified: false,
      })
    }

    await sendSignupCode(user)

    return res.status(200).json(codeResponse)
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        error: {
          email: 'Email already in use',
        },
      })
    }

    console.error('SignUp error:', err)
    return res.status(500).json({
      error: 'Server error',
    })
  }
}

export const signIn = async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email: normalizeEmail(email) }).populate(
      'role'
    )
    if (!user) {
      await bcrypt.compare(String(password), DUMMY_PASSWORD_HASH)
    }
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        error: 'Invalid email or password',
      })
    }

    if (!user.isEmailVerified && !user.googleId) {
      const { retryAfter } = await sendSignupCode(user)

      return res.status(403).json({
        error: retryAfter
          ? `Your email address is not verified yet. ${otpCooldownMessage(retryAfter)}`
          : 'Your email address is not verified yet. A 6-digit verification code has been sent to your email.',
        requireOtp: true,
        email: user.email,
      })
    }

    return await startSession(res, user)
  } catch (err) {
    console.error('SignIn error:', err)
    return res.status(500).json({
      error: 'Server error',
    })
  }
}

export const signOut = async (_, res) => {
  return res.clearCookie('token', cookieOptions).json({ success: true })
}

export const portfolio = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const data = await getUserPortfolio(req.user.id)
  if (!data) {
    return res.status(404).json({ error: 'User not found' })
  }

  return res.json(data)
}

// Ties Google's callback to the browser that started sign-in. Without it, an
// attacker could send someone their own callback link and sign them in to
// the attacker's account.
const OAUTH_STATE_COOKIE = 'google_oauth_state'
const oauthStateCookieOptions = { ...cookieOptions, maxAge: 10 * 60 * 1000 }

export const googleAuth = (req, res) => {
  const state = crypto.randomBytes(32).toString('hex')
  return res
    .cookie(OAUTH_STATE_COOKIE, state, oauthStateCookieOptions)
    .redirect(getGoogleAuthUrl(state))
}

const hasValidOAuthState = req => {
  const { state } = req.query
  const expected = req.cookies[OAUTH_STATE_COOKIE]
  return typeof state === 'string' && Boolean(expected) && state === expected
}

export const googleAuthCallback = async (req, res) => {
  try {
    const { code } = req.query
    const validState = hasValidOAuthState(req)
    res.clearCookie(OAUTH_STATE_COOKIE, oauthStateCookieOptions)
    if (!validState) {
      return res
        .status(400)
        .send(
          'Google sign-in expired or was not started here. Please try again.'
        )
    }

    if (!code) {
      return res.status(400).send('Google authorization code is missing.')
    }

    const verificationResult = await verifyGoogleAuthCode(code)
    if (verificationResult.error) {
      return res
        .status(verificationResult.status)
        .send(verificationResult.error)
    }

    const { googleId, email } = verificationResult

    const user = await User.findOne({
      $or: [{ googleId }, { email }],
    }).populate('role')

    if (user) {
      if (!user.isEmailVerified) {
        // Nobody proved ownership of this email before Google did, so the
        // password or a pending sign-up may be someone else's. Drop them.
        user.password = undefined
        user.pendingSignup = undefined
        clearSignupCode(user)
      }
      if (!user.googleId || !user.isEmailVerified) {
        user.googleId = googleId
        user.isEmailVerified = true
        await user.save()
      }

      return res
        .cookie('token', signToken(user), cookieOptions)
        .redirect(process.env.FRONTEND_URL)
    }

    const signupToken = signGoogleSignupToken({ googleId, email })

    return res.redirect(
      `${process.env.FRONTEND_URL}/complete-signup?token=${encodeURIComponent(
        signupToken
      )}`
    )
  } catch (error) {
    console.error('Authentication error:', error)
    return res.status(500).send('Authentication failed')
  }
}

export const getGoogleSignupOptions = async (req, res) => {
  try {
    const [campuses, batches] = await Promise.all([
      Campus.find().sort({ name: 1 }),
      Batch.find().populate('campus', 'name').sort({ name: 1 }),
    ])

    return res.status(200).json({
      campuses,
      batches,
    })
  } catch (error) {
    console.error('Get Google signup options error:', error)
    return res.status(500).json({
      error: 'Failed to load signup options',
    })
  }
}

const parseGoogleSignupToken = token => {
  if (!token) {
    return { error: 'Signup token is required' }
  }
  try {
    return { data: verifyGoogleSignupToken(token) }
  } catch {
    return { error: 'Signup token is invalid or expired' }
  }
}

export const completeGoogleSignup = async (req, res) => {
  try {
    const { token, username, batch, campus } = req.body
    const parsed = parseGoogleSignupToken(token)
    if (parsed.error) {
      return res.status(401).json({ error: parsed.error })
    }

    const { googleId, email } = parsed.data

    // Same name rules as email sign-up, and real batch/campus records.
    const fieldErrors = [
      validateName(username),
      ...Object.values(
        await validateBatchAndCampus({ batch, campus }, { required: true })
      ),
    ].filter(Boolean)
    if (fieldErrors.length) {
      return res.status(400).json({ error: fieldErrors[0] })
    }

    const { position, role } = await findRoleForEmail(email)
    if (!role) {
      console.error(`${position} role does not exist in database`)
      return res.status(500).json({
        error: `${position} role is not configured`,
      })
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { googleId }],
    })
    if (existingUser) {
      return res.status(409).json({
        error: 'An account already exists with this Google account',
      })
    }

    const user = new User({
      username,
      email,
      googleId,
      batch,
      campus,
      role: role._id,
      isEmailVerified: true,
    })

    await user.save()
    user.role = role

    return await startSession(res, user, { status: 201 })
  } catch (error) {
    console.error('Complete Google signup error:', error)
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Email already in use',
      })
    }

    return res.status(500).json({
      error: 'Server error',
    })
  }
}

export const forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email)
    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    // Same answer for unknown emails and during the cooldown, when the code
    // sent moments ago is still valid.
    const user = await User.findOne({ email })
    if (user) {
      await sendPasswordResetCode(user)
    }

    return res.status(200).json({ message: RESET_CODE_MESSAGE })
  } catch (error) {
    console.error('Forgot password error:', error)
    const isDbTimeout =
      error.message?.includes('buffering timed out') ||
      error.message?.includes('selection timed out')
    return res.status(500).json({
      error: isDbTimeout
        ? 'Database connection timed out. Please try again in a moment.'
        : 'Failed to process forgot password request',
    })
  }
}

export const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body
    const email = normalizeEmail(req.body.email)

    if (!email || !otp) {
      return res
        .status(400)
        .json({ error: 'Email and verification code are required' })
    }

    const user = await User.findOne({ email })
    const validationError = await checkPasswordResetCode(user, otp)
    if (validationError) {
      return res.status(400).json({ error: validationError })
    }

    return res
      .status(200)
      .json({ message: 'Verification code verified successfully' })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return res.status(500).json({ error: 'Failed to verify code' })
  }
}

export const resetPassword = async (req, res) => {
  try {
    const { otp, password } = req.body
    const email = normalizeEmail(req.body.email)

    if (!email || !otp || !password) {
      return res.status(400).json({
        error: 'Email, verification code, and new password are required',
      })
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      return res.status(400).json({ error: passwordError })
    }

    const user = await User.findOne({ email })
    const validationError = await redeemPasswordResetCode(user, otp)
    if (validationError) {
      return res.status(400).json({ error: validationError })
    }

    user.password = password
    // Whoever needed a reset may have had their session stolen too.
    user.sessionVersion += 1
    await user.save()

    return res
      .status(200)
      .json({ message: 'Password reset successfully! You can now log in.' })
  } catch (error) {
    console.error('Reset password error:', error)
    return res.status(500).json({ error: 'Failed to reset password' })
  }
}

// Whether the password matches the sign-up that sent the code: the pending
// one for an account that already existed, otherwise the account's own.
const signupPasswordMatches = (user, password) =>
  user.pendingSignup?.passwordHash
    ? bcrypt.compare(password, user.pendingSignup.passwordHash)
    : user.comparePassword(password)

// Once the code proves the email, the pending sign-up becomes the account.
const adoptPendingSignup = (user, password) => {
  const pending = user.pendingSignup
  if (!pending?.passwordHash) {
    return
  }
  user.username = pending.username
  user.password = password
  user.role = pending.role
  user.batch = pending.batch
  user.campus = pending.campus
  user.pendingSignup = undefined
}

export const verifySignupOtp = async (req, res) => {
  try {
    const { otp, password } = req.body
    const email = normalizeEmail(req.body.email)

    if (!email || !otp || !password) {
      return res.status(400).json({
        error: 'Email, password and verification code are required',
      })
    }

    // Never issue a session here without a valid code, or anyone could log in
    // as a verified user just by knowing their email. Unknown and verified
    // emails get the same error as a bad request.
    const user = await User.findOne({ email }).populate('role')
    if (!user || user.isEmailVerified) {
      return res.status(400).json({ error: INVALID_VERIFICATION })
    }

    const validationError = await redeemSignupCode(user, otp)
    if (validationError) {
      return res.status(400).json({ error: validationError })
    }

    // Checked after the code so this can't be used to guess passwords. A
    // newer sign-up for the same email means these details are stale.
    if (!(await signupPasswordMatches(user, password))) {
      return res.status(400).json({
        error: 'Your sign-up details have changed. Please sign up again.',
      })
    }

    adoptPendingSignup(user, password)
    user.isEmailVerified = true
    await user.save()
    await user.populate('role')

    return await startSession(res, user, {
      message: 'Email verified successfully!',
    })
  } catch (error) {
    console.error('Verify signup OTP error:', error)
    return res.status(500).json({ error: 'Failed to verify code' })
  }
}

export const resendSignupOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email)

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    const user = await User.findOne({ email })
    if (user && !user.isEmailVerified) {
      await sendSignupCode(user)
    }

    return res.status(200).json({ message: SIGNUP_CODE_MESSAGE })
  } catch (error) {
    console.error('Resend signup OTP error:', error)
    return res.status(500).json({ error: 'Failed to resend verification code' })
  }
}

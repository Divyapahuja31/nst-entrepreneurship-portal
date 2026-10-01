import User from '../models/user.js'
import Campus from '../models/campus.js'
import Batch from '../models/batch.js'
import { validateAll, validatePassword } from '../utils/validator.js'
import { getUserPortfolio } from '../utils/userPortfolio.js'
import {
  otpCooldownMessage,
  sendSignupCode,
  checkSignupCode,
  clearSignupCode,
  sendPasswordResetCode,
  checkPasswordResetCode,
  clearPasswordResetCode,
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

export const signUp = async (req, res) => {
  try {
    const { username, email, password, batch, campus } = req.body

    const { position, role } = await findRoleForEmail(email)
    if (!role) {
      return res.status(500).json({
        error: `${position} role is not configured`,
      })
    }

    const error = await validateAll({
      username,
      email,
      password,
      position,
    })
    if (Object.values(error).some(value => value.trim() !== '')) {
      return res.status(400).json({ error })
    }

    const normalizedEmail = normalizeEmail(email)
    let user = await User.findOne({ email: normalizedEmail })

    if (user && user.isEmailVerified) {
      return res.status(409).json({
        error: {
          email: 'Email already in use',
        },
      })
    }

    if (user) {
      user.username = username
      user.password = password
      user.role = role._id
      user.batch = batch
      user.campus = campus
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

    const { retryAfter } = await sendSignupCode(user)

    return res.status(200).json({
      requireOtp: true,
      email: user.email,
      message: retryAfter
        ? otpCooldownMessage(retryAfter)
        : 'A 6-digit verification code has been sent to your email.',
    })
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
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        error: 'Invalid email or password',
      })
    }

    if (!user.isEmailVerified && !user.googleId) {
      await sendSignupCode(user)

      return res.status(403).json({
        error:
          'Your email address is not verified yet. A 6-digit verification code has been sent to your email.',
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

export const googleAuth = (req, res) => {
  const url = getGoogleAuthUrl()
  return res.redirect(url)
}

export const googleAuthCallback = async (req, res) => {
  try {
    const { code } = req.query
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
        // password may have been set by someone else. Drop it.
        user.password = undefined
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

    if (!username || !batch || !campus) {
      return res.status(400).json({
        error: 'Name, batch and campus are required',
      })
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

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({
        error: 'No account found with this email address.',
      })
    }

    // On cooldown the code sent moments ago is still valid, so let the user
    // carry on to entering it rather than failing.
    const { retryAfter } = await sendPasswordResetCode(user)

    return res.status(200).json({
      message: retryAfter
        ? otpCooldownMessage(retryAfter)
        : 'A 6-digit verification code has been sent to your email.',
    })
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
    const validationError = await checkPasswordResetCode(user, otp)
    if (validationError) {
      return res.status(400).json({ error: validationError })
    }

    user.password = password
    clearPasswordResetCode(user)
    await user.save()

    return res
      .status(200)
      .json({ message: 'Password reset successfully! You can now log in.' })
  } catch (error) {
    console.error('Reset password error:', error)
    return res.status(500).json({ error: 'Failed to reset password' })
  }
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

    const user = await User.findOne({ email }).populate('role')
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email' })
    }

    // Never issue a session here without a valid code, or anyone could log in
    // as a verified user just by knowing their email.
    if (user.isEmailVerified) {
      return res
        .status(400)
        .json({ error: 'Email is already verified. Please sign in.' })
    }

    const validationError = await checkSignupCode(user, otp)
    if (validationError) {
      return res.status(400).json({ error: validationError })
    }

    // Anyone can sign up again with an unverified email and replace its
    // password. Checked after the code so this can't be used to guess passwords.
    if (!(await user.comparePassword(password))) {
      return res.status(400).json({
        error: 'Your sign-up details have changed. Please sign up again.',
      })
    }

    user.isEmailVerified = true
    clearSignupCode(user)
    await user.save()

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
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email' })
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Email is already verified' })
    }

    const { retryAfter } = await sendSignupCode(user)
    if (retryAfter) {
      return res.status(429).json({ error: otpCooldownMessage(retryAfter) })
    }

    return res.status(200).json({
      message: 'A new 6-digit verification code has been sent to your email.',
    })
  } catch (error) {
    console.error('Resend signup OTP error:', error)
    return res.status(500).json({ error: 'Failed to resend verification code' })
  }
}

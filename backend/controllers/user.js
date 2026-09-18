import crypto from 'crypto'
import User from '../models/user.js'
import Campus from '../models/campus.js'
import Batch from '../models/batch.js'
import Role from '../models/role.js'
import { findVentureForUser } from '../utils/founderHelper.js'
import VentureProposal from '../models/ventureProposal.js'
import VentureJoinRequest from '../models/ventureJoinRequest.js'
import { validateAll } from '../utils/validator.js'
import { sendResetPasswordEmail } from '../utils/emailService.js'
import {
  cookieOptions,
  signToken,
  signGoogleSignupToken,
  verifyGoogleSignupToken,
} from '../utils/token.js'
import {
  determineUserRole,
  getGoogleAuthUrl,
  verifyGoogleAuthCode,
} from '../utils/authHelper.js'

export const signUp = async (req, res) => {
  try {
    const { username, email, password, batch, campus } = req.body

    const position = determineUserRole(email)
    const role = await Role.findOne({ name: position })

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

    const user = new User({
      username,
      email: email.toLowerCase(),
      password,
      role: role._id,
      batch,
      campus,
    })

    await user.save()
    user.role = role

    const userPortfolio = await getUserPortfolio(user._id)

    return res
      .cookie('token', signToken(user), cookieOptions)
      .status(201)
      .json({ user: userPortfolio || user })
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

export const getUserPortfolio = async userId => {
  const [user, venture] = await Promise.all([
    User.findById(userId).populate(['role', 'batch', 'campus']),
    findVentureForUser(userId),
  ])

  if (!user) {
    return null
  }

  if (venture) {
    await venture.populate([
      {
        path: 'founders',
        populate: { path: 'user', select: 'username email' },
      },
      {
        path: 'campus',
        select: 'name',
      },
      {
        path: 'industry',
        select: 'name',
      },
    ])
  }

  const founders = venture
    ? venture.founders.map(founder => founder.user).filter(Boolean)
    : []

  const application = venture ? null : await getPendingApplication(userId)

  return {
    ...user.toJSON(),
    ventureId: venture?._id || null,
    venture: venture ? { ...venture.toJSON(), founders } : null,
    application,
  }
}

export const signIn = async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email }).populate('role')
    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password',
      })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid email or password',
      })
    }

    const userPortfolio = await getUserPortfolio(user._id)

    return res
      .cookie('token', signToken(user), cookieOptions)
      .json({ user: userPortfolio || user })
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

const getPendingApplication = async userId => {
  const [proposal, joinRequest] = await Promise.all([
    VentureProposal.findOne({ submittedBy: userId }).sort({ createdAt: -1 }),
    VentureJoinRequest.findOne({ requestedBy: userId })
      .sort({ createdAt: -1 })
      .populate('venture', 'name'),
  ])

  const applications = []

  if (proposal) {
    applications.push({
      type: 'PROPOSAL',
      id: proposal._id,
      status: proposal.status,
      ventureName: proposal.startupName,
      submittedAt: proposal.createdAt,
    })
  }

  if (joinRequest) {
    applications.push({
      type: 'JOIN_REQUEST',
      id: joinRequest._id,
      status: joinRequest.status,
      ventureName: joinRequest.venture?.name || null,
      submittedAt: joinRequest.createdAt,
    })
  }

  const pending = applications.filter(item => item.status === 'PENDING')
  const candidates = pending.length ? pending : applications

  return candidates.sort((a, b) => b.submittedAt - a.submittedAt)[0] || null
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
      if (!user.googleId) {
        user.googleId = googleId
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

    const position = determineUserRole(email)
    const role = await Role.findOne({ name: position })
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
    })

    await user.save()
    user.role = role

    const userPortfolio = await getUserPortfolio(user._id)

    return res
      .cookie('token', signToken(user), cookieOptions)
      .status(201)
      .json({ user: userPortfolio || user })
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
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) {
      return res.status(200).json({
        message:
          'If an account with that email exists, a password reset link has been sent.',
      })
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    user.resetPasswordToken = resetToken
    user.resetPasswordExpires = new Date(Date.now() + 3600000)
    await user.save()

    const frontendUrl =
      process.env.FRONTEND_URL?.trim() || 'http://localhost:5173'
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`

    await sendResetPasswordEmail({
      to: user.email,
      username: user.username,
      resetUrl,
    })

    return res.status(200).json({
      message:
        'If an account with that email exists, a password reset link has been sent.',
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return res.status(500).json({
      error: error.message || 'Failed to process forgot password request',
    })
  }
}

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      return res
        .status(400)
        .json({ error: 'Token and new password are required' })
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 8 characters long' })
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    })

    if (!user) {
      return res
        .status(400)
        .json({ error: 'Invalid or expired password reset token' })
    }

    user.password = password
    user.resetPasswordToken = null
    user.resetPasswordExpires = null
    await user.save()

    return res
      .status(200)
      .json({ message: 'Password reset successfully. You can now log in.' })
  } catch (error) {
    console.error('Reset password error:', error)
    return res.status(500).json({ error: 'Failed to reset password' })
  }
}

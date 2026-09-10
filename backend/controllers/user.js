import User from '../models/user.js'
import Campus from '../models/campus.js'
import Batch from '../models/batch.js'
import Role from '../models/role.js'
import Venture from '../models/venture.js'
import { validateAll } from '../utils/validator.js'
import {
  cookieOptions,
  signToken,
  signGoogleSignupToken,
  verifyGoogleSignupToken,
} from '../utils/token.js'
import { OAuth2Client } from 'google-auth-library'
import 'dotenv/config'

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

const ALLOWED_GOOGLE_DOMAINS = new Set(['newtonschool.co', 'adypu.edu.in'])

const signUp = async (req, res) => {
  try {
    const { username, email, password, batch, campus } = req.body

    let position = 'student'
    const emailSplit = email.split('@')
    if (emailSplit.length === 2 && emailSplit[1] === 'newtonschool.co') {
      position = 'admin'
    }

    const roles = await Role.findOne({
      name: position,
    })

    const error = validateAll({
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
      role: roles._id,
      batch,
      campus,
    })

    await user.save()
    await user.populate('role')

    return res
      .cookie('token', signToken(user), cookieOptions)
      .status(201)
      .json({ user })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        error: {
          email: 'Email or username already in use',
        },
      })
    }

    console.error(err)

    return res.status(500).json({
      error: 'Server error',
    })
  }
}

const signIn = async (req, res) => {
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

    return res.cookie('token', signToken(user), cookieOptions).json({ user })
  } catch (err) {
    console.error(err)

    return res.status(500).json({
      error: 'Server error',
    })
  }
}

const portfolio = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const user = await User.findById(req.user.id).populate('role')
  const venture = await Venture.findOne({ founders: req.user.id })
  return res.json({
    ...(user ? user.toJSON() : req.user),
    ventureId: venture?._id || null,
    venture: venture || null,
  })
}

const googleAuth = (req, res) => {
  const url = client.generateAuthUrl({
    access_type: 'offline',

    scope: ['openid', 'email'],

    prompt: 'select_account',
  })
  res.redirect(url)
}

const googleAuthCallback = async (req, res) => {
  try {
    const { code } = req.query

    if (!code) {
      return res.status(400).send('Google authorization code is missing.')
    }

    const { tokens } = await client.getToken(code)

    client.setCredentials(tokens)
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()

    const { sub: googleId, email, email_verified: emailVerified } = payload

    if (!email) {
      return res.status(403).send('Google did not provide an email address.')
    }

    if (!emailVerified) {
      return res
        .status(403)
        .send(
          'Your Google email address is not verified. Please verify it with Google first.'
        )
    }

    const domain = email.split('@')[1]?.toLowerCase()

    if (!ALLOWED_GOOGLE_DOMAINS.has(domain)) {
      return res
        .status(403)
        .send('Only ADYPU and Newton School Google accounts are allowed.')
    }

    const user = await User.findOne({
      $or: [{ googleId }, { email: email.toLowerCase() }],
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

    const signupToken = signGoogleSignupToken({
      googleId,
      email: email.toLowerCase(),
    })

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

const getGoogleSignupOptions = async (req, res) => {
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

const completeGoogleSignup = async (req, res) => {
  try {
    const { token, username, batch, campus } = req.body
    if (!token) {
      return res.status(401).json({
        error: 'Signup token is required',
      })
    }

    let googleData

    try {
      googleData = verifyGoogleSignupToken(token)
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      return res.status(401).json({
        error: 'Signup token is invalid or expired',
      })
    }

    const { googleId, email } = googleData

    if (!username || !batch || !campus) {
      return res.status(400).json({
        error: 'Name, batch and campus are required',
      })
    }

    const studentRole = await Role.findOne({
      name: 'student',
    })

    if (!studentRole) {
      console.error('Student role does not exist in database')

      return res.status(500).json({
        error: 'Student role is not configured',
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

      role: studentRole._id,
    })

    await user.save()
    user.role = studentRole
    return res
      .cookie('token', signToken(user), cookieOptions)
      .status(201)
      .json({
        user,
      })
  } catch (error) {
    console.error('Complete Google signup error:', error)

    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Email or username already in use',
      })
    }

    return res.status(500).json({
      error: 'Server error',
    })
  }
}

const signOut = async (_, res) => {
  return res.clearCookie('token', cookieOptions).json({ success: true })
}

export {
  signUp,
  signIn,
  signOut,
  googleAuthCallback,
  googleAuth,
  portfolio,
  completeGoogleSignup,
  getGoogleSignupOptions,
}

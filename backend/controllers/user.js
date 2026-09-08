import User from '../models/user.js'
import { validateAll } from '../utils/validator.js'
import { cookieOptions, signToken } from '../utils/token.js'
import { OAuth2Client } from 'google-auth-library'
import 'dotenv/config'

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:4000/api/auth/google/callback'
)

const signUp = async (req, res) => {
  try {
    const { username, email, password, position } = req.body
    const error = validateAll({ username, email, password, position })
    if (Object.values(error).some(value => value.trim() !== '')) {
      return res.status(400).json({ error })
    }

    const user = new User({ username, email, password, position })

    await user.save()

    return res
      .cookie('token', signToken(user), cookieOptions)
      .status(201)
      .json({ user })
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ error: { email: 'Email or username already in use' } })
    }
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}

const signIn = async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    return res.cookie('token', signToken(user), cookieOptions).json({ user })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}

const googleAuth = (req, res) => {
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/userinfo.email'],
  })
  res.redirect(url)
}

const googleAuthCallback = async (req, res) => {
  try {
    const { code } = req.query
    const { tokens } = await client.getToken(code)
    client.setCredentials(tokens)

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()

    const email = payload.email
    const isVerified = payload.email_verified

    if (!isVerified) {
      return res
        .status(403)
        .send(
          'Your Google email address is not verified. Please verify it with Google first.'
        )
    }

    const user = await User.findOne({ email })

    if (!user) {
      return res.status(401).json({
        error:
          "Email doesn't exist, please signup with your email and then retry",
      })
    }

    return res.cookie('token', signToken(user), cookieOptions).json({ user })
  } catch (error) {
    console.error('Authentication error:', error)
    return res.status(500).send('Authentication failed')
  }
}

const signOut = async (_, res) => {
  return res.clearCookie('token', cookieOptions).json({ success: true })
}

export { signUp, signIn, signOut, googleAuthCallback, googleAuth }

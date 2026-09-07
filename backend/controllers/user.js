import User from '../models/user.js'
import { validateAll } from '../utils/validator.js'
import { cookieOptions, signToken } from '../utils/token.js'

const signUp = async (req, res) => {
  try {
    const { username, email, password, position } = req.body
    const error = validateAll({ username, email, password, position })
    if (error) {
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
      return res.status(409).json({ error: 'Email or username already in use' })
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

const logout = async (_, res) => {
  return res.clearCookie('token', cookieOptions).json({ success: true })
}

export { signUp, signIn, logout }

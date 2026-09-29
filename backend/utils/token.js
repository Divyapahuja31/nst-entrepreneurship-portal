import jwt from 'jsonwebtoken'

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }
  return secret
}
const TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: TOKEN_MAX_AGE,
}

const JWT_OPTIONS = {
  algorithm: 'HS256',
  expiresIn: '30d',
}

export const signToken = user => {
  const roleName = user.role?.name || user.role
  return jwt.sign(
    { userId: user._id, email: user.email, role: roleName },
    getJwtSecret(),
    JWT_OPTIONS
  )
}

export function validateToken(token) {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), JWT_OPTIONS)
    return { valid: true, payload: decoded }
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return { valid: false, reason: 'Token has expired' }
    }
    if (error.name === 'JsonWebTokenError') {
      return { valid: false, reason: 'Invalid signature or payload' }
    }
    return { valid: false, reason: error.message }
  }
}

export const signGoogleSignupToken = ({ googleId, email }) => {
  return jwt.sign(
    {
      googleId,
      email,
      type: 'google-signup',
    },
    getJwtSecret(),
    {
      expiresIn: '10m',
    }
  )
}

export const verifyGoogleSignupToken = token => {
  const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] })

  if (decoded.type !== 'google-signup') {
    throw new Error('Invalid Google signup token')
  }

  return decoded
}

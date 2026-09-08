import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || '12345678'
const TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: TOKEN_MAX_AGE,
}
export const signToken = user => {
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '30d',
    }
  )
}

export function validateToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })
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

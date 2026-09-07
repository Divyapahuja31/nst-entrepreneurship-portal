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
  jwt.sign({userId: user._id, email: user.email}, JWT_SECRET, {
    expiresIn: '30d',
  })
}

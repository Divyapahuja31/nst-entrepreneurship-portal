import { validateToken } from './utils/token.js'

export default function authMiddleware(req, res, next) {
  const token = req.cookies.token
  const response = validateToken(token)
  if (response.valid) {
    req.user = {
      id: response.payload.userId,
      email: response.payload.email,
      role: response.payload.role,
    }
  }
  next()
}

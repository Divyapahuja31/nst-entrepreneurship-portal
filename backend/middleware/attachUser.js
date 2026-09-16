import { validateToken } from '../utils/token.js'

// Runs on every request to identify the caller, it never rejects any request allowing public routes to be reachable. Use requireAuth to gate a route.
export default function attachUser(req, res, next) {
  const { valid, payload } = validateToken(req.cookies.token)

  if (valid) {
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
    }
  }

  return next()
}

import requireAuth from './requireAuth.js'

const requireRole =
  (...roles) =>
  (req, res, next) =>
    requireAuth(req, res, () => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden' })
      }

      return next()
    })

export default requireRole

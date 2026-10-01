import { rateLimit, ipKeyGenerator } from 'express-rate-limit'
import { normalizeEmail } from '../utils/authHelper.js'

const WINDOW_MS = 15 * 60 * 1000

const limiter = (limit, options = {}) =>
  rateLimit({
    windowMs: WINDOW_MS,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
    ...options,
  })

// Caps all auth traffic from one IP, which also limits email sending. Kept
// generous because students on a campus network can share one IP.
export const authLimiter = limiter(300)

// Failed password or code guesses for one account from one IP. Keyed on the
// pair so an attacker elsewhere can't lock the real user out of their account.
export const guessLimiter = limiter(10, {
  skipSuccessfulRequests: true,
  keyGenerator: req =>
    `${ipKeyGenerator(req.ip)}:${normalizeEmail(req.body?.email) ?? ''}`,
})

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cookieParser from 'cookie-parser'
import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import routes from './routes/index.js'
import attachUser from './middleware/attachUser.js'

// The Express app, without a database connection or a listening port, so
// tests can drive it directly. server.js starts it.
const app = express()

// Behind a reverse proxy, set TRUST_PROXY to the number of proxy hops so
// req.ip is the client's address. Otherwise rate limits would treat every
// user as one client. Only a hop count is accepted: `true` would trust a
// spoofed X-Forwarded-For and let anyone dodge the limits.
const { TRUST_PROXY } = process.env
if (TRUST_PROXY) {
  if (!/^\d+$/.test(TRUST_PROXY)) {
    throw new Error(
      `TRUST_PROXY must be the number of proxy hops (e.g. 1), got "${TRUST_PROXY}"`
    )
  }
  app.set('trust proxy', Number(TRUST_PROXY))
}

app.disable('x-powered-by')

// Baseline security headers. Framing is blocked so another site can't overlay
// admin actions (clickjacking), and nosniff stops browsers treating an
// uploaded evidence file as a page. A full Content-Security-Policy needs
// testing against MUI's inline styles, so only frame-ancestors is set here.
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "frame-ancestors 'none'",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  })
  next()
})

// The frontend calls the API on its own origin, so other sites get no
// credentialed cross-origin access.
app.use(
  cors({
    origin: process.env.FRONTEND_URL || false,
    credentials: true,
  })
)
app.use(express.json())
app.use(cookieParser())
app.use(attachUser)

app.use('/api', routes)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendDist = path.resolve(__dirname, '../frontend/dist')

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist))
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(frontendDist, 'index.html'))
    }
    return next()
  })
}

export default app

import crypto from 'node:crypto'

import GoogleCredential from '../models/googleCredential.js'
import {
  REQUIRED_SCOPES,
  getGoogleWorkspace,
} from '../utils/googleWorkspace.js'
import { cookieOptions } from '../utils/token.js'
import { encryptToken, decryptToken } from '../utils/tokenCrypto.js'

// A mentor connects their Google Calendar so the portal can put check-ins on
// it. The route allows mentors only.

// Ties Google's callback to the browser that started connecting, and
// remembers which page to return to.
const STATE_COOKIE = 'google_calendar_state'
const stateCookieOptions = { ...cookieOptions, maxAge: 10 * 60 * 1000 }

// Only a path on this site, so the callback can't redirect elsewhere.
const safeReturnPath = value =>
  typeof value === 'string' && /^\/(?![/\\])/.test(value) ? value : '/admin'

const frontendUrl = () => (process.env.FRONTEND_URL || '').replace(/\/+$/, '')

// Back to the page the mentor came from, with ?calendar=<outcome>.
const returnTo = (path, outcome) => {
  const url = new URL(path, 'http://x')
  url.searchParams.set('calendar', outcome)
  return `${frontendUrl()}${url.pathname}${url.search}`
}

export const connectGoogle = (req, res) => {
  const state = crypto.randomBytes(32).toString('hex')
  const path = safeReturnPath(req.query.returnTo)
  return res
    .cookie(STATE_COOKIE, JSON.stringify({ state, path }), stateCookieOptions)
    .redirect(
      getGoogleWorkspace().authUrl({ state, loginHint: req.user.email })
    )
}

const readState = req => {
  try {
    const saved = JSON.parse(req.cookies[STATE_COOKIE] ?? '')
    return typeof saved?.state === 'string' ? saved : null
  } catch {
    return null
  }
}

export const googleCallback = async (req, res) => {
  const saved = readState(req)
  res.clearCookie(STATE_COOKIE, stateCookieOptions)
  const { state, code, error } = req.query
  if (!saved || typeof state !== 'string' || state !== saved.state) {
    return res
      .status(400)
      .send(
        'Connecting Google Calendar expired or was not started here. Please try again.'
      )
  }
  const back = outcome => res.redirect(returnTo(saved.path, outcome))

  if (error || typeof code !== 'string') {
    return back('denied')
  }

  try {
    const granted = await getGoogleWorkspace().exchangeCode(code)
    // The check-ins go on the mentor's own work calendar, not another
    // account they happen to be signed in to.
    if (granted.email !== req.user.email.toLowerCase()) {
      return back('wrong-account')
    }
    if (
      !granted.refreshToken ||
      !REQUIRED_SCOPES.every(scope => granted.scopes.includes(scope))
    ) {
      return back('missing-access')
    }

    await GoogleCredential.findOneAndUpdate(
      { user: req.user.id },
      {
        $set: {
          googleEmail: granted.email,
          scopes: granted.scopes,
          refreshToken: encryptToken(granted.refreshToken),
          connectedAt: new Date(),
          needsReconnect: false,
        },
      },
      { upsert: true }
    )
    return back('connected')
  } catch (err) {
    console.error('Google Calendar connect error:', err.message)
    return back('failed')
  }
}

export const googleStatus = async (req, res) => {
  try {
    const credential = await GoogleCredential.findOne({ user: req.user.id })
    return res.json({
      connected: Boolean(credential),
      googleEmail: credential?.googleEmail ?? null,
      needsReconnect: Boolean(credential?.needsReconnect),
    })
  } catch (error) {
    console.error('Google status error:', error)
    return res.status(500).json({ error: 'Could not check Google Calendar' })
  }
}

// Check-ins already on the calendar stay there; the portal just can't
// change them until the mentor connects again.
export const disconnectGoogle = async (req, res) => {
  try {
    const credential = await GoogleCredential.findOneAndDelete({
      user: req.user.id,
    }).select('+refreshToken')
    if (credential) {
      await getGoogleWorkspace()
        .revoke(decryptToken(credential.refreshToken))
        .catch(error =>
          console.warn('Google token not revoked:', error.message)
        )
    }
    return res.json({ connected: false })
  } catch (error) {
    console.error('Google disconnect error:', error)
    return res
      .status(500)
      .json({ error: 'Could not disconnect Google Calendar' })
  }
}

import { OAuth2Client } from 'google-auth-library'

// Google Calendar for one mentor at a time, over REST with the OAuth client
// we already have (no googleapis package). Every call after sign-in takes
// the mentor's refresh token first. Tests swap in a fake with
// setGoogleWorkspace.
//
// Mentors connect through their own OAuth client when
// GOOGLE_WORKSPACE_CLIENT_ID is set, so the calendar scopes stay off the
// sign-in client the students use. Otherwise the sign-in client is used.

export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events'
export const MEET_SCOPE =
  'https://www.googleapis.com/auth/meetings.space.readonly'
export const REQUIRED_SCOPES = Object.freeze([CALENDAR_SCOPE, MEET_SCOPE])

const EVENTS_URL =
  'https://www.googleapis.com/calendar/v3/calendars/primary/events'

const env = name =>
  process.env[`GOOGLE_WORKSPACE_${name}`] || process.env[`GOOGLE_${name}`]

const oauthClient = () =>
  new OAuth2Client(
    env('CLIENT_ID'),
    env('CLIENT_SECRET'),
    env('REDIRECT_URI') || 'http://localhost:4000/api/google/callback'
  )

// A failed Google call. `reconnect` means Google no longer accepts the
// mentor's token, so they must connect again.
export class GoogleError extends Error {
  constructor(message, { status = 502, reconnect = false, code } = {}) {
    super(message)
    this.name = 'GoogleError'
    this.status = status
    this.reconnect = reconnect
    this.code = code
  }
}

const isInvalidGrant = error =>
  error.response?.data?.error === 'invalid_grant' ||
  /invalid_grant/.test(error.message)

const errorMessage = error => {
  const data = error.response?.data
  return (
    data?.error?.message ||
    data?.error_description ||
    error.message ||
    'Google did not respond'
  )
}

const toGoogleError = error =>
  new GoogleError(errorMessage(error), {
    status: error.status ?? error.response?.status,
    reconnect: isInvalidGrant(error),
  })

const call = async (refreshToken, options) => {
  const client = oauthClient()
  client.setCredentials({ refresh_token: refreshToken })
  try {
    const { data } = await client.request(options)
    return data
  } catch (error) {
    throw toGoogleError(error)
  }
}

const eventUrl = id => `${EVENTS_URL}/${encodeURIComponent(id)}`

// Attendees hear about every change, so their calendars stay in step.
const NOTIFY = { sendUpdates: 'all' }

const listInstances = async (refreshToken, eventId) => {
  const instances = []
  let pageToken
  do {
    const page = await call(refreshToken, {
      url: `${eventUrl(eventId)}/instances`,
      params: { maxResults: 50, pageToken },
    })
    instances.push(...(page.items ?? []))
    pageToken = page.nextPageToken
  } while (pageToken)
  return instances
}

export const createGoogleWorkspace = () => ({
  name: 'google',

  authUrl: ({ state, loginHint }) =>
    oauthClient().generateAuthUrl({
      access_type: 'offline',
      // Always ask, so Google sends a refresh token even on a reconnect.
      prompt: 'consent',
      include_granted_scopes: true,
      scope: ['openid', 'email', ...REQUIRED_SCOPES],
      state,
      login_hint: loginHint,
    }),

  // Returns { email, scopes, refreshToken } for the account that consented.
  exchangeCode: async code => {
    const client = oauthClient()
    try {
      const { tokens } = await client.getToken(code)
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: env('CLIENT_ID'),
      })
      const { email, email_verified: verified } = ticket.getPayload()
      return {
        email: verified && email ? email.toLowerCase() : null,
        scopes: (tokens.scope ?? '').split(' ').filter(Boolean),
        refreshToken: tokens.refresh_token ?? null,
      }
    } catch (error) {
      throw toGoogleError(error)
    }
  },

  revoke: async refreshToken => {
    try {
      await oauthClient().revokeToken(refreshToken)
    } catch (error) {
      throw toGoogleError(error)
    }
  },

  createEvent: (refreshToken, event) =>
    call(refreshToken, {
      url: EVENTS_URL,
      method: 'POST',
      params: { conferenceDataVersion: 1, ...NOTIFY },
      data: event,
    }),

  getEvent: (refreshToken, eventId) =>
    call(refreshToken, { url: eventUrl(eventId) }),

  patchEvent: (refreshToken, eventId, patch) =>
    call(refreshToken, {
      url: eventUrl(eventId),
      method: 'PATCH',
      params: NOTIFY,
      data: patch,
    }),

  // Deleting one instance of a recurring event cancels just that occurrence.
  // An event that is already gone counts as deleted.
  deleteEvent: async (refreshToken, eventId) => {
    try {
      await call(refreshToken, {
        url: eventUrl(eventId),
        method: 'DELETE',
        params: NOTIFY,
      })
    } catch (error) {
      if (![404, 410].includes(error.status)) {
        throw error
      }
    }
  },

  listInstances,
})

let workspace = null

export const getGoogleWorkspace = () => {
  workspace ??= createGoogleWorkspace()
  return workspace
}

export const setGoogleWorkspace = next => {
  workspace = next
}

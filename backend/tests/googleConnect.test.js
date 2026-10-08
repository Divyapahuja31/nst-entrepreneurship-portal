import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app from '../app.js'
import GoogleCredential from '../models/googleCredential.js'
import { REQUIRED_SCOPES } from '../utils/googleWorkspace.js'
import { decryptToken, encryptToken } from '../utils/tokenCrypto.js'
import {
  cookieFor,
  google,
  seed,
  startDatabase,
  stopDatabase,
} from './helpers.js'

let data

before(startDatabase)
after(stopDatabase)
beforeEach(async () => {
  data = await seed()
})

// Starts connecting as `user` and returns what the callback needs: the
// state Google would send back and the browser's cookies.
const startConnect = async (user, returnTo = '/admin/venture/abc') => {
  const res = await request(app)
    .get(`/api/google/connect?returnTo=${encodeURIComponent(returnTo)}`)
    .set('Cookie', cookieFor(user))
  assert.equal(res.status, 302)
  const state = new URL(res.headers.location).searchParams.get('state')
  const stateCookie = res.headers['set-cookie'][0].split(';')[0]
  return { state, cookies: [cookieFor(user), stateCookie].join('; ') }
}

const callback = ({ state, cookies }, query) =>
  request(app)
    .get('/api/google/callback')
    .query({ state, ...query })
    .set('Cookie', cookies)

const outcome = res =>
  new URL(res.headers.location).searchParams.get('calendar')

const grant = (email, scopes = REQUIRED_SCOPES) =>
  google.grants.set('code', { email, scopes, refreshToken: 'refresh-1' })

describe('connecting a Google Calendar', () => {
  it('stores the encrypted token and returns to the page the mentor came from', async () => {
    const { mentor } = data.users
    grant(mentor.email)
    const res = await callback(await startConnect(mentor), { code: 'code' })
    assert.equal(res.status, 302)
    assert.match(
      res.headers.location,
      /\/admin\/venture\/abc\?calendar=connected$/
    )

    const credential = await GoogleCredential.findOne({
      user: mentor._id,
    }).select('+refreshToken')
    assert.notEqual(credential.refreshToken, 'refresh-1')
    assert.equal(decryptToken(credential.refreshToken), 'refresh-1')

    const status = await request(app)
      .get('/api/google/status')
      .set('Cookie', cookieFor(mentor))
    assert.deepEqual(status.body, {
      connected: true,
      googleEmail: mentor.email,
      needsReconnect: false,
    })
  })

  it('refuses a callback this browser did not start', async () => {
    const { mentor } = data.users
    grant(mentor.email)
    const started = await startConnect(mentor)
    const res = await callback(
      { ...started, state: 'forged' },
      { code: 'code' }
    )
    assert.equal(res.status, 400)
    assert.equal(await GoogleCredential.countDocuments(), 0)
  })

  it('refuses another Google account or missing access', async () => {
    const { mentor } = data.users
    grant('someone.else@gmail.com')
    const wrong = await callback(await startConnect(mentor), { code: 'code' })
    assert.equal(outcome(wrong), 'wrong-account')

    grant(mentor.email, ['openid', 'email'])
    const partial = await callback(await startConnect(mentor), { code: 'code' })
    assert.equal(outcome(partial), 'missing-access')

    const denied = await callback(await startConnect(mentor), {
      error: 'access_denied',
    })
    assert.equal(outcome(denied), 'denied')
    assert.equal(await GoogleCredential.countDocuments(), 0)
  })

  it('only returns to a page on this site', async () => {
    const { mentor } = data.users
    grant(mentor.email)
    const res = await callback(
      await startConnect(mentor, '//evil.example/steal'),
      { code: 'code' }
    )
    assert.match(res.headers.location, /\/admin\?calendar=connected$/)
  })

  it('disconnecting revokes the token at Google', async () => {
    const { mentor } = data.users
    grant(mentor.email)
    await callback(await startConnect(mentor), { code: 'code' })
    const res = await request(app)
      .delete('/api/google/connection')
      .set('Cookie', cookieFor(mentor))
    assert.equal(res.status, 200)
    assert.deepEqual(google.revoked, ['refresh-1'])
    assert.equal(await GoogleCredential.countDocuments(), 0)
  })

  it('is for mentors only', async () => {
    for (const user of [data.users.admin, data.users.board, data.users.owner]) {
      const res = await request(app)
        .get('/api/google/status')
        .set('Cookie', cookieFor(user))
      assert.equal(res.status, 403, user.email)
    }
  })
})

describe('token encryption', () => {
  it('round-trips and rejects a changed token', () => {
    const sealed = encryptToken('1//refresh-token')
    assert.notEqual(sealed, encryptToken('1//refresh-token'))
    assert.equal(decryptToken(sealed), '1//refresh-token')

    const parts = sealed.split('.')
    parts[3] = Buffer.from('tampered').toString('base64url')
    assert.throws(() => decryptToken(parts.join('.')))
    assert.throws(() => decryptToken('plain-token'))
  })
})

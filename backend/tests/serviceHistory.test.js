import { after, before, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../app.js'
import { cookieFor, seed, startDatabase, stopDatabase } from './helpers.js'

const endpoint = '/api/admin/service-history'
const day = '2025-01-10'
const start = Date.parse(`${day}T00:00:00+05:30`) / 1000
const reference = '6c410b73-d342-4db6-9262-b415dc82b823'
const failure = {
  event: 'portal_http_failure',
  feature: 'Sign-in and accounts',
  method: 'GET',
  time: new Date((start + 60) * 1000).toISOString(),
  reference,
  status: 500,
}

before(startDatabase)
after(stopDatabase)

it('limits service history to admins and keeps outages and missing checks distinct', async t => {
  const { users } = await seed()
  const originals = {
    SERVICE_HISTORY_PROMETHEUS_URL: process.env.SERVICE_HISTORY_PROMETHEUS_URL,
    SERVICE_HISTORY_LOKI_URL: process.env.SERVICE_HISTORY_LOKI_URL,
  }
  t.after(() => {
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  })
  delete process.env.SERVICE_HISTORY_PROMETHEUS_URL
  delete process.env.SERVICE_HISTORY_LOKI_URL
  const as = user => request(app).get(endpoint).set('Cookie', cookieFor(user))
  await as(users.mentor).expect(403)
  await as(users.owner).expect(403)
  const disconnected = await as(users.admin)
    .query({ day, reference: '' })
    .expect(200)
  assert.equal(disconnected.body.checks.state, 'setup-required')
  assert.equal(disconnected.body.failures.state, 'setup-required')
  await as(users.admin).query({ day: '2026-11-31' }).expect(400)
  await as(users.admin).query({ reference: 'invalid' }).expect(400)

  const configureHistory = () => {
    process.env.SERVICE_HISTORY_PROMETHEUS_URL = 'https://test.invalid/prom'
    process.env.SERVICE_HISTORY_LOKI_URL = 'https://test.invalid/logs'
  }
  configureHistory()
  const fake = t.mock.method(globalThis, 'fetch', async url => {
    if (url.pathname === '/prom/api/v1/query') {
      return Response.json({
        status: 'success',
        data: {
          result: [
            {
              metric: { job: 'portal-web' },
              values: [
                [start + 4, '1'],
                [start + 64, '1'],
              ],
            },
            {
              metric: { job: 'portal-signup' },
              values: [
                [start + 8, '0'],
                [start + 68, '1'],
              ],
            },
          ],
        },
      })
    }
    assert.equal(url.pathname, '/logs/loki/api/v1/query_range')
    assert.ok(url.searchParams.get('query').includes(reference))
    return Response.json({
      status: 'success',
      data: {
        result: [
          {
            values: [
              ['1', JSON.stringify({ ...failure, private: 'hidden' })],
              [
                '2',
                JSON.stringify({
                  ...failure,
                  time: new Date(start * 1000 - 1).toISOString(),
                }),
              ],
            ],
          },
        ],
      },
    })
  })
  const result = await as(users.admin).query({ day, reference }).expect(200)
  const [web, signup] = result.body.checks.items
  assert.deepEqual(web.intervals[0], { start, end: start + 120, state: 'pass' })
  assert.deepEqual(
    signup.intervals.slice(0, 2).map(interval => interval.state),
    ['fail', 'pass']
  )
  assert.equal(signup.intervals.at(-1).state, 'missing')
  const { event: _event, ...fields } = failure
  assert.deepEqual(result.body.failures.items, [fields])
  assert.equal(fake.mock.callCount(), 2)
})

import { it } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { dateCutoff, parseDeadline, deadlinePassed } from './deadlines.js'
import { biweeklyClosesAt, isBiweeklyOpen } from './biweeklyCycles.js'

it('allows the last millisecond of a date and rejects at midnight and hours later', () => {
  const end = parseDeadline('2026-11-04')
  assert.equal(end.toISOString(), '2026-11-04T18:29:59.999Z')
  assert.equal(deadlinePassed(end, end.getTime()), false)
  assert.equal(deadlinePassed(end, end.getTime() + 1), true)
  assert.equal(deadlinePassed(end, Date.parse('2026-11-05T08:00:00Z')), true)
  assert.equal(isBiweeklyOpen('2026-10-19T09:00:00Z', 1, null, end), true)
  assert.equal(
    isBiweeklyOpen('2026-10-19T09:00:00Z', 1, null, end.getTime() + 1),
    false
  )
  assert.equal(
    biweeklyClosesAt('2026-10-19T09:00:00Z', 1).toISOString(),
    '2026-11-04T18:30:00.000Z'
  )
})

it('handles leap days, year rollover and DST target offsets', () => {
  assert.equal(
    dateCutoff('2028-02-29').toISOString(),
    '2028-02-29T18:30:00.000Z'
  )
  assert.equal(
    dateCutoff('2026-12-31').toISOString(),
    '2026-12-31T18:30:00.000Z'
  )
  assert.equal(
    dateCutoff('2026-03-08', 'America/New_York').toISOString(),
    '2026-03-09T04:00:00.000Z'
  )
  assert.equal(
    dateCutoff('2026-11-01', 'America/New_York').toISOString(),
    '2026-11-02T05:00:00.000Z'
  )
  assert.ok(Number.isNaN(parseDeadline('2026-02-30').getTime()))
})

it('preserves explicit instants and rejects them at their exact cutoff', () => {
  const instant = '2026-11-04T12:00:00Z'
  assert.equal(parseDeadline(instant).toISOString(), '2026-11-04T12:00:00.000Z')
  assert.equal(
    deadlinePassed(instant, Date.parse(instant) - 1, 'timestamp'),
    false
  )
  assert.equal(deadlinePassed(instant, Date.parse(instant), 'timestamp'), true)
  assert.equal(
    deadlinePassed(
      '2026-11-04T18:29:59.999Z',
      Date.parse('2026-11-04T18:29:59.999Z'),
      'timestamp'
    ),
    true
  )
})

it('is independent of the server timezone', () => {
  for (const TZ of ['UTC', 'America/Los_Angeles', 'Asia/Tokyo']) {
    const result = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "import {dateCutoff} from './deadlines.js';process.stdout.write(dateCutoff('2026-11-04').toISOString())",
      ],
      { cwd: new URL('.', import.meta.url), env: { ...process.env, TZ } }
    ).toString()
    assert.equal(result, '2026-11-04T18:30:00.000Z')
  }
})

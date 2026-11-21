import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  CYCLES,
  cycleForDate,
  cycleStart,
  biweeklyClosesAt,
  isBiweeklyOpen,
} from './biweeklyCycles.js'

const created = '2026-01-01T09:00:00.000Z'
const day = n => new Date(Date.parse(created) + n * 24 * 60 * 60 * 1000)

describe('bi-weekly cycles', () => {
  it('counts 14-day cycles from the startup creation', () => {
    assert.equal(cycleStart(created, 1).toISOString(), created)
    assert.equal(cycleStart(created, 2).getTime(), day(14).getTime())
    assert.equal(cycleForDate(created, day(0)), 1)
    assert.equal(cycleForDate(created, day(13.9)), 1)
    assert.equal(cycleForDate(created, day(14)), 2)
    assert.equal(cycleForDate(created, day(14 * CYCLES - 0.1)), CYCLES)
  })

  it('has no cycle before the first or after the last', () => {
    assert.equal(cycleForDate(created, day(-1)), null)
    assert.equal(cycleForDate(created, day(14 * CYCLES)), null)
    assert.equal(cycleForDate(created, 'not a date'), null)
  })
})

it('opens past and future cycles only until the selected instant', () => {
  const now = new Date('2026-11-16T10:00:00Z')
  const row = { reopened_at: now, reopened_until: '2026-11-16T11:00:00Z' }
  for (const cycle of [1, 13]) {
    assert.equal(isBiweeklyOpen('2026-10-01', cycle, row, now), true)
    assert.equal(
      isBiweeklyOpen('2026-10-01', cycle, row, new Date(row.reopened_until)),
      false
    )
    assert.equal(
      isBiweeklyOpen('2026-10-01', cycle, { ...row, submitted_at: now }, now),
      false
    )
    assert.equal(
      biweeklyClosesAt('2026-10-01', cycle, row).toISOString(),
      row.reopened_until.replace('Z', '.000Z')
    )
  }
})

it('preserves legacy reopenings and normal cycle access', () => {
  const now = new Date('2026-11-16')
  assert.equal(isBiweeklyOpen('2026-10-01', 1, { reopened_at: now }, now), true)
  assert.equal(isBiweeklyOpen('2026-10-01', 1, null, now), false)
  assert.equal(isBiweeklyOpen('2026-10-01', 13, null, now), false)
  assert.equal(isBiweeklyOpen('2026-10-01', 4, null, now), true)
})

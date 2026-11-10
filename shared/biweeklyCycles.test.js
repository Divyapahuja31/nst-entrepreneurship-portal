import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { CYCLES, cycleForDate, cycleStart } from './biweeklyCycles.js'

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

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { evaluationStatus, evaluationTotal } from './evaluationScore.js'

const scores = (execution, customer, business, behavior) => ({
  execution_score: execution,
  customer_score: customer,
  business_score: business,
  behavior_score: behavior,
})

describe('monthly evaluation', () => {
  it('weighs the pillars 40/25/20/15, out of 100', () => {
    assert.equal(evaluationTotal(scores(100, 100, 100, 100)), 100)
    assert.equal(evaluationTotal(scores(20, 20, 20, 20)), 20)
    assert.equal(evaluationTotal(scores(100, 0, 0, 0)), 40)
    assert.equal(evaluationTotal(scores(80, 60, 50, 100)), 72)
  })

  it('20 in every pillar is at risk, not on track', () => {
    assert.equal(evaluationStatus(scores(20, 20, 20, 20)), 'red')
  })

  it('is on track at 70 or more with no weak pillar', () => {
    assert.equal(evaluationStatus(scores(80, 60, 50, 100)), 'green')
    assert.equal(evaluationStatus(scores(70, 70, 70, 70)), 'green')
  })

  it('needs attention at 50 to 69, or with one weak pillar', () => {
    assert.equal(evaluationStatus(scores(60, 60, 60, 60)), 'yellow')
    assert.equal(evaluationStatus(scores(100, 100, 100, 40)), 'yellow')
  })

  it('is at risk below 50, or with two weak pillars', () => {
    assert.equal(evaluationStatus(scores(45, 45, 45, 45)), 'red')
    assert.equal(evaluationStatus(scores(100, 100, 40, 40)), 'red')
  })
})

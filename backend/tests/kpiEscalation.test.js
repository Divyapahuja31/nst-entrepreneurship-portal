import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  escalationsFor,
  nextStrikes,
  percentageOf,
  sortForEscalation,
} from '../utils/kpiEscalation.js'

// Grades in order, one day apart, with ids k1, k2, ...
const run = (...scores) =>
  scores.map((score, index) => ({
    _id: `k${index + 1}`,
    score,
    dueDate: new Date(2026, 0, index + 1),
  }))

const last = kpis => kpis.at(-1)._id

describe('percentageOf', () => {
  it('grades out of 100 unless told otherwise', () => {
    assert.equal(percentageOf(55), 55)
    assert.equal(percentageOf(15, 20), 75)
  })

  it('keeps every whole score exact, so 40 is still at the threshold', () => {
    for (let score = 0; score <= 100; score += 1) {
      assert.equal(percentageOf(score), score)
    }
  })

  it('treats a missing total as nothing scored', () => {
    assert.equal(percentageOf(10, 0), 0)
  })
})

describe('nextStrikes', () => {
  const none = { mentor: 0, board: 0 }

  it('counts 40% or below against both', () => {
    assert.deepEqual(nextStrikes(none, 40), { mentor: 1, board: 1 })
    assert.deepEqual(nextStrikes(none, 0), { mentor: 1, board: 1 })
  })

  it('counts above 40% and below 70% against the mentor only, and clears the board', () => {
    assert.deepEqual(nextStrikes({ mentor: 1, board: 1 }, 41), {
      mentor: 2,
      board: 0,
    })
    assert.deepEqual(nextStrikes(none, 69.9), { mentor: 1, board: 0 })
  })

  it('clears both at 70% or above', () => {
    assert.deepEqual(nextStrikes({ mentor: 1, board: 1 }, 70), none)
  })
})

describe('escalationsFor', () => {
  it('alerts nobody after one poor grade', () => {
    const kpis = run(10)
    assert.deepEqual(escalationsFor(kpis, last(kpis)), {
      mentor: false,
      board: false,
    })
  })

  it('alerts the mentor and the board after two low grades in a row', () => {
    const kpis = run(30, 40)
    assert.deepEqual(escalationsFor(kpis, last(kpis)), {
      mentor: true,
      board: true,
    })
  })

  it('alerts only the mentor when one of the two is middling', () => {
    for (const kpis of [run(30, 60), run(60, 30), run(50, 65)]) {
      assert.deepEqual(escalationsFor(kpis, last(kpis)), {
        mentor: true,
        board: false,
      })
    }
  })

  it('starts over after a passing grade', () => {
    const kpis = run(30, 70, 30)
    assert.deepEqual(escalationsFor(kpis, last(kpis)), {
      mentor: false,
      board: false,
    })
  })

  it('alerts only for the KPI that completes the run', () => {
    const kpis = run(30, 30, 90)
    assert.deepEqual(escalationsFor(kpis, 'k2'), { mentor: true, board: true })
    assert.deepEqual(escalationsFor(kpis, 'k1'), {
      mentor: false,
      board: false,
    })
    assert.deepEqual(escalationsFor(kpis, 'k3'), {
      mentor: false,
      board: false,
    })
  })

  it('counts from zero again after alerting', () => {
    const kpis = run(30, 30, 30, 30)
    assert.equal(escalationsFor(kpis, 'k3').board, false)
    assert.equal(escalationsFor(kpis, 'k4').board, true)
  })

  it('keeps the counters apart', () => {
    // Mentor: 1, 2 (alert, reset), 3rd low is 1. Board: 0, 1, 2 (alert).
    const kpis = run(60, 30, 30)
    assert.deepEqual(escalationsFor(kpis, 'k2'), {
      mentor: true,
      board: false,
    })
    assert.deepEqual(escalationsFor(kpis, 'k3'), {
      mentor: false,
      board: true,
    })
  })

  it('ignores a KPI that is not in the run', () => {
    assert.deepEqual(escalationsFor(run(30, 30), 'missing'), {
      mentor: false,
      board: false,
    })
  })

  it('reads the grades in date order, whatever order they come in', () => {
    const kpis = run(30, 90, 30).reverse()
    assert.deepEqual(escalationsFor(kpis, 'k3'), {
      mentor: false,
      board: false,
    })
  })
})

describe('sortForEscalation', () => {
  it('uses the due date, else when it was locked, graded or created', () => {
    const kpis = [
      { _id: 'created', createdAt: '2026-01-04' },
      { _id: 'graded', evaluationDate: '2026-01-03', createdAt: '2026-01-09' },
      { _id: 'locked', lockedAt: '2026-01-02', createdAt: '2026-01-09' },
      { _id: 'due', dueDate: '2026-01-01', lockedAt: '2026-01-09' },
    ]
    assert.deepEqual(
      sortForEscalation(kpis).map(kpi => kpi._id),
      ['due', 'locked', 'graded', 'created']
    )
  })

  it('breaks ties by id', () => {
    const day = new Date(2026, 0, 1)
    const kpis = [
      { _id: 'b', dueDate: day },
      { _id: 'a', dueDate: day },
    ]
    assert.deepEqual(
      sortForEscalation(kpis).map(kpi => kpi._id),
      ['a', 'b']
    )
  })
})

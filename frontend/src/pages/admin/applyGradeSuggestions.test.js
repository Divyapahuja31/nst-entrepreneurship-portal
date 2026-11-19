import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  ALL_GRADE_ASSESSMENTS,
  applyGradeSuggestions,
  gradeSuggestionSelection,
} from './applyGradeSuggestions.js'

test('applies grades to the intended empty cells and preserves manual grades', () => {
  const rows = [
    ['Product', '14', ''],
    ['Market', ' ', ''],
  ]
  const updated = applyGradeSuggestions(rows, [
    { row: 0, column: 1, grade: '12' },
    { row: 0, column: 2, grade: '18' },
    { row: 1, column: 1, grade: '0' },
  ])

  assert.deepEqual(updated, [
    ['Product', '14', '18'],
    ['Market', '0', ''],
  ])
  assert.deepEqual(rows, [
    ['Product', '14', ''],
    ['Market', ' ', ''],
  ])
})

test('defaults to an assessment with blanks and respects the admin’s selection', () => {
  const layout = {
    terms: [{ assessments: [{ id: 'practice' }, { id: 'final' }] }],
  }
  const rows = [
    ['Product', '0', ''],
    ['', '', ''],
  ]
  assert.deepEqual(gradeSuggestionSelection(layout, rows, null), {
    assessmentId: 'final',
    hasCriteria: true,
    blankCount: 1,
  })
  assert.equal(gradeSuggestionSelection(layout, rows, 'practice').blankCount, 0)
  assert.deepEqual(
    gradeSuggestionSelection(layout, rows, ALL_GRADE_ASSESSMENTS),
    {
      assessmentId: ALL_GRADE_ASSESSMENTS,
      hasCriteria: true,
      blankCount: 1,
    }
  )
  assert.equal(
    gradeSuggestionSelection(layout, [['', '', '']], null).hasCriteria,
    false
  )
})

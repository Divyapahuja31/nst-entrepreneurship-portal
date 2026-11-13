import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  gradeLayoutError,
  normalizeGradeLayout,
  reportColumnAverages,
} from './reportCards.js'

const layout = {
  mode: 'numeric',
  terms: [
    {
      id: 'term-1',
      name: 'Term 1',
      assessments: [
        { id: 'marks', name: 'Marks', max: 20, showAverage: true },
        { id: 'practice', name: 'Practice', max: 100, showAverage: false },
        { id: 'final', name: 'Final', max: 100, showAverage: true },
      ],
    },
  ],
  subjects: [{ name: 'Eating', max: 10 }],
}

test('averages only selected numeric columns and includes zero marks', () => {
  const rows = [
    ['Eating', '10.5', '60', ''],
    ['Dancing', ' 13.5 ', '70', 'invalid'],
    ['Music', '0', '85', ''],
    ['Reading', '  ', '90', ''],
    ['Writing', '21', '90', ''],
    ['  ', '6', '100', '50'],
    ['Eating', '4.5', '70', ''],
  ]
  assert.deepEqual(reportColumnAverages(layout, rows), [6, undefined, null])
  assert.deepEqual(
    reportColumnAverages({ ...layout, mode: 'letter' }, rows),
    []
  )
  assert.deepEqual(reportColumnAverages(undefined, rows), [])
})

test('rejects non-boolean average settings', () => {
  const [term] = layout.terms
  const [assessment] = term.assessments
  assert.equal(gradeLayoutError(layout), '')
  assert.match(
    gradeLayoutError({
      ...layout,
      terms: [
        { ...term, assessments: [{ ...assessment, showAverage: 'false' }] },
      ],
    }),
    /show an average/
  )
})

test('keeps the numeric average preferences when changing grading modes', () => {
  const letters = normalizeGradeLayout({ ...layout, mode: 'letter' })
  const numeric = normalizeGradeLayout({ ...letters, mode: 'numeric' })
  const rows = [['Eating', '8', '70', '']]

  assert.deepEqual(reportColumnAverages(letters, rows), [])
  assert.deepEqual(reportColumnAverages(numeric, rows), [8, undefined, null])
})

test('shows averages on older numeric cards without an average setting', () => {
  const monthly = {
    mode: 'numeric',
    terms: [1, 2].map(month => ({
      id: `month-${month}`,
      name: `Month ${month}`,
      assessments: [{ id: `marks-${month}`, name: 'Marks', max: 100 }],
    })),
  }
  const rows = [
    ['Execution & Product', '6', ''],
    ['Customer & Market', '8', ''],
    ['Business & Metrics', '8', ''],
    ['Founder Behaviour', '9', ''],
  ]
  assert.deepEqual(reportColumnAverages(monthly, rows), [7.75, null])
})

import { it } from 'node:test'
import assert from 'node:assert/strict'
import {
  cleanForm,
  defaultBiweeklyForm,
  validateForm,
  validateAnswers,
} from './biweeklyForm.js'
const block = (type, required = true) => ({
  id: 'q_test',
  type,
  label: 'Test',
  description: '',
  required,
  options: ['Yes', 'No'],
})
const form = b => ({ title: 'Test form', description: '', blocks: [b] })
it('validates every supported answer type without trusting HTML input restrictions', () => {
  for (const [type, good, bad] of [
    ['text', 'Answer', {}],
    ['textarea', 'Answer', []],
    ['number', 0, Infinity],
    ['checkbox', true, 'true'],
    ['select', 'Yes', 'Other'],
    ['date', '2028-02-29', '2026-02-30'],
    ['url', 'https://example.com', 'javascript:alert(1)'],
  ]) {
    assert.equal(
      validateAnswers(form(block(type)), { q_test: good }, true),
      null
    )
    assert.ok(validateAnswers(form(block(type)), { q_test: bad }, true))
    assert.ok(validateAnswers(form(block(type)), {}, true))
    assert.equal(validateAnswers(form(block(type)), {}, false), null)
  }
})
it('rejects forged block IDs, excessive forms, blank choices and content block answers', () => {
  assert.ok(validateForm(form({ ...block('text'), id: '__proto__' })))
  assert.ok(validateForm(form({ ...block('select'), options: [' '] })))
  assert.ok(
    validateForm({
      ...form(block('text')),
      blocks: Array(61).fill(block('text')),
    })
  )
  assert.ok(
    validateAnswers(form(block('heading')), { q_test: 'Hidden data' }, false)
  )
  assert.ok(
    validateForm(
      cleanForm(form({ ...block('select'), options: ['Yes', ' Yes'] }))
    )
  )
  assert.equal(validateForm(defaultBiweeklyForm()), null)
})

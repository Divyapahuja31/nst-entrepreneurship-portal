import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { validateAccountInput } from '../utils/accountValidator.js'
import { determineUserRole } from '../utils/authHelper.js'

const BATCH = '64b7f0c2a1b2c3d4e5f60718'
const CAMPUS = '64b7f0c2a1b2c3d4e5f60719'

describe('validateAccountInput', () => {
  it('accepts a staff account without a batch or campus', () => {
    assert.deepEqual(
      validateAccountInput({
        username: 'Test Mentor',
        email: 'mentor@newtonschool.co',
        role: 'mentor',
      }),
      {}
    )
  })

  it('requires a batch and campus for a student', () => {
    const error = validateAccountInput({
      username: 'Test Student',
      email: 'student@adypu.edu.in',
      role: 'student',
    })
    assert.deepEqual(Object.keys(error).sort(), ['batch', 'campus'])
    assert.deepEqual(
      validateAccountInput({
        username: 'Test Student',
        email: 'student@adypu.edu.in',
        role: 'student',
        batch: BATCH,
        campus: CAMPUS,
      }),
      {}
    )
  })

  it('rejects emails outside the school domains', () => {
    const error = validateAccountInput({
      username: 'Test Student',
      email: 'student@gmail.com',
      role: 'mentor',
    })
    assert.ok(error.email)
  })

  it('rejects unknown roles, including the old "academic board" name', () => {
    for (const role of ['academic board', 'superuser', undefined]) {
      const error = validateAccountInput({
        username: 'Test Student',
        email: 'student@newtonschool.co',
        role,
      })
      assert.ok(error.role, String(role))
    }
  })

  it('rejects a missing or non-text name and email', () => {
    const error = validateAccountInput({ username: 42, role: 'admin' })
    assert.ok(error.username)
    assert.ok(error.email)
    assert.deepEqual(Object.keys(validateAccountInput()).sort(), [
      'email',
      'role',
      'username',
    ])
  })
})

describe('determineUserRole', () => {
  it('never grants more than mentor from an email', () => {
    assert.equal(determineUserRole('lead@newtonschool.co'), 'mentor')
    assert.equal(determineUserRole('LEAD@NewtonSchool.co'), 'mentor')
    assert.equal(determineUserRole('student@adypu.edu.in'), 'student')
    assert.equal(determineUserRole(undefined), 'student')
  })
})

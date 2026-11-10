import assert from 'node:assert/strict'
import { it } from 'node:test'
import { requestWithBatch } from '../../frontend/src/stores/batchRequest.js'

const stateFor = initial => {
  let selected = initial
  return {
    getParams: () => (selected ? { batch: selected } : {}),
    clearBatch: () => {
      selected = null
    },
    select: batch => {
      selected = batch
    },
  }
}

it('preserves a newer batch when an older request returns 400', async () => {
  const state = stateFor('deleted-A')
  const old = Promise.withResolvers()
  const calls = []
  const result = requestWithBatch(params => {
    calls.push(params)
    return calls.length === 1 ? old.promise : Promise.resolve(params)
  }, state)
  state.select('valid-B')
  old.reject({ response: { status: 400 } })
  assert.deepEqual(await result, { batch: 'valid-B' })
  assert.deepEqual(state.getParams(), { batch: 'valid-B' })
  assert.deepEqual(calls, [{ batch: 'deleted-A' }, { batch: 'valid-B' }])
})

it('clears a deleted batch when it is still selected', async () => {
  const state = stateFor('deleted-A')
  const calls = []
  const result = await requestWithBatch(async params => {
    calls.push(params)
    if (params.batch) {
      throw { response: { status: 400 } }
    }
    return params
  }, state)
  assert.deepEqual(result, {})
  assert.deepEqual(state.getParams(), {})
  assert.deepEqual(calls, [{ batch: 'deleted-A' }, {}])
})

it('does not clear the filter or retry on a server error', async () => {
  const state = stateFor('valid-A')
  const error = new Error('Server unavailable')
  error.response = { status: 500 }
  await assert.rejects(
    requestWithBatch(() => Promise.reject(error), state),
    error
  )
  assert.deepEqual(state.getParams(), { batch: 'valid-A' })
})

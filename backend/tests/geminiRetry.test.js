import assert from 'node:assert/strict'
import { it } from 'node:test'
import { withGeminiRetry } from '../utils/geminiRetry.js'

it('recovers from temporary provider overload within a bounded number of attempts', async () => {
  let calls = 0
  const request = async () => {
    if (++calls < 3) {
      throw Object.assign(new Error('Busy'), { status: 503 })
    }
    return 'response'
  }
  await assert.rejects(request(), { status: 503 })
  calls = 0
  assert.equal(await withGeminiRetry(request, { retryDelayMs: 0 }), 'response')
  assert.equal(calls, 3)
})

it('does not retry permanent authentication or model errors', async () => {
  for (const status of [400, 401, 403, 404]) {
    let calls = 0
    await assert.rejects(
      withGeminiRetry(
        async () => {
          calls++
          throw Object.assign(new Error('Permanent'), { status })
        },
        { retryDelayMs: 0 }
      ),
      { status }
    )
    assert.equal(calls, 1)
  }
})

it('stops after three failures and respects the overall abort signal', async () => {
  let calls = 0
  const request = async () => {
    calls++
    throw Object.assign(new Error('Busy'), { status: 503 })
  }
  await assert.rejects(withGeminiRetry(request, { retryDelayMs: 0 }), {
    status: 503,
  })
  assert.equal(calls, 3)
  const controller = new AbortController()
  controller.abort()
  calls = 0
  await assert.rejects(
    withGeminiRetry(request, { signal: controller.signal }),
    { name: 'AbortError' }
  )
  assert.equal(calls, 0)
})

it('retries an attempt timeout without extending the caller deadline', async () => {
  let calls = 0
  const result = await withGeminiRetry(
    async signal => {
      if (++calls > 1) {
        return 'recovered'
      }
      await new Promise((resolve, reject) => {
        const keepAlive = setTimeout(resolve, 1000)
        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(keepAlive)
            reject(signal.reason)
          },
          { once: true }
        )
      })
      return 'unexpected'
    },
    { attemptTimeoutMs: 10, retryDelayMs: 0 }
  )
  assert.equal(result, 'recovered')
  assert.equal(calls, 2)
})

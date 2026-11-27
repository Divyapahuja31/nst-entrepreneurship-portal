import { setTimeout as delay } from 'node:timers/promises'

const attemptSignalFor = (signal, ms) =>
  AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(ms)])

const mustStop = (signal, retryable, attempt) =>
  signal?.aborted || !retryable || attempt === 3

const recordFailure = (error, attemptSignal, signal, model, attempt) => {
  const status = Number(error?.status)
  const timedOut = attemptSignal.aborted && !signal?.aborted
  const retryable = timedOut || [429, 500, 502, 503, 504].includes(status)
  console.warn(
    JSON.stringify({
      event: 'gemini_request_failed',
      model,
      attempt,
      providerStatus: status || null,
      reason: timedOut ? 'attempt_timeout' : error?.name,
      retryable,
    })
  )
  return retryable
}

// Retry temporary provider failures inside the caller's overall deadline.
// Never log prompts, responses, student information, or API keys.
export const withGeminiRetry = async (
  request,
  { signal, model, attemptTimeoutMs = 30000, retryDelayMs = 1000 } = {}
) => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    signal?.throwIfAborted()
    const attemptSignal = attemptSignalFor(signal, attemptTimeoutMs)
    try {
      return await request(attemptSignal)
    } catch (error) {
      const retryable = recordFailure(
        error,
        attemptSignal,
        signal,
        model,
        attempt
      )
      if (mustStop(signal, retryable, attempt)) {
        throw error
      }
      await delay(retryDelayMs * attempt, undefined, { signal })
    }
  }
  throw new Error('Gemini attempts exhausted')
}

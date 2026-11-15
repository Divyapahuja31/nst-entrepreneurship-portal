// Normalizes an axios failure into the `{ error }` shape every caller expects.
// `error` stays whatever the server sent when it is a field-error object, so
// forms can still map it onto individual inputs.
export default function toError(err, fallback = 'Something went wrong') {
  if (!err.response) {
    return { error: 'Network error. Try again.' }
  }

  const { data } = err.response
  const error = data?.error || data?.message || fallback
  const reference = err.response.headers?.['x-request-id']

  return {
    error:
      err.response.status >= 500 && reference && typeof error === 'string'
        ? `${error} Reference: ${reference}`
        : error,
    requireOtp: data?.requireOtp,
    email: data?.email,
  }
}

// Normalizes an axios failure into the `{ error }` shape every caller expects.
// `error` stays whatever the server sent when it is a field-error object, so
// forms can still map it onto individual inputs.
export default function toError(err, fallback = 'Something went wrong') {
  if (!err.response) {
    return { error: 'Network error. Try again.' }
  }

  const { data } = err.response

  return {
    error: data?.error || data?.message || fallback,
    requireOtp: data?.requireOtp,
    email: data?.email,
  }
}

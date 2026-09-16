import { api } from './client'

// Normalize axios errors into the `{ error }` shape for Auth pages.
const toError = (err, fallbackError) => {
  if (!err.response) {
    return { error: 'Network error. Try again.' }
  }
  return { error: err.response.data?.error || fallbackError }
}

export const signIn = async payload => {
  try {
    const { data } = await api.post('/auth/signin', payload)
    return { user: data.user }
  } catch (err) {
    return toError(err, 'Invalid credentials')
  }
}

export const signUp = async payload => {
  try {
    const { data } = await api.post('/auth/signup', payload)
    return { user: data.user }
  } catch (err) {
    return toError(err, 'Something went wrong')
  }
}

export const completeGoogleSignup = async payload => {
  try {
    const { data } = await api.post('/auth/google/complete-signup', payload)
    return { user: data.user }
  } catch (err) {
    return toError(err, 'Failed to create account.')
  }
}

export const signOut = async () => {
  try {
    await api.post('/auth/signout')
    return {}
  } catch (err) {
    return toError(err, 'Could not sign out')
  }
}

export const homePathFor = user => (user?.role?.name === 'admin' ? '/admin' : '/')

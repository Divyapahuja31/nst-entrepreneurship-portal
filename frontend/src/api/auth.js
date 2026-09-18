import { api } from './client'
import toError from './toError'

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

export const forgotPassword = async payload => {
  try {
    const { data } = await api.post('/auth/forgot-password', payload)
    return { message: data.message }
  } catch (err) {
    return toError(err, 'Failed to send password reset email')
  }
}

export const resetPassword = async payload => {
  try {
    const { data } = await api.post('/auth/reset-password', payload)
    return { message: data.message }
  } catch (err) {
    return toError(err, 'Failed to reset password')
  }
}

export const homePathFor = user =>
  user?.role?.name === 'admin' ? '/admin' : '/'

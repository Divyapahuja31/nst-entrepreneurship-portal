import { redirect } from 'react-router'
import { api } from './client'

export const credentialsAction =
  (path, fallbackError) =>
  async ({ request }) => {
    const formData = await request.formData()
    try {
      await api.post(path, Object.fromEntries(formData))
      return redirect('/')
    } catch (err) {
      if (!err.response) {
        return { error: 'Network error. Try again.' }
      }
      return { error: err.response.data?.error || fallbackError }
    }
  }

export const signoutAction = async () => {
  try {
    await api.post('/auth/signout')
    return redirect('/signin')
  } catch (err) {
    if (!err.response) {
      return { error: 'Network error. Try again.' }
    }
    return { error: err.response.data?.error || 'Could not sign out' }
  }
}

export const profileLoader = async () => {
  const { data } = await api.get('/auth/profile')
  return data
}

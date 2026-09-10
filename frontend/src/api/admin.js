import { api } from './client'

export const foundersLoader = async () => {
  const { data } = await api.get('/admin/founders')
  return data
}

export const foundersCount = async () => {
  const { data } = await api.get('/admin/overview')
  return data
}

export const addFounderLoader = async () => {
  const { data } = await api.get('/admin/founder-options')
  return data
}

export const addFounderAction = async ({ request }) => {
  const formData = await request.formData()

  try {
    const { data } = await api.post(
      '/admin/founders',
      Object.fromEntries(formData)
    )
    return { created: data }
  } catch (err) {
    if (!err.response) {
      return { error: 'Network error. Try again.' }
    }
    return { error: err.response.data?.error || 'Could not add founder' }
  }
}

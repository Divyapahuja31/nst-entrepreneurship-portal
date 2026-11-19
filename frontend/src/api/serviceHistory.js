import { api } from './client'
import toError from './toError'

export async function serviceHistoryLoader({ request }) {
  const { searchParams } = new URL(request.url)
  try {
    const { data } = await api.get('/admin/service-history', {
      params: Object.fromEntries(searchParams),
      signal: request.signal,
    })
    return data
  } catch (error) {
    return toError(error, 'Could not load service history.')
  }
}

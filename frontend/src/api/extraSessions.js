import { api } from './client'
import toError from './toError'

// Extra sessions on any day, for admins and the academic board.
export const extraSessionsLoader = async () => {
  const { data } = await api.get('/admin/extra-sessions')
  return data
}

// Each returns the page's new data as { page }, or { error, field }.
const send = async (request, fallback) => {
  try {
    const { data } = await request()
    return { page: data }
  } catch (err) {
    return { ...toError(err, fallback), field: err.response?.data?.field }
  }
}

export const createExtraSession = session =>
  send(
    () => api.post('/admin/extra-sessions', session),
    'Could not add the session'
  )

export const updateExtraSession = (sessionId, session) =>
  send(
    () => api.put(`/admin/extra-sessions/${sessionId}`, session),
    'Could not change the session'
  )

export const cancelExtraSession = sessionId =>
  send(
    () => api.post(`/admin/extra-sessions/${sessionId}/cancel`),
    'Could not cancel the session'
  )

import { api } from './client'
import toError from './toError'

// The admin's Programme page: settings, staff, invitations and sessions.
export const programmeLoader = async () => {
  const { data } = await api.get('/admin/programme')
  return data
}

// Returns the page's new data, or { error, field }.
export const saveProgramme = async settings => {
  try {
    const { data } = await api.put('/admin/programme', settings)
    return { page: data }
  } catch (err) {
    return {
      ...toError(err, 'Could not save the programme'),
      field: err.response?.data?.field,
    }
  }
}

// action: 'schedule', 'redraw' or 'cancel'.
export const sessionAction = async (sessionId, action) => {
  try {
    const { data } = await api.post(
      `/admin/programme/sessions/${sessionId}/${action}`
    )
    return { page: data }
  } catch (err) {
    return toError(err, 'Could not update the session')
  }
}

import { api } from './client'
import toError from './toError'

// The admin's School Setup page: campuses, batches and the email domains
// people may sign up with. Every change answers with the whole page.
export const setupLoader = async () => {
  const { data } = await api.get('/admin/setup')
  return data
}

const change = async (request, fallback) => {
  try {
    const { data } = await request()
    return { page: data }
  } catch (err) {
    return toError(err, fallback)
  }
}

export const addCampus = campus =>
  change(
    () => api.post('/admin/setup/campuses', campus),
    'Could not add the campus'
  )

export const removeCampus = id =>
  change(
    () => api.delete(`/admin/setup/campuses/${id}`),
    'Could not remove the campus'
  )

export const addBatch = batch =>
  change(
    () => api.post('/admin/setup/batches', batch),
    'Could not add the batch'
  )

export const removeBatch = id =>
  change(
    () => api.delete(`/admin/setup/batches/${id}`),
    'Could not remove the batch'
  )

export const addDomain = domain =>
  change(
    () => api.post('/admin/setup/domains', domain),
    'Could not add the domain'
  )

export const setDomainStaff = (id, staff) =>
  change(
    () => api.patch(`/admin/setup/domains/${id}`, { staff }),
    'Could not change the domain'
  )

export const removeDomain = id =>
  change(
    () => api.delete(`/admin/setup/domains/${id}`),
    'Could not remove the domain'
  )

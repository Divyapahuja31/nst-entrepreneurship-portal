import { api } from './client'
import { loadCheckIns } from './checkins'
import toError from './toError'

export const foundersLoader = async () => {
  const { data } = await api.get('/admin/founders')
  return data
}

// The overview, and the programme meetings the signed-in staff member runs.
export const foundersCount = async () => {
  const [{ data }, programmeMeetings] = await Promise.all([
    api.get('/admin/overview'),
    loadCheckIns({ mine: 1 }),
  ])
  return { ...data, programmeMeetings }
}

export const addFounderLoader = async () => {
  const { data } = await api.get('/admin/founder-options')
  return data
}

// The founder, their KPIs, the bi-weekly reports of the startup they are
// in now and the check-ins they were invited to.
export const founderProfileLoader = async ({ params }) => {
  const [{ data: biweekly }, kpisRes, checkIns] = await Promise.all([
    api.get('/biweekly', { params: { founderId: params?.userid } }),
    api
      .get(`/kpis/founder/${params?.userid}`)
      .catch(() => ({ data: { data: [] } })),
    loadCheckIns({ founderId: params?.userid }),
  ])
  return {
    ...biweekly,
    kpis: kpisRes.data?.data || [],
    checkIns,
  }
}

export const createFounder = async payload => {
  try {
    const { data } = await api.post('/admin/founders', payload)

    return { created: data }
  } catch (err) {
    return toError(err, 'Could not add founder')
  }
}

export const deleteFounders = async founders => {
  try {
    const { data } = await api.delete('/admin/founders/delete', {
      data: { founders },
    })

    return { data }
  } catch (err) {
    return toError(err, 'Failed to delete founders')
  }
}

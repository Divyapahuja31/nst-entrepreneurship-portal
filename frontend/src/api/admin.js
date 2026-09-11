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

export const biWeeklyLoader = async ({ params }) => {
  const [{ data: biweekly }, kpisRes] = await Promise.all([
    api.get('/biweekly', {
      params: {
        founderId: params?.userid,
      },
    }),
    api
      .get(`/kpis/founder/${params?.userid}`)
      .catch(() => ({ data: { data: [] } })),
  ])
  return {
    ...biweekly,
    kpis: kpisRes.data?.data || [],
  }
}

export const profileAction = async ({ request }) => {
  let data
  if (request.headers.get('content-type')?.includes('application/json')) {
    data = await request.json()
  } else {
    const formData = await request.formData()
    data = Object.fromEntries(formData)
  }

  const { intent, ...payload } = data

  if (intent === 'evaluateKPI') {
    const { kpiId, score, status, feedback } = payload
    try {
      const { data: res } = await api.put(`/kpis/${kpiId}/evaluate`, {
        score,
        status,
        feedback,
      })
      return { success: true, data: res }
    } catch (err) {
      return {
        error: err.response?.data?.message || err.message || 'Evaluation failed',
      }
    }
  }

  return { success: true }
}


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

  try {
    if (intent === 'evaluateKPI') {
      const { kpiId, score, status, feedback } = payload
      const { data: res } = await api.put(`/kpis/${kpiId}/evaluate`, {
        score,
        status,
        feedback,
      })
      return { success: true, intent, data: res }
    }

    if (intent === 'saveObservation') {
      const { data: res } = await api.post('/biweekly/observation', payload)
      return { success: true, intent, data: res }
    }

    if (intent === 'saveEvaluation') {
      const { data: res } = await api.post('/biweekly/evaluation', payload)
      return { success: true, intent, data: res }
    }

    if (intent === 'reopenSubmission') {
      const { data: res } = await api.post('/biweekly/reopen', payload)
      return { success: true, intent, data: res }
    }

    if (intent === 'submitCycle') {
      const { data: res } = await api.post('/biweekly/submission', payload)
      return { success: true, intent, data: res }
    }
  } catch (err) {
    return {
      error:
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Action failed',
    }
  }

  return { success: true }
}

export const portfolioAction = async ({ request }) => {
  let data
  if (request.headers.get('content-type')?.includes('application/json')) {
    data = await request.json()
  } else {
    const formData = await request.formData()
    data = Object.fromEntries(formData)
  }

  const { intent, ...payload } = data

  if (intent === 'deleteFounders') {
    try {
      const { data: res } = await api.delete('/admin/founders/delete', {
        data: { founders: payload.founders },
      })
      return { success: true, data: res }
    } catch (err) {
      return {
        error:
          err.response?.data?.error ||
          err.response?.data?.message ||
          'Failed to delete founders',
      }
    }
  }

  return { success: true }
}


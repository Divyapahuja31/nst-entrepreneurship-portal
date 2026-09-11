import { api } from './client'

export const getVentureKPIs = async ventureId => {
  try {
    const { data } = await api.get(`/kpis/venture/${ventureId}`)
    return data
  } catch (error) {
    throw new Error(
      error.response?.data?.message || error.message || 'Failed to fetch KPIs', { cause: error }
    )
  }
}

export const getFounderKPIs = async founderId => {
  try {
    const { data } = await api.get(`/kpis/founder/${founderId}`)
    return data
  } catch (error) {
    throw new Error(
      error.response?.data?.message || error.message || 'Failed to fetch founder KPIs', { cause: error }
    )
  }
}

export const evaluateKPI = async ({ kpiId, score, status, feedback }) => {
  try {
    const { data } = await api.put(`/kpis/${kpiId}/evaluate`, {
      score,
      status,
      feedback,
    })
    return data
  } catch (error) {
    throw new Error(
      error.response?.data?.message || error.message || 'Failed to evaluate KPI', { cause: error }
    )
  }
}

export const submitKPIEvidence = async ({
  kpiId,
  actualValue,
  targetValue,
  supportingText,
  fileName,
  fileUrl,
}) => {
  try {
    const { data } = await api.put(`/kpis/${kpiId}/evidence`, {
      actualValue,
      targetValue,
      supportingText,
      fileName,
      fileUrl,
    })
    return data
  } catch (error) {
    throw new Error(
      error.response?.data?.message || error.message || 'Failed to submit evidence', { cause: error }
    )
  }
}

export const createKPI = async ({
  title,
  description,
  dueDate,
  venture,
  status,
}) => {
  try {
    const { data } = await api.post('/kpis', {
      title,
      description,
      dueDate: dueDate || null,
      venture,
      status,
    })
    return data
  } catch (error) {
    throw new Error(
      error.response?.data?.message || error.message || 'Failed to create KPI', { cause: error }
    )
  }
}

export const createSubKPI = async ({
  kpiId,
  name,
  description,
}) => {
  try {
    const { data } = await api.post(`/subkpis/kpi/${kpiId}`, {
      name,
      description,
    })
    return data
  } catch (error) {
    throw new Error(
      error.response?.data?.message || error.message || 'Failed to create SubKPI', { cause: error }
    )
  }
}

export const submitKPIForApproval = async kpiId => {
  try {
    const { data } = await api.post(`/kpis/${kpiId}/submit`)
    return data
  } catch (error) {
    throw new Error(
      error.response?.data?.message || error.message || 'Failed to submit KPI', { cause: error }
    )
  }
}

export const updateKPI = async ({
  kpiId,
  title,
  description,
  dueDate,
  status,
  subKpis,
}) => {
  try {
    const { data } = await api.put(`/kpis/${kpiId}`, {
      title,
      description,
      dueDate: dueDate || null,
      status,
      subKpis,
    })
    return data
  } catch (error) {
    throw new Error(
      error.response?.data?.message || error.message || 'Failed to update KPI', { cause: error }
    )
  }
}

export const deleteKPI = async kpiId => {
  try {
    const { data } = await api.delete(`/kpis/${kpiId}`)
    return data
  } catch (error) {
    throw new Error(
      error.response?.data?.message || error.message || 'Failed to delete KPI', { cause: error }
    )
  }
}

export const updateSubKPI = async ({ id, name, description }) => {
  try {
    const { data } = await api.put(`/subkpis/${id}`, { name, description })
    return data
  } catch (error) {
    throw new Error(
      error.response?.data?.message || error.message || 'Failed to update SubKPI', { cause: error }
    )
  }
}

export const deleteSubKPI = async id => {
  try {
    const { data } = await api.delete(`/subkpis/${id}`)
    return data
  } catch (error) {
    throw new Error(
      error.response?.data?.message || error.message || 'Failed to delete SubKPI', { cause: error }
    )
  }
}

export const uploadKPIEvidence = async (kpiId, formData) => {
  try {
    const { data } = await api.post(`/kpis/${kpiId}/evidence`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return data
  } catch (error) {
    throw new Error(
      error.response?.data?.message || error.message || 'Failed to upload evidence', { cause: error }
    )
  }
}

export const deleteKPIEvidence = async kpiId => {
  try {
    const { data } = await api.delete(`/kpis/${kpiId}/evidence`)
    return data
  } catch (error) {
    throw new Error(
      error.response?.data?.message || error.message || 'Failed to delete evidence', { cause: error }
    )
  }
}

export const kpisLoader = async ({ request, params }) => {
  const url = new URL(request.url)
  const ventureId = url.searchParams.get('ventureId') || params?.ventureId
  try {
    const endpoint = ventureId ? `/kpis/venture/${ventureId}` : '/kpis'
    const { data } = await api.get(endpoint)
    return data
  } catch (error) {
    return {
      success: false,
      data: [],
      error:
        error.response?.data?.message ||
        error.message ||
        'Failed to load KPIs',
    }
  }
}

export const kpisAction = async ({ request }) => {
  let data
  if (request.headers.get('content-type')?.includes('application/json')) {
    data = await request.json()
  } else {
    const formData = await request.formData()
    data = Object.fromEntries(formData)
  }

  const { intent, ...payload } = data

  try {
    if (intent === 'createKPI') {
      const { title, description, dueDate, venture, status, subKpis } = payload
      const res = await api.post('/kpis', {
        title,
        description,
        dueDate: dueDate || null,
        venture,
        status,
      })
      const newKpi = res.data?.data
      if (newKpi?._id && Array.isArray(subKpis) && subKpis.length > 0) {
        for (const sub of subKpis) {
          if (sub.name?.trim()) {
            await api.post(`/subkpis/kpi/${newKpi._id}`, {
              name: sub.name.trim(),
              description: sub.description || '',
            })
          }
        }
      }
      return { success: true, data: newKpi }
    }

    if (intent === 'updateKPI') {
      const { kpiId, title, description, dueDate, status, subKpis } = payload
      const { data: res } = await api.put(`/kpis/${kpiId}`, {
        title,
        description,
        dueDate: dueDate || null,
        status,
      })
      if (Array.isArray(subKpis)) {
        for (const sub of subKpis) {
          if (!sub.name?.trim()) {
            continue
          }
          const subId = sub._id || sub.id
          if (subId && typeof subId === 'string' && subId.length === 24) {
            await api.put(`/subkpis/${subId}`, {
              name: sub.name.trim(),
              description: sub.description || sub.name.trim(),
            })
          } else {
            await api.post(`/subkpis/kpi/${kpiId}`, {
              name: sub.name.trim(),
              description: sub.description || sub.name.trim(),
            })
          }
        }
      }
      return { success: true, data: res }
    }

    if (intent === 'deleteKPI') {
      const { kpiId } = payload
      const { data: res } = await api.delete(`/kpis/${kpiId}`)
      return { success: true, data: res }
    }

    if (intent === 'submitKPI') {
      const { kpiId } = payload
      const { data: res } = await api.post(`/kpis/${kpiId}/submit`)
      return { success: true, data: res }
    }

    if (intent === 'submitEvidence') {
      const { kpiId, actualValue, targetValue, supportingText, fileName, fileUrl } = payload
      const { data: res } = await api.put(`/kpis/${kpiId}/evidence`, {
        actualValue,
        targetValue,
        supportingText,
        fileName,
        fileUrl,
      })
      return { success: true, data: res }
    }

    if (intent === 'deleteSubKPI') {
      const { subKpiId } = payload
      const { data: res } = await api.delete(`/subkpis/${subKpiId}`)
      return { success: true, data: res }
    }

    return { success: true }
  } catch (err) {
    return {
      error:
        err.response?.data?.message || err.message || 'Operation failed',
    }
  }
}
import { api } from './client'
import toError from './toError'

export const getVentureKPIs = async ventureId => {
  try {
    const { data } = await api.get(`/kpis/venture/${ventureId}`)
    return data
  } catch (error) {
    throw new Error(
      error.response?.data?.message || error.message || 'Failed to fetch KPIs',
      { cause: error }
    )
  }
}

export const getFounderKPIs = async founderId => {
  try {
    const { data } = await api.get(`/kpis/founder/${founderId}`)
    return data
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        'Failed to fetch founder KPIs',
      { cause: error }
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
      error.response?.data?.message ||
        error.message ||
        'Failed to evaluate KPI',
      { cause: error }
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
      error.response?.data?.message ||
        error.message ||
        'Failed to submit evidence',
      { cause: error }
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
      error.response?.data?.message || error.message || 'Failed to create KPI',
      { cause: error }
    )
  }
}

export const createSubKPI = async ({ kpiId, name, description }) => {
  try {
    const { data } = await api.post(`/subkpis/kpi/${kpiId}`, {
      name,
      description,
    })
    return data
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        'Failed to create SubKPI',
      { cause: error }
    )
  }
}

export const submitKPIForApproval = async kpiId => {
  try {
    const { data } = await api.post(`/kpis/${kpiId}/submit`)
    return data
  } catch (error) {
    throw new Error(
      error.response?.data?.message || error.message || 'Failed to submit KPI',
      { cause: error }
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
      error.response?.data?.message || error.message || 'Failed to update KPI',
      { cause: error }
    )
  }
}

export const deleteKPI = async kpiId => {
  try {
    const { data } = await api.delete(`/kpis/${kpiId}`)
    return data
  } catch (error) {
    throw new Error(
      error.response?.data?.message || error.message || 'Failed to delete KPI',
      { cause: error }
    )
  }
}

export const updateSubKPI = async ({ id, name, description }) => {
  try {
    const { data } = await api.put(`/subkpis/${id}`, { name, description })
    return data
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        'Failed to update SubKPI',
      { cause: error }
    )
  }
}

export const deleteSubKPI = async id => {
  try {
    const { data } = await api.delete(`/subkpis/${id}`)
    return data
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        'Failed to delete SubKPI',
      { cause: error }
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
      error.response?.data?.message ||
        error.message ||
        'Failed to upload evidence',
      { cause: error }
    )
  }
}

export const deleteKPIEvidence = async kpiId => {
  try {
    const { data } = await api.delete(`/kpis/${kpiId}/evidence`)
    return data
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        'Failed to delete evidence',
      { cause: error }
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
        error.response?.data?.message || error.message || 'Failed to load KPIs',
    }
  }
}

// Creating or editing a KPI also reconciles its sub-KPIs, so both live here as
// one operation rather than being re-assembled by every caller.
export const createKPIWithSubKpis = async payload => {
  const { title, description, dueDate, venture, status, subKpis } = payload

  try {
    const res = await api.post('/kpis', {
      title,
      description,
      dueDate: dueDate || null,
      venture,
      status,
    })

    const newKpi = res.data?.data

    if (newKpi?._id && Array.isArray(subKpis)) {
      for (const sub of subKpis) {
        if (sub.name?.trim()) {
          await api.post(`/subkpis/kpi/${newKpi._id}`, {
            name: sub.name.trim(),
            description: sub.description || '',
          })
        }
      }
    }

    return { data: newKpi }
  } catch (err) {
    return toError(err, 'Could not create KPI')
  }
}

export const updateKPIWithSubKpis = async payload => {
  const { kpiId, title, description, dueDate, status, subKpis, venture } =
    payload

  try {
    const { data: res } = await api.put(`/kpis/${kpiId}`, {
      title,
      description,
      dueDate: dueDate || null,
      status,
    })

    // Sub-KPIs the user removed in the form have to be deleted explicitly.
    try {
      const endpoint = venture ? `/kpis/venture/${venture}` : '/kpis'
      const { data } = await api.get(endpoint)
      const existingKpi = (data?.data || []).find(k => k._id === kpiId)

      if (existingKpi && Array.isArray(existingKpi.subKPIs)) {
        const oldSubIds = existingKpi.subKPIs.map(sub =>
          (sub._id || sub.id || sub).toString()
        )
        const newSubIds = Array.isArray(subKpis)
          ? subKpis
              .map(sub => (sub._id || sub.id)?.toString())
              .filter(id => id && id.length === 24)
          : []

        for (const subId of oldSubIds.filter(id => !newSubIds.includes(id))) {
          await api.delete(`/subkpis/${subId}`)
        }
      }
    } catch (err) {
      console.error(err)
    }

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

    return { data: res }
  } catch (err) {
    return toError(err, 'Could not update KPI')
  }
}

export const allKPIsLoader = async () => {
  const { data } = await api.get('/kpis/all')

  return { kpis: data.data || [] }
}

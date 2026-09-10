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

export const createKPI = async ({
  title,
  description,
  dueDate,
  venture,
}) => {
  try {
    const { data } = await api.post('/kpis', {
      title,
      description,
      dueDate: dueDate || null,
      venture,
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
import { api } from './client'
import toError from './toError'

// Admin review of the KPIs the bot recommends for a startup.

export const listRecommendations = async ventureId => {
  try {
    const { data } = await api.get('/kpi-recommendations', {
      params: { ventureId },
    })
    return { recommendations: data.data }
  } catch (err) {
    return toError(err, 'Could not load the recommended KPIs')
  }
}

// Makes it a draft KPI, returned as `kpi`.
export const acceptRecommendation = async id => {
  try {
    const { data } = await api.post(`/kpi-recommendations/${id}/accept`)
    return { kpi: data.data }
  } catch (err) {
    return toError(err, 'Could not add the KPI')
  }
}

export const dismissRecommendation = async id => {
  try {
    await api.post(`/kpi-recommendations/${id}/dismiss`)
    return {}
  } catch (err) {
    return toError(err, 'Could not dismiss the recommendation')
  }
}

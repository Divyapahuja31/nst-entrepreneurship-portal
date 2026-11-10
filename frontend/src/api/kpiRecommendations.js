import { api } from './client'
import toError from './toError'

// KPIs the bot recommends from meeting transcripts. A student gets their
// own; staff name the startup. Each returns { error } on failure.

export const listRecommendations = async ventureId => {
  try {
    const { data } = await api.get('/kpi-recommendations', {
      params: ventureId ? { ventureId } : undefined,
    })
    return { recommendations: data.data }
  } catch (err) {
    return toError(err, 'Could not load the recommended KPIs')
  }
}

// Makes it the founder's draft KPI, returned as `kpi`.
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

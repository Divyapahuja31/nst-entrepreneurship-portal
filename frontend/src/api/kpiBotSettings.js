import { api } from './client'
import toError from './toError'

export const loadKpiBotSettings = async () => {
  try {
    const { data } = await api.get('/admin/kpi-bot-settings')
    return { settings: data }
  } catch (error) {
    return toError(error, 'Could not load the KPI bot prompt')
  }
}

export const saveKpiBotSettings = async (guidance, revision) => {
  try {
    const { data } = await api.put('/admin/kpi-bot-settings', {
      guidance,
      revision,
    })
    return { settings: data }
  } catch (error) {
    return {
      ...toError(error, 'Could not save the KPI bot prompt'),
      conflict: error.response?.status === 409,
    }
  }
}

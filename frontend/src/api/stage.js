import { api } from './client'

export const getStages = async () => {
  const { data } = await api.get('/stages')

  return data.stages
}

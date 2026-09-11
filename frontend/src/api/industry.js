import { api } from './client'

export const getIndustries = async () => {
  const { data } = await api.get('/industries')

  return data.industries
}

import { api } from './client'

export const foundersLoader = async () => {
  const { data } = await api.get('/admin/founders')
  return data
}

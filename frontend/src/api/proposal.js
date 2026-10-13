import { api } from './client'
import toError from './toError'

export const getMyProposal = async () => {
  const { data } = await api.get('/proposals/me')

  return data.proposal
}

export const createProposal = async payload => {
  try {
    const { data } = await api.post('/proposals', payload)

    return { proposal: data.proposal }
  } catch (err) {
    return {
      ...toError(err, 'Could not submit proposal'),
      code: err.response?.data?.code,
    }
  }
}

// The campuses a student can pick when their account has none.
export const getCampuses = async () => {
  try {
    const { data } = await api.get('/auth/google/signup-options')
    return data.campuses ?? []
  } catch {
    return []
  }
}

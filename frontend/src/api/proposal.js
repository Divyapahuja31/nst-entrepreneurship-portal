import { api } from './client'

export const getMyProposal = async () => {
  const { data } = await api.get('/proposals/me')

  return data.proposal
}

export const createProposal = async payload => {
  try {
    const { data } = await api.post('/proposals', payload)

    return { proposal: data.proposal }
  } catch (err) {
    if (!err.response) {
      return { error: 'Network error. Try again.' }
    }

    return {
      error: err.response.data?.error || 'Could not submit proposal',
    }
  }
}

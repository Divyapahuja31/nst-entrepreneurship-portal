import { api } from './client'

export const proposalLoader = async () => {
  try {
    const { data } = await api.get('/proposals/me')
    return { proposal: data.proposal || null }
  } catch (err) {
    if (err.response?.status === 404) {
      return { proposal: null }
    }

    return {
      proposal: null,
      error:
        err.response?.data?.error ||
        'Could not load proposal data. Please check your network connection.',
    }
  }
}

export const proposalAction = async ({ request }) => {
  const data = await request.json()
  try {
    const response = await api.post('/proposals', data)

    return {
      success: true,
      proposal: response.data.proposal,
    }
  } catch (err) {
    if (!err.response) {
      return {
        error: 'Network error. Try again.',
      }
    }

    return {
      error:
        err.response.data?.error ||
        'Could not submit proposal',
    }
  }
}

export const getMyProposal = async () => {
  const { data } = await api.get('/proposals/me')

  return data.proposal
}

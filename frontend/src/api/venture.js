import { api } from './client'

export const getVentures = async () => {
  const { data } = await api.get('/ventures')

  return data
}

export const getMyJoinRequest = async () => {
  const { data } = await api.get('/ventures/join-requests/me')

  return data.joinRequest
}

export const applyToVenture = async (ventureId, message) => {
  try {
    const { data } = await api.post(`/ventures/${ventureId}/join`, { message })

    return { joinRequest: data.joinRequest }
  } catch (err) {
    if (!err.response) {
      return { error: 'Network error. Try again.' }
    }

    return {
      error: err.response.data?.error || 'Could not submit join request',
    }
  }
}

export const ventureDetailLoader = async ({ params }) => {
  const { data } = await api.get(`/ventures/${params.ventureId}`)

  return data
}

export const venturesPageLoader = async () => {
  const [ventures, applications] = await Promise.all([
    api.get('/ventures'),
    api.get('/admin/applications'),
  ])

  return {
    ventures: ventures.data,
    proposals: applications.data.proposals,
    joinRequests: applications.data.joinRequests,
  }
}

const toReviewError = (err, fallback) => {
  if (!err.response) {
    return { error: 'Network error. Try again.' }
  }

  return { error: err.response.data?.error || fallback }
}

export const reviewProposal = async (proposalId, status, remarks) => {
  try {
    const { data } = await api.patch(`/admin/proposals/${proposalId}/review`, {
      status,
      remarks,
    })

    return { proposal: data.proposal }
  } catch (err) {
    return toReviewError(err, 'Could not review proposal')
  }
}

export const reviewJoinRequest = async (requestId, status) => {
  try {
    const { data } = await api.patch(
      `/admin/join-requests/${requestId}/review`,
      { status }
    )

    return { joinRequest: data.joinRequest }
  } catch (err) {
    return toReviewError(err, 'Could not review join request')
  }
}

import { api } from './client'
import toError from './toError'

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
    return toError(err, 'Could not submit join request')
  }
}

export const ventureDetailLoader = async ({ params }) => {
  const [{ data: ventureData }, biweeklyRes, kpisRes] = await Promise.all([
    api.get(`/ventures/${params.ventureId}`),
    api
      .get('/biweekly', { params: { ventureId: params.ventureId } })
      .catch(() => ({ data: null })),
    api
      .get(`/kpis/venture/${params.ventureId}`)
      .catch(() => ({ data: { data: [] } })),
  ])

  return {
    ...ventureData,
    biweekly: biweeklyRes?.data,
    kpis: kpisRes?.data?.data || [],
  }
}

export const venturesPageLoader = async () => {
  const [ventures, applications, mentors] = await Promise.all([
    api.get('/ventures'),
    api.get('/admin/applications'),
    api.get('/admin/mentors'),
  ])

  return {
    ventures: ventures.data,
    proposals: applications.data.proposals,
    joinRequests: applications.data.joinRequests,
    mentors: mentors.data.mentors,
  }
}

// mentorId is who mentors the new startup when the board approves it; a
// mentor who approves becomes its mentor.
export const reviewProposal = async (proposalId, status, remarks, mentorId) => {
  try {
    const { data } = await api.patch(`/admin/proposals/${proposalId}/review`, {
      status,
      remarks,
      mentorId: mentorId || undefined,
    })

    return { proposal: data.proposal }
  } catch (err) {
    return toError(err, 'Could not review proposal')
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
    return toError(err, 'Could not review join request')
  }
}

// Active mentor accounts, for choosing who mentors a startup.
export const getMentors = async () => {
  try {
    const { data } = await api.get('/admin/mentors')
    return { mentors: data.mentors }
  } catch (err) {
    return toError(err, 'Could not load mentors')
  }
}

export const setVentureMentor = async (ventureId, mentorId) => {
  try {
    const { data } = await api.patch(`/admin/ventures/${ventureId}/mentor`, {
      mentorId: mentorId || null,
    })
    return { mentor: data.mentor }
  } catch (err) {
    return toError(err, 'Could not assign the mentor')
  }
}

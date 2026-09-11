import { api } from './client'

export const biWeeklyLoader = async ({ params }) => {
  const { data } = await api.get('/biweekly', {
    params: {
      founderId: params?.userid,
    },
  })
  return data
}

export const submitBiWeeklyCycle = async payload => {
  const { data } = await api.post('/biweekly/submission', payload)
  return data
}

export const saveBiWeeklyObservation = async payload => {
  const { data } = await api.post('/biweekly/observation', payload)
  return data
}

export const saveBiWeeklyEvaluation = async payload => {
  const { data } = await api.post('/biweekly/evaluation', payload)
  return data
}

export const reopenBiWeeklySubmission = async (founderId, cycleNumber) => {
  const { data } = await api.post('/biweekly/reopen', {
    founderId,
    cycle_number: cycleNumber,
  })
  return data
}

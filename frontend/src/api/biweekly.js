import { api } from './client'

// The signed-in student's startup's reports.
export const biWeeklyLoader = async () => {
  const { data } = await api.get('/biweekly')
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

export const reopenBiWeeklySubmission = async payload => {
  const { data } = await api.post('/biweekly/reopen', payload)
  return data
}

import { api } from './client'
import toError from './toError'

const adminPath = '/admin/report-cards'
const studentPath = id => `${adminPath}/students/${id}`

export const reportCardsLoader = async () => (await api.get(adminPath)).data
export const studentReportCardLoader = async ({ params }) =>
  (await api.get(studentPath(params.studentId))).data
export const myReportCardLoader = async () =>
  (await api.get('/report-card')).data

const mutate = async (method, path, payload) => {
  try {
    return (await api[method](path, payload)).data
  } catch (err) {
    const failure = toError(err, 'Could not update the report card. Try again.')
    if (
      payload.layout &&
      failure.error === 'Enter a unique name for each column.'
    ) {
      return {
        error:
          'The demo API is out of date. Restart the demo to use term layouts.',
      }
    }
    return failure
  }
}

export const createTemplate = payload =>
  mutate('post', `${adminPath}/templates`, payload)

export const createReportCard = (id, templateId) =>
  mutate('post', studentPath(id), { templateId })

export const saveReportCard = (id, payload) =>
  mutate('put', studentPath(id), payload)

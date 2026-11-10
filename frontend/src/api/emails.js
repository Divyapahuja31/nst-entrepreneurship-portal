import { api } from './client'
import toError from './toError'

// The admin's Emails page. A failed save names the setting at fault in
// `field` (e.g. "templates.student-result.subject").
export const emailsLoader = async () => {
  const { data } = await api.get('/admin/emails')
  return data
}

const failure = (err, fallback) => ({
  ...toError(err, fallback),
  field: err.response?.data?.field ?? null,
})

export const saveEmailSettings = async settings => {
  try {
    const { data } = await api.put('/admin/emails', settings)
    return { page: data }
  } catch (err) {
    return failure(err, 'Could not save the email settings')
  }
}

// One email with sample data, built from settings that aren't saved yet.
export const previewEmail = async ({ key, score, settings }) => {
  try {
    const { data } = await api.post('/admin/emails/preview', {
      key,
      score,
      settings,
    })
    return { email: data }
  } catch (err) {
    return failure(err, 'Could not preview the email')
  }
}

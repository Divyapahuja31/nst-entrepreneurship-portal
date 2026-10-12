import { api } from './client'
import toError from './toError'

// Bi-weekly check-ins: Google Meet events on the mentor's calendar.

const withCode = (err, fallback) => ({
  ...toError(err, fallback),
  code: err.response?.data?.code,
})

// The signed-in student's startup's check-ins.
export const myCheckInsLoader = async () => {
  const { data } = await api.get('/checkins')
  return data
}

// For a page that still works without them: null when they can't load.
export const loadCheckIns = params =>
  api
    .get('/checkins', { params })
    .then(({ data }) => data.checkIns)
    .catch(() => null)

// `recurring` repeats it every two weeks through the startup's last cycle.
export const scheduleCheckIn = async payload => {
  try {
    const { data } = await api.post('/checkins', {
      ...payload,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
    return { checkIns: data.checkIns }
  } catch (err) {
    return withCode(err, 'Could not schedule the check-in')
  }
}

export const moveCheckIn = async (id, payload) => {
  try {
    const { data } = await api.patch(`/checkins/${id}`, payload)
    return { checkIn: data.checkIn }
  } catch (err) {
    return withCode(err, 'Could not move the check-in')
  }
}

export const cancelCheckIn = async id => {
  try {
    const { data } = await api.delete(`/checkins/${id}`)
    return { checkIn: data.checkIn }
  } catch (err) {
    return withCode(err, 'Could not cancel the check-in')
  }
}

export const endCheckInSeries = async seriesId => {
  try {
    const { data } = await api.delete(`/checkins/series/${seriesId}`)
    return { checkIns: data.checkIns }
  } catch (err) {
    return withCode(err, 'Could not end the recurring check-in')
  }
}

// ------------------------------------------- the mentor's Google Calendar

export const getCalendarStatus = async () => {
  try {
    const { data } = await api.get('/google/status')
    return data
  } catch (err) {
    return toError(err, 'Could not check your Google Calendar')
  }
}

// A full-page visit: Google asks for consent, then sends the mentor back to
// `returnTo` with ?calendar=<outcome>.
export const calendarConnectUrl = returnTo =>
  `/api/google/connect?returnTo=${encodeURIComponent(returnTo)}`

export const disconnectCalendar = async () => {
  try {
    await api.delete('/google/connection')
    return {}
  } catch (err) {
    return toError(err, 'Could not disconnect Google Calendar')
  }
}

// ------------------------------------------------ transcripts and notes

export const getCheckIn = async id => {
  try {
    const { data } = await api.get(`/checkins/${id}`)
    return { checkIn: data.checkIn }
  } catch (err) {
    return toError(err, 'Could not load the check-in')
  }
}

export const saveCheckInNotes = async (id, notes) => {
  try {
    const { data } = await api.put(`/checkins/${id}/notes`, { notes })
    return { notes: data.notes }
  } catch (err) {
    return toError(err, 'Could not save the notes')
  }
}

// `settled` says whether Meet gave a definite answer.
export const refreshTranscript = async id => {
  try {
    const { data } = await api.post(`/checkins/${id}/transcript/refresh`)
    return { checkIn: data.checkIn, settled: data.settled }
  } catch (err) {
    return withCode(err, 'Could not check for a transcript')
  }
}

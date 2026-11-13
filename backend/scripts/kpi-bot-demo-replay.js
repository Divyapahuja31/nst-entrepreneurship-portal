import { extractCheckInKpis, setKpiExtractor } from '../utils/kpiBot.js'

// A fixed extraction response for the sample transcript. The bot still checks
// quotes, matches speakers to founders, and saves the recommendations itself.
const goals = [
  {
    speaker: "Aarav's Pixel",
    title: 'Ship the Android app',
    description: 'Publish version one of the Android app on the Play Store.',
    targetValue: 'Version one published',
    quote:
      'I will ship version one of the Android app on the Play Store in the next seven days.',
    due: 7,
  },
  {
    speaker: "Aarav's Pixel",
    title: 'Reach 250 weekly active users',
    description: 'Track weekly active users after the college fest.',
    targetValue: '250 weekly active users',
    quote: 'Okay, 250 weekly active users by the 15th then.',
    due: 'next month',
  },
  {
    speaker: 'Riya Sharma',
    title: 'Interview 30 teachers',
    description:
      'Run customer interviews with teachers to understand their needs.',
    targetValue: '30 teacher interviews',
    quote:
      'I will do 30 customer interviews with teachers in the next two weeks.',
    due: 14,
  },
]

const deadline = (meetingDate, due) => {
  if (due === 'next month') {
    const nextMonth = new Date(`${meetingDate.slice(0, 7)}-15T00:00:00Z`)
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1)
    return nextMonth.toISOString().slice(0, 10)
  }
  const date = new Date(`${meetingDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + due)
  return date.toISOString().slice(0, 10)
}

const replay = ({ meetingDate }) =>
  goals.map(({ due, ...goal }) => ({
    ...goal,
    dueDate: deadline(meetingDate, due),
  }))

export function startDemoKpiWorker(checkInId) {
  setKpiExtractor(replay)
  let inFlight
  const timer = setInterval(() => {
    inFlight ??= extractCheckInKpis({ checkInId })
      .catch(error =>
        console.error('KPI demo extraction failed:', error.message)
      )
      .finally(() => {
        inFlight = null
      })
  }, 500)
  timer.unref()

  return async () => {
    clearInterval(timer)
    await inFlight
    setKpiExtractor(null)
  }
}

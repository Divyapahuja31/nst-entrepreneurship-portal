import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import { CALENDAR_OUTCOMES } from '../calendarOutcomes'

// Shows the outcome of connecting Google once, then drops it from the URL.
export default function useCalendarOutcome() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [outcome] = useState(
    () => CALENDAR_OUTCOMES[searchParams.get('calendar')]
  )
  useEffect(() => {
    if (searchParams.has('calendar')) {
      setSearchParams(
        params => {
          params.delete('calendar')
          return params
        },
        { replace: true }
      )
    }
  }, [searchParams, setSearchParams])
  return outcome
}

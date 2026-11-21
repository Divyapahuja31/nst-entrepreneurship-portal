import { useEffect, useReducer } from 'react'

// Refresh controls as a cutoff passes while the page stays open.
export default function useDeadlineRefresh() {
  const [, refresh] = useReducer(value => value + 1, 0)
  useEffect(() => {
    const timer = setInterval(refresh, 1000)
    return () => clearInterval(timer)
  }, [])
}

import { useCallback, useState } from 'react'

// Step state that remembers which way the user moved, so the next step
// enters from the side they are heading towards (forward = right, back = left).
export default function useAuthStep(initial = 1) {
  const [state, setState] = useState({ step: initial, direction: 1 })

  const goTo = useCallback(
    next =>
      setState(prev => ({
        step: next,
        direction: next >= prev.step ? 1 : -1,
      })),
    []
  )

  return [state.step, goTo, state.direction]
}

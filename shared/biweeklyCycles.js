// Bi-weekly cycles, shared by the API and the UI. A startup's programme runs
// 13 cycles of 14 days, counted from the day the startup was created.

export const CYCLES = 13 // 26 weeks
export const CYCLE_DAYS = 14

const DAY_MS = 24 * 60 * 60 * 1000
const CYCLE_MS = CYCLE_DAYS * DAY_MS

// When cycle n starts.
export const cycleStart = (createdAt, n) =>
  new Date(new Date(createdAt).getTime() + (n - 1) * CYCLE_MS)

// The cycle a date falls in, or null when it is before the first cycle or
// after the last.
export const cycleForDate = (createdAt, date) => {
  const elapsed = new Date(date).getTime() - new Date(createdAt).getTime()
  if (!Number.isFinite(elapsed) || elapsed < 0) {
    return null
  }
  const n = Math.floor(elapsed / CYCLE_MS) + 1
  return n <= CYCLES ? n : null
}

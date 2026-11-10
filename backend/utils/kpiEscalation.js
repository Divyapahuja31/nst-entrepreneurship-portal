// When a run of locked KPI grades should alert the mentor or the academic
// board. Pure, so it is tested without a database.

// At or below this percentage a grade is a low score, below PASS_PERCENT a
// middling one.
export const LOW_PERCENT = 40
export const PASS_PERCENT = 70
// Consecutive low or middling grades that trigger an alert.
export const STRIKES_TO_ESCALATE = 2

// KPIs are graded out of 100 unless a total is given. Multiplying first
// keeps whole scores exact: (40 / 100) * 100 is 40.00000000000001, which
// would miss the 40% threshold.
export const percentageOf = (score, totalMarks = 100) =>
  totalMarks > 0 ? (Number(score) * 100) / totalMarks : 0

const time = value => (value ? new Date(value).getTime() : 0)

// When the KPI was meant to happen: its due date, else when it was locked,
// graded or created.
const occurredAt = kpi =>
  time(kpi.dueDate ?? kpi.lockedAt ?? kpi.evaluationDate ?? kpi.createdAt)

const idOf = kpi => String(kpi._id ?? kpi.id)

// Oldest first; the id breaks ties so the order is always the same.
export const sortForEscalation = kpis =>
  [...kpis].sort(
    (a, b) => occurredAt(a) - occurredAt(b) || idOf(a).localeCompare(idOf(b))
  )

// A low grade is a strike for both, a middling one for the mentor only (and
// clears the board's run), a passing one clears both.
export const nextStrikes = ({ mentor, board }, percentage) => {
  if (percentage <= LOW_PERCENT) {
    return { mentor: mentor + 1, board: board + 1 }
  }
  if (percentage < PASS_PERCENT) {
    return { mentor: mentor + 1, board: 0 }
  }
  return { mentor: 0, board: 0 }
}

// Which alerts the KPI `currentId` sets off, given every locked, graded KPI
// in its run (including itself). A run of STRIKES_TO_ESCALATE alerts once
// and then counts again from zero, and only the KPI that completes the run
// alerts, so re-checking older KPIs never sends anything.
export const escalationsFor = (kpis, currentId) => {
  const due = { mentor: false, board: false }
  let strikes = { mentor: 0, board: 0 }
  for (const kpi of sortForEscalation(kpis)) {
    strikes = nextStrikes(strikes, percentageOf(kpi.score, kpi.totalMarks))
    const isCurrent = idOf(kpi) === String(currentId)
    for (const who of ['mentor', 'board']) {
      if (strikes[who] >= STRIKES_TO_ESCALATE) {
        due[who] ||= isCurrent
        strikes = { ...strikes, [who]: 0 }
      }
    }
  }
  return due
}

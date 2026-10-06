import { canEvaluateKpi } from '@nst/shared/permissions.js'

// The KPI permission context, as the @nst/shared rules take it, for a KPI
// shown to staff. It only decides which controls to show: the API rebuilds
// it from the database and enforces the same rules.

const idOf = value => {
  const id = value?.id ?? value?._id ?? value
  return id ? String(id) : null
}

// ventureMentor is the startup's mentor (an id or { id }), when the KPI's
// venture isn't populated with it.
export const staffKpiContext = (kpi, ventureMentor = null) => ({
  ventureMentorId: idOf(kpi.venture?.mentor ?? ventureMentor),
  isMember: false,
  kpiFounderId: idOf(kpi.founder),
  status: kpi.status,
  isLocked: Boolean(kpi.isLocked),
  isPastDue: Boolean(kpi.dueDate) && new Date(kpi.dueDate) < new Date(),
})

export const mentorIdOf = idOf

// Why this staff member can't review the KPI, or null when they can.
export const reviewBlockedReason = (actor, ctx) => {
  if (canEvaluateKpi(actor, ctx)) {
    return null
  }
  return ctx.isLocked
    ? 'This KPI is locked. Only the academic board can change its grade.'
    : "Only this startup's mentor or the academic board can review it."
}

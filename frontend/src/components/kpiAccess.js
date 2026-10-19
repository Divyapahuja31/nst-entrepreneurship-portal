import { canEvaluateKpi } from '@nst/shared/permissions.js'

// The KPI permission context, as the @nst/shared rules take it, for a KPI
// shown to staff. It only decides which controls to show: the API rebuilds
// it from the database and enforces the same rules.

const idOf = value => {
  const id = value?.id ?? value?._id ?? value
  return id ? String(id) : null
}

// A startup's mentors as ids. Each arrives as an id or as { id }.
export const mentorIdsOf = mentors => (mentors ?? []).map(idOf).filter(Boolean)

// ventureMentors are the startup's mentors, when the KPI's venture isn't
// populated with them.
export const staffKpiContext = (kpi, ventureMentors = []) => ({
  ventureMentorIds: mentorIdsOf(kpi.venture?.mentors ?? ventureMentors),
  isMember: false,
  kpiFounderId: idOf(kpi.founder),
  status: kpi.status,
  isLocked: Boolean(kpi.isLocked),
  isPastDue: Boolean(kpi.dueDate) && new Date(kpi.dueDate) < new Date(),
})

// Why this staff member can't review the KPI, or null when they can.
export const reviewBlockedReason = (actor, ctx) => {
  if (canEvaluateKpi(actor, ctx)) {
    return null
  }
  return ctx.isLocked
    ? 'This KPI is locked. Only the academic board can change its grade.'
    : "Only this startup's mentors or the academic board can review it."
}

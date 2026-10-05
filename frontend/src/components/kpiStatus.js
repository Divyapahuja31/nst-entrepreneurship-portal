// How each KPI status reads and which tint it gets, everywhere in the app.
export const KPI_STATUS = {
  DRAFT: { label: 'Draft', tint: 'gray', plain: true },
  WAITING_FOR_APPROVAL: { label: 'Awaiting Approval', tint: 'orange' },
  ACCEPTED: { label: 'Accepted', tint: 'blue' },
  GRADED: { label: 'Graded', tint: 'green' },
  REJECTED: { label: 'Rejected', tint: 'red' },
}

export const kpiStatus = status => KPI_STATUS[status] || KPI_STATUS.DRAFT

export const formatDate = value => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Why a KPI can't be changed any more, or null if it still can.
export function lockReason(kpi) {
  if (kpi.status === 'GRADED') return 'Graded KPIs are locked.'
  if (kpi.dueDate && new Date(kpi.dueDate) < new Date()) {
    return 'The deadline has passed, so this KPI is closed.'
  }
  return null
}

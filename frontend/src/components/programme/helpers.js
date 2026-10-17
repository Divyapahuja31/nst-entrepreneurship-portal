// Shared by the Programme and Extra Sessions pages: the slot sums the
// server also makes, and how sessions read.

export const TIME_ZONES = Intl.supportedValuesOf?.('timeZone') ?? []

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

export const minutesOf = time => {
  const [h, m] = (time || '0:0').split(':').map(Number)
  return h * 60 + m
}

// The same sum as the server: how many slots one person can run.
export const slotsPerStaff = form => {
  const window =
    minutesOf(form.endTime) - minutesOf(form.startTime) - form.firstGapMinutes
  if (window < form.slotMinutes || form.slotMinutes <= 0) {
    return 0
  }
  return Math.floor(
    (window + form.gapMinutes) / (form.slotMinutes + form.gapMinutes)
  )
}

// The server's checks, run as the admin types: field -> what's wrong. Slot
// fields count only in slot mode, where they show.
export const LIMITS = [
  ['slotMinutes', 5, 120, 'A slot lasts 5 to 120 minutes', true],
  ['gapMinutes', 0, 60, 'The gap between slots is 0 to 60 minutes', true],
  [
    'firstGapMinutes',
    0,
    120,
    'The gap before the first slot is 0 to 120 minutes',
    true,
  ],
  ['leadDays', 1, 13, 'Schedule each session 1 to 13 days ahead', false],
]

export const invitedCount = (invites, form) =>
  invites.filter(
    s =>
      !form.excludedVentures.has(String(s.venture._id)) &&
      s.founders.some(f => !form.excludedFounders.has(String(f._id)))
  ).length

export const toggle = (set, id, on) => {
  const next = new Set(set)
  if (on) {
    next.delete(id)
  } else {
    next.add(id)
  }
  return next
}

export const sessionStatus = session => {
  const now = new Date()
  const started = new Date(session.startsAt) <= now
  const over = new Date(session.endsAt) <= now
  if (session.status === 'CANCELLED') {
    return { label: 'Cancelled', tint: 'gray', plain: true }
  }
  if (session.problem && !over) {
    return { label: 'Needs attention', tint: 'orange' }
  }
  if (session.status === 'SCHEDULED') {
    if (over) {
      return { label: 'Held', tint: 'green' }
    }
    return started
      ? { label: 'In progress', tint: 'green' }
      : { label: 'Scheduled', tint: 'blue' }
  }
  return over
    ? { label: 'Not scheduled', tint: 'gray', plain: true }
    : { label: 'Planned', tint: 'gray', plain: true }
}

export const formatIn = (date, timeZone, options) =>
  new Intl.DateTimeFormat(undefined, { timeZone, ...options }).format(
    new Date(date)
  )

export const dayOf = (date, timeZone) =>
  formatIn(date, timeZone, { weekday: 'short', day: 'numeric', month: 'short' })

export const clockOf = (date, timeZone) =>
  formatIn(date, timeZone, { hour: 'numeric', minute: '2-digit' })

export const spanOf = (meeting, timeZone) => {
  const end = new Date(
    new Date(meeting.scheduledAt).getTime() + meeting.durationMinutes * 60000
  )
  return `${clockOf(meeting.scheduledAt, timeZone)} – ${clockOf(end, timeZone)}`
}

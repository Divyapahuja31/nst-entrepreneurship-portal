// Business calendar shared by API, background work and browser controls.
export const BUSINESS_TIME_ZONE = 'Asia/Kolkata'
const DAY = 86400000

export const calendarDate = (value, zone = BUSINESS_TIME_ZONE) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))

const offsetAt = (time, zone) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(time))
      .map(part => [part.type, Number(part.value)])
  )
  return (
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    ) -
    Math.floor(time / 1000) * 1000
  )
}

// Exclusive next local midnight. Resolve the offset at the target midnight,
// rather than adding 24 hours to the preceding local midnight across DST.
export const dateCutoff = (day, zone = BUSINESS_TIME_ZONE) => {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return new Date(NaN)
  }
  const start = Date.parse(day + 'T00:00:00Z')
  if (
    !Number.isFinite(start) ||
    !new Date(start).toISOString().startsWith(day)
  ) {
    return new Date(NaN)
  }
  const next = start + DAY
  const first = next - offsetAt(next, zone)
  return new Date(next - offsetAt(first, zone))
}

export const parseDeadline = value => {
  if (!value) {
    return null
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(dateCutoff(value).getTime() - 1)
  }
  if (value instanceof Date) {
    return new Date(value)
  }
  return typeof value === 'string' && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    ? new Date(value)
    : new Date(NaN)
}

// The date picker stores the final inclusive millisecond. Explicit instants
// remain exclusive. Legacy normalized EOD dates retain their calendar meaning.
export const deadlineCutoff = (value, kind) => {
  if (!value) {
    return null
  }
  const instant = parseDeadline(value)
  if (!Number.isFinite(instant.getTime())) {
    return instant
  }
  if (kind === 'timestamp') {
    return instant
  }
  const next = dateCutoff(calendarDate(instant))
  return instant.getTime() === next.getTime() - 1 ? next : instant
}

export const deadlinePassed = (value, now = Date.now(), kind) =>
  Boolean(value) && Number(now) >= deadlineCutoff(value, kind).getTime()

export const deadlineLabel = value =>
  new Intl.DateTimeFormat('en-IN', {
    timeZone: BUSINESS_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'long',
  }).format(parseDeadline(value))

// MongoDB equivalent, using server time for authoritative write predicates.
export const mongoDeadlineCutoff = (field = '$dueDate') => ({
  $let: {
    vars: {
      next: {
        $dateAdd: {
          startDate: {
            $dateTrunc: {
              date: field,
              unit: 'day',
              timezone: BUSINESS_TIME_ZONE,
            },
          },
          unit: 'day',
          amount: 1,
          timezone: BUSINESS_TIME_ZONE,
        },
      },
    },
    in: {
      $cond: [
        {
          $and: [
            { $ne: ['$dueDateKind', 'timestamp'] },
            { $eq: [field, { $subtract: ['$$next', 1] }] },
          ],
        },
        '$$next',
        field,
      ],
    },
  },
})
export const openDeadlineFilter = () => ({
  $or: [
    { dueDate: null },
    { $expr: { $gt: [mongoDeadlineCutoff(), '$$NOW'] } },
  ],
})

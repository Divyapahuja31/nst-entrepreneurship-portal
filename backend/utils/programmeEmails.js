import crypto from 'node:crypto'

import CheckIn from '../models/checkIn.js'
import {
  sendFounderSession,
  sendSessionCancelled,
  sendStaffSession,
} from './emailService.js'

// The emails a programme session sends. Each email's dedupe key is built
// from what it says (time, length, staff, Meet link, when the person was
// invited), so after any change only the people whose meeting changed get
// a new one. Calendar invites from Google go out as well.

const MINUTE_MS = 60 * 1000

const formatDay = (date, timeZone) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date)

const formatClock = (date, timeZone) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)

// "6:30 PM – 6:45 PM"
export const formatSpan = (startsAt, endsAt, timeZone) =>
  `${formatClock(startsAt, timeZone)} – ${formatClock(endsAt, timeZone)}`

const endOf = row =>
  new Date(row.scheduledAt.getTime() + row.durationMinutes * MINUTE_MS)

const idsOf = list =>
  list
    .map(item => String(item?._id ?? item))
    .sort()
    .join(',')

const digest = value =>
  crypto.createHash('sha1').update(value).digest('hex').slice(0, 16)

// One failed email doesn't stop the rest; the log records it as failed.
const quietly = async send => {
  try {
    await send()
  } catch (error) {
    console.error('Programme email not sent:', error.message)
  }
}

const loadRows = session =>
  CheckIn.find({ session: session._id, status: 'SCHEDULED' })
    .sort({ scheduledAt: 1 })
    .populate('venture', 'name')
    .populate('staff', 'username email')
    .populate('attendees.user', 'username')

const founderEmails = (rows, timeZone) =>
  rows.flatMap(row =>
    row.attendees.map(
      attendee => () =>
        sendFounderSession({
          recipient: { email: attendee.email, userId: attendee.user?._id },
          dedupeKey: [
            row._id,
            row.scheduledAt.toISOString(),
            row.durationMinutes,
            idsOf(row.staff),
            row.meetUrl,
            attendee.invitedAt?.getTime(),
          ].join(':'),
          recipientName: attendee.user?.username ?? attendee.email,
          group: row.group,
          ventureName: row.venture?.name ?? 'Your startup',
          day: formatDay(row.scheduledAt, timeZone),
          time: formatSpan(row.scheduledAt, endOf(row), timeZone),
          staffNames: row.staff.map(s => s.username).join(', '),
          meetUrl: row.meetUrl,
        })
    )
  )

const staffEmails = (session, rows, timeZone) => {
  const byStaff = new Map()
  for (const row of rows) {
    for (const member of row.staff) {
      const id = String(member._id)
      if (!byStaff.has(id)) {
        byStaff.set(id, { member, rows: [] })
      }
      byStaff.get(id).rows.push(row)
    }
  }
  return [...byStaff.values()].map(({ member, rows: own }) => () => {
    const group = own[0].group
    const time = formatSpan(own[0].scheduledAt, endOf(own[0]), timeZone)
    return sendStaffSession({
      recipient: { email: member.email, userId: member._id },
      dedupeKey: `${session._id}:${digest(
        own
          .map(
            r => `${r._id}@${r.scheduledAt.toISOString()}+${r.durationMinutes}`
          )
          .join(';')
      )}`,
      recipientName: member.username,
      group,
      day: formatDay(own[0].scheduledAt, timeZone),
      time,
      meetUrl: group ? own[0].meetUrl : null,
      meetings: own.map(r => ({
        time: formatSpan(r.scheduledAt, endOf(r), timeZone),
        ventureName: r.venture?.name ?? 'Startup',
      })),
    })
  })
}

// Tells every founder and staff member of the session about their meeting,
// unless they already got this exact email.
export const sendSessionEmails = async (session, programme) => {
  const rows = await loadRows(session)
  const sends = [
    ...founderEmails(rows, programme.timeZone),
    ...staffEmails(session, rows, programme.timeZone),
  ]
  for (const send of sends) {
    await quietly(send)
  }
}

// people: [{ email, userId, name, ventureName?, startsAt, endsAt, key }]
export const sendCancellations = async (people, programme) => {
  for (const person of people) {
    await quietly(() =>
      sendSessionCancelled({
        recipient: { email: person.email, userId: person.userId },
        dedupeKey: person.key,
        recipientName: person.name ?? person.email,
        ventureName: person.ventureName ?? null,
        day: formatDay(person.startsAt, programme.timeZone),
        time: formatSpan(person.startsAt, person.endsAt, programme.timeZone),
      })
    )
  }
}

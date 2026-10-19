import { DEFAULT_EMAIL_SETTINGS } from '../emailSettings.js'
import {
  button,
  detailsTable,
  escapeHtml,
  fill,
  heading,
  layout,
  paragraph,
  plainText,
} from './layout.js'

// Programme session emails. Each template takes plain values (dates already
// formatted in the programme's time zone) and the email settings, and returns
// { subject, html, text }. An extra session passes its title as sessionName;
// a bi-weekly one doesn't. Admins change each one's closing note.

const startups = count => (count === 1 ? '1 startup' : `${count} startups`)

const noteOf = (key, props, settings) =>
  fill(settings.templates[key].note, { name: props.recipientName })

// To a founder: their startup's slot, or the group session.
export const founderSessionEmail = (
  props,
  settings = DEFAULT_EMAIL_SETTINGS
) => {
  const { brand } = settings
  const note = noteOf('session-founder', props, settings)
  const name = props.sessionName
  let what = props.group ? 'Bi-weekly group session' : 'Your bi-weekly check-in'
  if (name) {
    what = props.group ? name : `Your check-in: ${name}`
  }
  const subject = `${what}: ${props.day}, ${props.time}`
  const intro = props.group
    ? `${name ?? 'The programme’s bi-weekly group session'} is coming up. Every startup joins the same meeting.`
    : `${props.ventureName} has a check-in with ${props.staffNames} at ${name ?? 'the bi-weekly session'}.`
  const rows = [
    ['Startup', props.ventureName],
    ['Date', props.day],
    ['Time', props.time],
    [props.group ? 'Run by' : 'With', props.staffNames],
  ]
  const html = layout({
    title: subject,
    preheader: `${props.day}, ${props.time}. Join on Google Meet.`,
    brand,
    body: [
      heading(what),
      paragraph(`Hi ${escapeHtml(props.recipientName)},`),
      paragraph(escapeHtml(intro)),
      detailsTable(rows),
      button({ href: props.meetUrl, label: 'Join Google Meet' }),
      paragraph(escapeHtml(note)),
    ].join(''),
  })
  const text = plainText(
    [
      `Hi ${props.recipientName},`,
      '',
      intro,
      ...rows.map(([label, value]) => `${label}: ${value}`),
      '',
      `Join Google Meet: ${props.meetUrl}`,
      '',
      note,
    ],
    brand
  )
  return { subject, html, text }
}

// To a staff member: the startups they meet, or the group session.
export const staffSessionEmail = (props, settings = DEFAULT_EMAIL_SETTINGS) => {
  const { brand } = settings
  const note = noteOf('session-staff', props, settings)
  const name = props.sessionName
  const title = name ?? 'Your bi-weekly session'
  const subject = `${title}: ${props.day}`
  const intro = props.group
    ? `You’re running ${name ?? 'the bi-weekly group session'}, ${props.time}, with ${startups(props.meetings.length)}.`
    : `You meet ${startups(props.meetings.length)} at ${name ?? 'the bi-weekly session'}. Each slot has its own Meet link, in your calendar invites.`
  const rows = props.meetings.map(m => [m.time, m.ventureName])
  const html = layout({
    title: subject,
    preheader: intro,
    brand,
    body: [
      heading(title),
      paragraph(`Hi ${escapeHtml(props.recipientName)},`),
      paragraph(escapeHtml(intro)),
      detailsTable(rows),
      ...(props.meetUrl
        ? [button({ href: props.meetUrl, label: 'Join Google Meet' })]
        : []),
      paragraph(escapeHtml(note)),
    ].join(''),
  })
  const text = plainText(
    [
      `Hi ${props.recipientName},`,
      '',
      intro,
      ...rows.map(([time, name]) => `${time}  ${name}`),
      ...(props.meetUrl ? ['', `Join Google Meet: ${props.meetUrl}`] : []),
      '',
      note,
    ],
    brand
  )
  return { subject, html, text }
}

// To anyone whose meeting was cancelled, or who was taken off the invite
// list.
export const sessionCancelledEmail = (
  props,
  settings = DEFAULT_EMAIL_SETTINGS
) => {
  const { brand } = settings
  const note = noteOf('session-cancelled', props, settings)
  const name = props.sessionName
  const subject = `Cancelled: ${name ?? 'bi-weekly session'}, ${props.day}, ${props.time}`
  const body = props.ventureName
    ? `The check-in for ${props.ventureName} on ${props.day}, ${props.time} is cancelled, or you’re no longer invited to it.`
    : `${name ?? 'The bi-weekly session'} on ${props.day}, ${props.time} is cancelled.`
  const html = layout({
    title: subject,
    preheader: body,
    brand,
    body: [
      heading('Session cancelled'),
      paragraph(`Hi ${escapeHtml(props.recipientName)},`),
      paragraph(escapeHtml(body)),
      paragraph(escapeHtml(note)),
    ].join(''),
  })
  const text = plainText([`Hi ${props.recipientName},`, '', body, note], brand)
  return { subject, html, text }
}

import {
  button,
  detailsTable,
  escapeHtml,
  heading,
  layout,
  paragraph,
  plainText,
} from './layout.js'

// Programme session emails. Each template takes plain values (dates already
// formatted in the programme's time zone) and returns { subject, html, text }.

const REPLACES =
  'If you got an earlier email about this session, this one replaces it. The invite is on your Google Calendar too.'

// To a founder: their startup's slot, or the group session.
export const founderSessionEmail = props => {
  const what = props.group
    ? 'Bi-weekly group session'
    : 'Your bi-weekly check-in'
  const subject = `${what}: ${props.day}, ${props.time}`
  const intro = props.group
    ? 'The programme’s bi-weekly group session is coming up. Every startup joins the same meeting.'
    : `${props.ventureName} has a check-in with ${props.staffNames} at the bi-weekly session.`
  const rows = [
    ['Startup', props.ventureName],
    ['Date', props.day],
    ['Time', props.time],
    [props.group ? 'Run by' : 'With', props.staffNames],
  ]
  const html = layout({
    title: subject,
    preheader: `${props.day}, ${props.time}. Join on Google Meet.`,
    body: [
      heading(what),
      paragraph(`Hi ${escapeHtml(props.recipientName)},`),
      paragraph(escapeHtml(intro)),
      detailsTable(rows),
      button({ href: props.meetUrl, label: 'Join Google Meet' }),
      paragraph(escapeHtml(REPLACES)),
    ].join(''),
  })
  const text = plainText([
    `Hi ${props.recipientName},`,
    '',
    intro,
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `Join Google Meet: ${props.meetUrl}`,
    '',
    REPLACES,
  ])
  return { subject, html, text }
}

// To a staff member: the startups they meet, or the group session.
export const staffSessionEmail = props => {
  const subject = `Your bi-weekly session: ${props.day}`
  const intro = props.group
    ? `You’re running the bi-weekly group session, ${props.time}, with ${props.meetings.length} startups.`
    : `You meet ${props.meetings.length} startups at the bi-weekly session. Each slot has its own Meet link, in your calendar invites.`
  const rows = props.meetings.map(m => [m.time, m.ventureName])
  const html = layout({
    title: subject,
    preheader: intro,
    body: [
      heading('Your bi-weekly session'),
      paragraph(`Hi ${escapeHtml(props.recipientName)},`),
      paragraph(escapeHtml(intro)),
      detailsTable(rows),
      ...(props.meetUrl
        ? [button({ href: props.meetUrl, label: 'Join Google Meet' })]
        : []),
      paragraph(escapeHtml(REPLACES)),
    ].join(''),
  })
  const text = plainText([
    `Hi ${props.recipientName},`,
    '',
    intro,
    ...rows.map(([time, name]) => `${time}  ${name}`),
    ...(props.meetUrl ? ['', `Join Google Meet: ${props.meetUrl}`] : []),
    '',
    REPLACES,
  ])
  return { subject, html, text }
}

// To anyone whose meeting was cancelled, or who was taken off the invite
// list.
export const sessionCancelledEmail = props => {
  const subject = `Cancelled: bi-weekly session, ${props.day}, ${props.time}`
  const body = props.ventureName
    ? `The check-in for ${props.ventureName} on ${props.day}, ${props.time} is cancelled, or you’re no longer invited to it.`
    : `The bi-weekly session on ${props.day}, ${props.time} is cancelled.`
  const html = layout({
    title: subject,
    preheader: body,
    body: [
      heading('Session cancelled'),
      paragraph(`Hi ${escapeHtml(props.recipientName)},`),
      paragraph(escapeHtml(body)),
      paragraph(
        'It has been taken off your Google Calendar. You’ll get a new email if you’re invited again.'
      ),
    ].join(''),
  })
  const text = plainText([
    `Hi ${props.recipientName},`,
    '',
    body,
    'It has been taken off your Google Calendar. You’ll get a new email if you’re invited again.',
  ])
  return { subject, html, text }
}

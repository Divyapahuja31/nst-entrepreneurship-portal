import {
  actionCard,
  button,
  detailsTable,
  escapeHtml,
  heading,
  layout,
  paragraph,
  plainText,
  scoreCard,
  scoreStatus,
} from './layout.js'

// Each template takes plain values and returns { subject, html, text }.
// studentName is who the grade is about: a founder for their own KPI, the
// startup for a startup-wide one.

const scoreLine = ({ score, totalMarks, percentage }) =>
  `Score: ${score} / ${totalMarks} (${Math.round(percentage)}%)`

const resultRows = props => [
  ['Evaluation', props.evaluationName],
  ...(props.ventureName ? [['Startup', props.ventureName]] : []),
  ['Score', `${props.score} / ${props.totalMarks}`],
  ['Percentage', `${Math.round(props.percentage)}%`],
  ['Status', scoreStatus(props.percentage).label],
]

const STUDENT_ADVICE = {
  success: {
    title: 'Great work',
    body: 'Keep the momentum going on your next KPIs.',
  },
  warning: {
    title: 'Room to improve',
    body: 'Read the feedback on this KPI and talk to your mentor about what to focus on next.',
  },
  danger: {
    title: 'This score needs attention',
    body: 'Please read the feedback on this KPI and set up time with your mentor soon to plan your next steps.',
  },
}

export const studentResultEmail = props => {
  const subject = 'Your Entrepreneurship Evaluation Result is Ready'
  const { tone } = scoreStatus(props.percentage)
  const advice = STUDENT_ADVICE[tone]
  const html = layout({
    title: subject,
    preheader: `Your result for ${props.evaluationName} is ready.`,
    body: [
      heading('Your evaluation result is ready'),
      paragraph(`Hi ${escapeHtml(props.studentName)},`),
      paragraph(
        `Your KPI <strong>${escapeHtml(props.evaluationName)}</strong> has been graded and the grade is now final.`
      ),
      scoreCard(props),
      actionCard({
        tone: tone === 'success' ? 'info' : tone,
        title: advice.title,
        body: escapeHtml(advice.body),
      }),
      button({ href: props.dashboardUrl, label: 'View your KPIs' }),
    ].join(''),
  })
  const text = plainText([
    `Hi ${props.studentName},`,
    '',
    `Your KPI "${props.evaluationName}" has been graded and the grade is now final.`,
    scoreLine(props),
    '',
    `${advice.title}. ${advice.body}`,
    '',
    `View your KPIs: ${props.dashboardUrl}`,
  ])
  return { subject, html, text }
}

// The mentor emails differ only in their wording and tone.
const mentorEmail = ({ subject, intro, tone, title, body, props }) => {
  const html = layout({
    title: subject,
    preheader: intro,
    body: [
      heading(subject),
      paragraph(escapeHtml(intro)),
      scoreCard(props),
      detailsTable(resultRows(props)),
      actionCard({ tone, title, body: escapeHtml(body) }),
      button({ href: props.dashboardUrl, label: 'Open the startup' }),
    ].join(''),
  })
  const text = plainText([
    intro,
    '',
    `Evaluation: ${props.evaluationName}`,
    scoreLine(props),
    '',
    `${title}: ${body}`,
    '',
    `Open the startup: ${props.dashboardUrl}`,
  ])
  return { subject, html, text }
}

// Two locked grades in a row below 70%.
export const mentorFollowUpEmail = props =>
  mentorEmail({
    subject: `Action Required: Connect with ${props.studentName} Regarding Evaluation`,
    intro: `${props.studentName} has scored below 70% on two locked evaluations in a row, most recently on ${props.evaluationName}.`,
    tone: 'warning',
    title: 'Please follow up',
    body: 'Set up a check-in to go through the feedback and agree on what to improve before the next evaluation.',
    props,
  })

// Two locked grades in a row with the latest at or below 40%.
export const mentorLowScoreEmail = props =>
  mentorEmail({
    subject: `Attention Required: ${props.studentName}'s Evaluation Score is Below 40%`,
    intro: `${props.studentName} has scored poorly on two locked evaluations in a row, most recently ${Math.round(props.percentage)}% on ${props.evaluationName}.`,
    tone: 'danger',
    title: 'Please reach out soon',
    body: 'Meet them this week to understand what is blocking them and agree on a recovery plan.',
    props,
  })

// Two locked grades in a row at or below 40%.
export const boardLowScoreEmail = props => {
  const subject = `Academic Board Notification: ${props.studentName}'s Evaluation Score is Below 40%`
  const intro = `${props.studentName} has scored 40% or below on two locked evaluations in a row, most recently on ${props.evaluationName}.`
  const rows = [
    ['Student', props.studentName],
    ['Email', props.studentEmail],
    ['Batch', props.batch],
    ['Mentor', props.mentorName],
    ...resultRows(props),
  ]
  const html = layout({
    title: subject,
    preheader: intro,
    body: [
      heading('Consecutive low scores'),
      paragraph(escapeHtml(intro)),
      scoreCard(props),
      detailsTable(rows),
      actionCard({
        tone: 'danger',
        title: 'Board review suggested',
        body: escapeHtml(
          props.mentorName === 'Unassigned'
            ? 'This startup has no mentor. Please assign one and review its progress.'
            : `Please review this startup's progress with ${props.mentorName}.`
        ),
      }),
      button({ href: props.dashboardUrl, label: 'Open the startup' }),
    ].join(''),
  })
  const text = plainText([
    intro,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `Open the startup: ${props.dashboardUrl}`,
  ])
  return { subject, html, text }
}

import { DEFAULT_EMAIL_SETTINGS } from '../emailSettings.js'
import {
  actionCard,
  button,
  detailsTable,
  escapeHtml,
  fill,
  heading,
  layout,
  paragraph,
  plainText,
  scoreCard,
  scoreStatus,
} from './layout.js'

// Each template takes plain values and the email settings (their wording,
// header, footer and alert rules) and returns { subject, html, text }.
// studentName is who the grade is about: a founder for their own KPI, the
// startup for a startup-wide one.

const WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
]
const inWords = number => WORDS[number] ?? String(number)

// What the placeholders in a KPI email's text stand for.
const valuesOf = (props, rules) => ({
  name: props.studentName,
  student: props.studentName,
  startup: props.ventureName,
  kpi: props.evaluationName,
  score: props.score,
  total: props.totalMarks,
  percent: Math.round(props.percentage),
  low: rules.lowPercent,
  pass: rules.passPercent,
  strikes: inWords(rules.strikes),
  mentor: props.mentorName,
  email: props.studentEmail,
  batch: props.batch,
})

// The template's text with its placeholders filled in.
const wordingOf = (key, props, settings) => {
  const values = valuesOf(props, settings.rules)
  const { enabled: _enabled, ...fields } = settings.templates[key]
  return Object.fromEntries(
    Object.entries(fields).map(([name, value]) => [name, fill(value, values)])
  )
}

const scoreLine = ({ score, totalMarks, percentage }) =>
  `Score: ${score} / ${totalMarks} (${Math.round(percentage)}%)`

const resultRows = (props, rules) => [
  ['Evaluation', props.evaluationName],
  ...(props.ventureName ? [['Startup', props.ventureName]] : []),
  ['Score', `${props.score} / ${props.totalMarks}`],
  ['Percentage', `${Math.round(props.percentage)}%`],
  ['Status', scoreStatus(props.percentage, rules).label],
]

const ADVICE = {
  success: ['onTrackTitle', 'onTrackBody'],
  warning: ['improveTitle', 'improveBody'],
  danger: ['lowTitle', 'lowBody'],
}

export const studentResultEmail = (
  props,
  settings = DEFAULT_EMAIL_SETTINGS
) => {
  const { brand, rules } = settings
  const words = wordingOf('student-result', props, settings)
  const { tone } = scoreStatus(props.percentage, rules)
  const [titleField, bodyField] = ADVICE[tone]
  const advice = { title: words[titleField], body: words[bodyField] }
  const html = layout({
    title: words.subject,
    preheader: `Your result for ${props.evaluationName} is ready.`,
    brand,
    body: [
      heading(words.heading),
      paragraph(`Hi ${escapeHtml(props.studentName)},`),
      paragraph(escapeHtml(words.intro)),
      scoreCard(props, rules),
      actionCard({
        tone: tone === 'success' ? 'info' : tone,
        title: advice.title,
        body: escapeHtml(advice.body),
      }),
      button({ href: props.dashboardUrl, label: words.button }),
    ].join(''),
  })
  const text = plainText(
    [
      `Hi ${props.studentName},`,
      '',
      words.intro,
      scoreLine(props),
      '',
      `${advice.title}. ${advice.body}`,
      '',
      `${words.button}: ${props.dashboardUrl}`,
    ],
    brand
  )
  return { subject: words.subject, html, text }
}

// The mentor emails differ only in their wording and tone.
const mentorEmail = (key, tone, props, settings) => {
  const { brand, rules } = settings
  const words = wordingOf(key, props, settings)
  const html = layout({
    title: words.subject,
    preheader: words.intro,
    brand,
    body: [
      heading(words.subject),
      paragraph(escapeHtml(words.intro)),
      scoreCard(props, rules),
      detailsTable(resultRows(props, rules)),
      actionCard({
        tone,
        title: words.actionTitle,
        body: escapeHtml(words.actionBody),
      }),
      button({ href: props.dashboardUrl, label: words.button }),
    ].join(''),
  })
  const text = plainText(
    [
      words.intro,
      '',
      `Evaluation: ${props.evaluationName}`,
      scoreLine(props),
      '',
      `${words.actionTitle}: ${words.actionBody}`,
      '',
      `${words.button}: ${props.dashboardUrl}`,
    ],
    brand
  )
  return { subject: words.subject, html, text }
}

// A run of locked grades below the on-track line.
export const mentorFollowUpEmail = (props, settings = DEFAULT_EMAIL_SETTINGS) =>
  mentorEmail('mentor-follow-up', 'warning', props, settings)

// A run of locked grades with the latest a low score.
export const mentorLowScoreEmail = (props, settings = DEFAULT_EMAIL_SETTINGS) =>
  mentorEmail('mentor-low-score', 'danger', props, settings)

// A run of low scores.
export const boardLowScoreEmail = (
  props,
  settings = DEFAULT_EMAIL_SETTINGS
) => {
  const { brand, rules } = settings
  const words = wordingOf('board-low-score', props, settings)
  const rows = [
    ['Student', props.studentName],
    ['Email', props.studentEmail],
    ['Batch', props.batch],
    ['Mentor', props.mentorName],
    ...resultRows(props, rules),
  ]
  const html = layout({
    title: words.subject,
    preheader: words.intro,
    brand,
    body: [
      heading(words.heading),
      paragraph(escapeHtml(words.intro)),
      scoreCard(props, rules),
      detailsTable(rows),
      actionCard({
        tone: 'danger',
        title: words.actionTitle,
        body: escapeHtml(
          props.mentorName === 'Unassigned'
            ? words.noMentorBody
            : words.actionBody
        ),
      }),
      button({ href: props.dashboardUrl, label: words.button }),
    ].join(''),
  })
  const text = plainText(
    [
      words.intro,
      '',
      ...rows.map(([label, value]) => `${label}: ${value}`),
      '',
      `${words.button}: ${props.dashboardUrl}`,
    ],
    brand
  )
  return { subject: words.subject, html, text }
}

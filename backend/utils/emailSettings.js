import EmailSettings from '../models/emailSettings.js'
import { DEFAULT_RULES } from './kpiEscalation.js'

export { DEFAULT_RULES }

// What admins may change about the emails (the Emails page): the sender
// name and reply-to address, the header and footer every email shares, when
// KPI alerts go out, and each email's wording and whether it is sent at all.
// Only what differs from the defaults below is stored; an empty field means
// the default.

// The placeholders a template's text may use, filled in when it is sent.
const KPI_PLACEHOLDERS = {
  student:
    'Who the KPI is about: the founder for a personal KPI, otherwise the startup',
  startup: 'The startup',
  kpi: 'The KPI title',
  score: 'The score',
  total: 'The total marks',
  percent: 'The percentage, rounded',
  low: 'The low score line, in percent',
  pass: 'The on-track line, in percent',
  strikes: 'How many grades in a row set off an alert, in words',
  run: 'That run: "two locked evaluations in a row", or "one locked evaluation"',
}
const { student: _about, ...RESULT_PLACEHOLDERS } = KPI_PLACEHOLDERS
const NAME = { name: 'The recipient’s name' }

// Each email: who it goes to, whether it can be switched off, its editable
// text and the placeholders that text may use. Sign-in codes can't be
// switched off: no one could sign up or reset a password.
export const EMAIL_CATALOG = [
  {
    key: 'student-result',
    label: 'KPI result, to students',
    description:
      'Sent to the student (or every founder of the startup) when a KPI grade is locked.',
    canDisable: true,
    usesScore: true,
    placeholders: { name: 'The student’s name', ...RESULT_PLACEHOLDERS },
    fields: {
      subject: {
        label: 'Subject',
        default: 'Your Entrepreneurship Evaluation Result is Ready',
      },
      heading: { label: 'Heading', default: 'Your evaluation result is ready' },
      intro: {
        label: 'Opening line',
        default: 'Your KPI "{kpi}" has been graded and the grade is now final.',
        multiline: true,
      },
      onTrackTitle: { label: 'On track: title', default: 'Great work' },
      onTrackBody: {
        label: 'On track: advice',
        default: 'Keep the momentum going on your next KPIs.',
        multiline: true,
      },
      improveTitle: {
        label: 'Needs improvement: title',
        default: 'Room to improve',
      },
      improveBody: {
        label: 'Needs improvement: advice',
        default:
          'Read the feedback on this KPI and talk to your mentor about what to focus on next.',
        multiline: true,
      },
      lowTitle: {
        label: 'Low score: title',
        default: 'This score needs attention',
      },
      lowBody: {
        label: 'Low score: advice',
        default:
          'Please read the feedback on this KPI and set up time with your mentor soon to plan your next steps.',
        multiline: true,
      },
      button: { label: 'Button', default: 'View your KPIs' },
    },
  },
  {
    key: 'mentor-follow-up',
    label: 'Follow-up alert, to mentors',
    description:
      'Sent to every mentor of the startup after a run of grades below the on-track line. Without a mentor it goes to the academic board.',
    canDisable: true,
    usesScore: true,
    placeholders: KPI_PLACEHOLDERS,
    fields: {
      subject: {
        label: 'Subject',
        default: 'Action Required: Connect with {student} Regarding Evaluation',
      },
      intro: {
        label: 'Opening line',
        default:
          '{student} has scored below {pass}% on {run}, most recently on {kpi}.',
        multiline: true,
      },
      actionTitle: { label: 'Action: title', default: 'Please follow up' },
      actionBody: {
        label: 'Action: text',
        default:
          'Set up a check-in to go through the feedback and agree on what to improve before the next evaluation.',
        multiline: true,
      },
      button: { label: 'Button', default: 'Open the startup' },
    },
  },
  {
    key: 'mentor-low-score',
    label: 'Low score alert, to mentors',
    description:
      'Sent to every mentor of the startup after a run of low scores. Without a mentor the board’s alert covers it.',
    canDisable: true,
    usesScore: true,
    placeholders: KPI_PLACEHOLDERS,
    fields: {
      subject: {
        label: 'Subject',
        default:
          "Attention Required: {student}'s Evaluation Score is Below {low}%",
      },
      intro: {
        label: 'Opening line',
        default:
          '{student} has scored poorly on {run}, most recently {percent}% on {kpi}.',
        multiline: true,
      },
      actionTitle: { label: 'Action: title', default: 'Please reach out soon' },
      actionBody: {
        label: 'Action: text',
        default:
          'Meet them this week to understand what is blocking them and agree on a recovery plan.',
        multiline: true,
      },
      button: { label: 'Button', default: 'Open the startup' },
    },
  },
  {
    key: 'board-low-score',
    label: 'Low score alert, to the academic board',
    description:
      'Sent to every academic board member after a run of low scores.',
    canDisable: true,
    usesScore: true,
    placeholders: {
      ...KPI_PLACEHOLDERS,
      mentor: 'The startup’s mentors, or Unassigned',
      email: 'The students’ email addresses',
      batch: 'The students’ batches',
    },
    fields: {
      subject: {
        label: 'Subject',
        default:
          "Academic Board Notification: {student}'s Evaluation Score is Below {low}%",
      },
      heading: { label: 'Heading', default: 'Consecutive low scores' },
      intro: {
        label: 'Opening line',
        default:
          '{student} has scored {low}% or below on {run}, most recently on {kpi}.',
        multiline: true,
      },
      actionTitle: {
        label: 'Action: title',
        default: 'Board review suggested',
      },
      actionBody: {
        label: 'Action: text',
        default: "Please review this startup's progress with {mentor}.",
        multiline: true,
      },
      noMentorBody: {
        label: 'Action: text when the startup has no mentor',
        default:
          'This startup has no mentor. Please assign one and review its progress.',
        multiline: true,
      },
      button: { label: 'Button', default: 'Open the startup' },
    },
  },
  {
    key: 'session-founder',
    label: 'Session slot, to founders',
    description:
      'Sent to each founder with their programme or extra session slot. The time, date and Meet link are filled in for them.',
    canDisable: true,
    placeholders: NAME,
    fields: {
      note: {
        label: 'Closing note',
        default:
          'If you got an earlier email about this session, this one replaces it. The invite is on your Google Calendar too.',
        multiline: true,
      },
    },
  },
  {
    key: 'session-staff',
    label: 'Session schedule, to staff',
    description:
      'Sent to each staff member running a session, with the startups they meet.',
    canDisable: true,
    placeholders: NAME,
    fields: {
      note: {
        label: 'Closing note',
        default:
          'If you got an earlier email about this session, this one replaces it. The invite is on your Google Calendar too.',
        multiline: true,
      },
    },
  },
  {
    key: 'session-cancelled',
    label: 'Session cancelled',
    description:
      'Sent to anyone whose session slot was cancelled or who was taken off the invite list.',
    canDisable: true,
    placeholders: NAME,
    fields: {
      note: {
        label: 'Closing note',
        default:
          'It has been taken off your Google Calendar. You’ll get a new email if you’re invited again.',
        multiline: true,
      },
    },
  },
  {
    key: 'signup-verification',
    label: 'Sign-up code',
    description:
      'The code a new account enters to verify its email. Always sent.',
    canDisable: false,
    placeholders: NAME,
    fields: {
      subject: {
        label: 'Subject',
        default: 'Verify your NST Entrepreneurship Tracker email',
      },
      heading: { label: 'Heading', default: 'Verify your email address' },
      intro: {
        label: 'Opening line',
        default:
          'Welcome to the NST Entrepreneurship Tracker! Enter this code to verify your email and finish signing up:',
        multiline: true,
      },
    },
  },
  {
    key: 'password-reset',
    label: 'Password reset code',
    description:
      'The code someone enters to choose a new password. Always sent.',
    canDisable: false,
    placeholders: NAME,
    fields: {
      subject: {
        label: 'Subject',
        default: 'Reset your NST Entrepreneurship Tracker password',
      },
      heading: { label: 'Heading', default: 'Reset your password' },
      intro: {
        label: 'Opening line',
        default:
          'Someone asked to reset the password for your NST Entrepreneurship Tracker account. Enter this code on the reset page to choose a new one:',
        multiline: true,
      },
    },
  },
]

const CATALOG_BY_KEY = new Map(EMAIL_CATALOG.map(entry => [entry.key, entry]))

export const DEFAULT_BRAND = Object.freeze({
  title: 'NEWTON SCHOOL OF TECHNOLOGY',
  subtitle: 'Entrepreneurship Program',
  footer:
    'This is an automated notification from the NST Entrepreneurship Program. Please do not reply to this email. If you have questions, contact your mentor.',
})

const BRAND_LIMITS = { title: 80, subtitle: 80, footer: 500 }
const MAX_SUBJECT = 200
const MAX_TEXT = 1000
const MAX_STRIKES = 10

// The settings every email is built from: the defaults, with what an admin
// saved on top. `saved` is the stored document, or null.
export const resolveEmailSettings = (saved = null) => ({
  sender: {
    fromName: saved?.sender?.fromName || null,
    replyTo: saved?.sender?.replyTo || null,
  },
  brand: Object.fromEntries(
    Object.entries(DEFAULT_BRAND).map(([name, value]) => [
      name,
      saved?.brand?.[name] || value,
    ])
  ),
  rules: Object.fromEntries(
    Object.entries(DEFAULT_RULES).map(([name, value]) => [
      name,
      Number.isFinite(saved?.rules?.[name]) ? saved.rules[name] : value,
    ])
  ),
  templates: Object.fromEntries(
    EMAIL_CATALOG.map(({ key, canDisable, fields }) => {
      const own = saved?.templates?.[key] ?? {}
      return [
        key,
        {
          enabled: !canDisable || own.enabled !== false,
          ...Object.fromEntries(
            Object.entries(fields).map(([name, field]) => [
              name,
              own[name] || field.default,
            ])
          ),
        },
      ]
    })
  ),
})

export const DEFAULT_EMAIL_SETTINGS = resolveEmailSettings()

// The settings emails are sent with now. A database error falls back to
// the defaults: the email still goes.
export const loadEmailSettings = async () => {
  try {
    return resolveEmailSettings(
      await EmailSettings.findOne({ key: 'default' }).lean()
    )
  } catch (error) {
    console.error('Email settings could not be read:', error.message)
    return DEFAULT_EMAIL_SETTINGS
  }
}

// ------------------------------------------------------------- validation

const fail = (field, error) => ({ field, error })

const text = value => (typeof value === 'string' ? value.trim() : '')

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

const placeholdersIn = value =>
  [...value.matchAll(/\{([^{}]*)\}/g)].map(match => match[1])

const checkTemplateText = (entry, name, value) => {
  const field = entry.fields[name]
  const path = `templates.${entry.key}.${name}`
  const where = `${entry.label}, ${field.label.toLowerCase()}`
  const isSubject = name === 'subject'
  if (value.length > (isSubject ? MAX_SUBJECT : MAX_TEXT)) {
    return fail(
      path,
      `${where} is too long (at most ${isSubject ? MAX_SUBJECT : MAX_TEXT} characters)`
    )
  }
  if (isSubject && /[\r\n]/.test(value)) {
    return fail(path, `${where} must be on one line`)
  }
  const unknown = placeholdersIn(value).find(
    token => !Object.hasOwn(entry.placeholders, token)
  )
  if (unknown !== undefined) {
    const allowed = Object.keys(entry.placeholders)
      .map(token => `{${token}}`)
      .join(', ')
    return fail(
      path,
      `${where} uses {${unknown}}, which isn't a placeholder here. Use ${allowed}.`
    )
  }
  return null
}

const parseSender = (sender = {}) => {
  const fromName = text(sender.fromName)
  const replyTo = text(sender.replyTo).toLowerCase()
  if (fromName.length > 80) {
    return fail('sender.fromName', 'The sender name is too long')
  }
  if (/[<>"\\\r\n]/.test(fromName)) {
    return fail(
      'sender.fromName',
      'The sender name can’t contain quotes, backslashes, < or >'
    )
  }
  if (replyTo && !EMAIL.test(replyTo)) {
    return fail('sender.replyTo', 'The reply-to address isn’t an email address')
  }
  return { value: { fromName: fromName || null, replyTo: replyTo || null } }
}

const parseBrand = (brand = {}) => {
  const value = {}
  for (const [name, fallback] of Object.entries(DEFAULT_BRAND)) {
    const own = text(brand[name])
    if (own.length > BRAND_LIMITS[name]) {
      return fail(`brand.${name}`, 'This is too long')
    }
    value[name] = own && own !== fallback ? own : null
  }
  return { value }
}

const wholeNumber = value =>
  value === '' || value === null || value === undefined
    ? null
    : Number.isInteger(Number(value))
      ? Number(value)
      : NaN

const parseRules = (rules = {}) => {
  const value = Object.fromEntries(
    Object.keys(DEFAULT_RULES).map(name => [name, wholeNumber(rules[name])])
  )
  const resolved = { ...DEFAULT_RULES }
  for (const [name, number] of Object.entries(value)) {
    if (Number.isNaN(number)) {
      return fail(`rules.${name}`, 'Use a whole number')
    }
    if (number !== null) {
      resolved[name] = number
    }
  }
  if (resolved.lowPercent < 0 || resolved.passPercent > 100) {
    return fail('rules.passPercent', 'Percentages go from 0 to 100')
  }
  if (resolved.lowPercent >= resolved.passPercent) {
    return fail(
      'rules.lowPercent',
      'The low score line must be below the on-track line'
    )
  }
  if (resolved.strikes < 1 || resolved.strikes > MAX_STRIKES) {
    return fail(
      'rules.strikes',
      `Alert after 1 to ${MAX_STRIKES} grades in a row`
    )
  }
  return {
    value: Object.fromEntries(
      Object.entries(resolved).map(([name, number]) => [
        name,
        number === DEFAULT_RULES[name] ? null : number,
      ])
    ),
  }
}

// One email's settings in the stored form: { stored } or a problem.
const parseTemplate = (entry, own) => {
  const stored = {}
  if (entry.canDisable && own.enabled === false) {
    stored.enabled = false
  }
  for (const [name, field] of Object.entries(entry.fields)) {
    const fieldText = text(own[name])
    const problem = fieldText && checkTemplateText(entry, name, fieldText)
    if (problem) {
      return problem
    }
    if (fieldText && fieldText !== field.default) {
      stored[name] = fieldText
    }
  }
  return { stored }
}

const parseTemplates = (templates = {}) => {
  const value = {}
  for (const entry of EMAIL_CATALOG) {
    const parsed = parseTemplate(entry, templates?.[entry.key] ?? {})
    if (parsed.error) {
      return parsed
    }
    if (Object.keys(parsed.stored).length) {
      value[entry.key] = parsed.stored
    }
  }
  return { value }
}

// Checks what the Emails page sends. Returns { value } in the stored form
// (null or absent for every default) or { field, error }.
export const parseEmailSettings = (body = {}) => {
  // A section sent as null, or as anything but an object, is empty.
  const section = name =>
    body?.[name] && typeof body[name] === 'object' ? body[name] : {}
  const parts = {
    sender: parseSender(section('sender')),
    brand: parseBrand(section('brand')),
    rules: parseRules(section('rules')),
    templates: parseTemplates(section('templates')),
  }
  const problem = Object.values(parts).find(part => part.error)
  if (problem) {
    return problem
  }
  return {
    value: Object.fromEntries(
      Object.entries(parts).map(([name, part]) => [name, part.value])
    ),
  }
}

export const catalogEntry = key => CATALOG_BY_KEY.get(key) ?? null

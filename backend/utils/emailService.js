import EmailNotification from '../models/emailNotification.js'
import { getEmailProvider } from './emailProvider.js'
import { loadEmailSettings } from './emailSettings.js'
import {
  boardLowScoreEmail,
  mentorFollowUpEmail,
  mentorLowScoreEmail,
  studentResultEmail,
} from './emailTemplates/kpiEmails.js'
import {
  passwordResetEmail,
  signupVerificationEmail,
} from './emailTemplates/authEmails.js'
import {
  founderSessionEmail,
  sessionCancelledEmail,
  staffSessionEmail,
} from './emailTemplates/sessionEmails.js'

const DUPLICATE_KEY = 11000

// The log is a record, not a gate: if writing it fails the email still goes.
const logged = async (what, write) => {
  try {
    return await write()
  } catch (error) {
    console.error(`Email log: could not ${what}:`, error.message)
    return null
  }
}

const alreadySent = ({ recipientEmail, type, dedupeKey }) =>
  dedupeKey
    ? logged('check for an earlier send', () =>
        EmailNotification.exists({
          recipientEmail,
          type,
          dedupeKey,
          status: 'SENT',
        })
      )
    : null

const markSent = async (entry, messageId) => {
  const sent = {
    status: 'SENT',
    providerMessageId: messageId ?? null,
    sentAt: new Date(),
  }
  try {
    await EmailNotification.updateOne({ _id: entry._id }, { $set: sent })
  } catch (error) {
    if (error.code !== DUPLICATE_KEY) {
      throw error
    }
    // Another job sent the same email first. This one went out too, so it
    // is still recorded as sent, just outside the dedupe index.
    await EmailNotification.updateOne(
      { _id: entry._id },
      {
        $set: {
          ...sent,
          dedupeKey: null,
          error: `Duplicate of an email already sent for ${entry.dedupeKey}`,
        },
      }
    )
  }
}

// Logs the email as pending, sends it, then records the outcome. Returns
// { skipped: true } when this recipient already got it for dedupeKey and
// { messageId } once sent; throws when the provider can't send it.
// Subjects are logged, so they must never contain a secret such as a code.
// sender is { fromName, replyTo } from the email settings.
export const deliver = async ({
  type,
  to,
  recipientUserId = null,
  dedupeKey = null,
  sender = {},
  email: { subject, html, text },
}) => {
  const recipientEmail = String(to).trim().toLowerCase()
  if (await alreadySent({ recipientEmail, type, dedupeKey })) {
    return { skipped: true }
  }

  const provider = getEmailProvider()
  const entry = await logged('record a pending email', () =>
    EmailNotification.create({
      recipientEmail,
      recipientUser: recipientUserId,
      type,
      subject,
      provider: provider.name,
      dedupeKey,
    })
  )

  const { messageId, error } = await provider.sendEmail({
    to: recipientEmail,
    subject,
    html,
    text,
    fromName: sender.fromName ?? null,
    replyTo: sender.replyTo ?? null,
  })

  if (error) {
    if (entry) {
      await logged('record a failed email', () =>
        EmailNotification.updateOne(
          { _id: entry._id },
          { $set: { status: 'FAILED', error } }
        )
      )
    }
    throw new Error(`Failed to send the ${type} email: ${error}`)
  }

  if (entry) {
    await logged('record a sent email', () => markSent(entry, messageId))
  }
  return { messageId }
}

// ---------------------------------------------- KPI and programme emails
// recipient: { email, userId? }. For a KPI email dedupeKey identifies the
// KPI. key names the email in the settings: one an admin switched off is
// not sent and returns { skipped: true, disabled: true }.

const toRecipient =
  (type, key, template) =>
  async ({ recipient, dedupeKey, ...props }) => {
    const settings = await loadEmailSettings()
    if (!settings.templates[key].enabled) {
      return { skipped: true, disabled: true }
    }
    return deliver({
      type,
      to: recipient.email,
      recipientUserId: recipient.userId,
      dedupeKey,
      sender: settings.sender,
      email: template(props, settings),
    })
  }

export const sendStudentResult = toRecipient(
  'KPI_SCORED_STUDENT',
  'student-result',
  studentResultEmail
)
export const sendMentorFollowUp = toRecipient(
  'CONSECUTIVE_MID_SCORE_MENTOR',
  'mentor-follow-up',
  mentorFollowUpEmail
)
export const sendMentorLowScore = toRecipient(
  'CONSECUTIVE_LOW_SCORE_MENTOR',
  'mentor-low-score',
  mentorLowScoreEmail
)
export const sendBoardLowScore = toRecipient(
  'CONSECUTIVE_LOW_SCORE_BOARD',
  'board-low-score',
  boardLowScoreEmail
)

// ------------------------------------------------------------ code emails

// Always sent: they can't be switched off.
const codeEmail =
  (type, template) =>
  async ({ to, userId, username, otp, expiresInMinutes }) => {
    const settings = await loadEmailSettings()
    return deliver({
      type,
      to,
      recipientUserId: userId,
      sender: settings.sender,
      email: template(
        { recipientName: username, code: otp, expiresInMinutes },
        settings
      ),
    })
  }

export const sendResetPasswordOtpEmail = codeEmail(
  'PASSWORD_RESET',
  passwordResetEmail
)
export const sendSignupOtpEmail = codeEmail(
  'SIGNUP_VERIFICATION',
  signupVerificationEmail
)

// ------------------------------------------------------ programme emails
// recipient: { email, userId? }. dedupeKey identifies what the email says,
// so a changed meeting is emailed again and an unchanged one never is.

export const sendFounderSession = toRecipient(
  'SESSION_FOUNDER',
  'session-founder',
  founderSessionEmail
)
export const sendStaffSession = toRecipient(
  'SESSION_STAFF',
  'session-staff',
  staffSessionEmail
)
export const sendSessionCancelled = toRecipient(
  'SESSION_CANCELLED',
  'session-cancelled',
  sessionCancelledEmail
)

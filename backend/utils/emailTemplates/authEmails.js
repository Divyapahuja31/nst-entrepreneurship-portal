import { DEFAULT_EMAIL_SETTINGS } from '../emailSettings.js'
import {
  actionCard,
  escapeHtml,
  fill,
  heading,
  layout,
  paragraph,
  plainText,
} from './layout.js'

const codeBlock = code =>
  `<div style="margin:24px 0;text-align:center;"><span style="display:inline-block;padding:12px 24px;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:6px;color:#1d1d1f;background:#f5f5f7;border-radius:12px;">${escapeHtml(code)}</span></div>`

// The subject is logged, so it never holds the code: there is no {code}
// placeholder.
const codeEmail = (
  key,
  { recipientName, code, expiresInMinutes: minutes },
  settings
) => {
  const { brand } = settings
  const own = settings.templates[key]
  const values = { name: recipientName || 'there' }
  const subject = fill(own.subject, values)
  const title = fill(own.heading, values)
  const intro = fill(own.intro, values)
  const html = layout({
    title: subject,
    preheader: `Your code expires in ${minutes} minutes.`,
    brand,
    body: [
      heading(title),
      paragraph(`Hi ${escapeHtml(recipientName || 'there')},`),
      paragraph(escapeHtml(intro)),
      codeBlock(code),
      actionCard({
        tone: 'info',
        title: `This code expires in ${minutes} minutes`,
        body: "If you didn't ask for it, you can ignore this email.",
      }),
    ].join(''),
  })
  const text = plainText(
    [
      `Hi ${recipientName || 'there'},`,
      '',
      intro,
      '',
      `Your code: ${code}`,
      '',
      `It expires in ${minutes} minutes. If you didn't ask for it, you can ignore this email.`,
    ],
    brand
  )
  return { subject, html, text }
}

// The password reset stays a 6-digit code typed into the reset page, so the
// code's own attempt limits keep protecting it.
export const passwordResetEmail = (props, settings = DEFAULT_EMAIL_SETTINGS) =>
  codeEmail('password-reset', props, settings)

export const signupVerificationEmail = (
  props,
  settings = DEFAULT_EMAIL_SETTINGS
) => codeEmail('signup-verification', props, settings)

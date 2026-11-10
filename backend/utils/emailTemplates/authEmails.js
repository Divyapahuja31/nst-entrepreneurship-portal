import {
  actionCard,
  escapeHtml,
  heading,
  layout,
  paragraph,
  plainText,
} from './layout.js'

const codeBlock = code =>
  `<div style="margin:24px 0;text-align:center;"><span style="display:inline-block;padding:12px 24px;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:6px;color:#1d1d1f;background:#f5f5f7;border-radius:12px;">${escapeHtml(code)}</span></div>`

const codeEmail = ({ subject, title, intro, code, recipientName, minutes }) => {
  const html = layout({
    title: subject,
    preheader: `Your code expires in ${minutes} minutes.`,
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
  const text = plainText([
    `Hi ${recipientName || 'there'},`,
    '',
    intro,
    '',
    `Your code: ${code}`,
    '',
    `It expires in ${minutes} minutes. If you didn't ask for it, you can ignore this email.`,
  ])
  return { subject, html, text }
}

// The password reset stays a 6-digit code typed into the reset page, so the
// code's own attempt limits keep protecting it.
export const passwordResetEmail = ({ recipientName, code, expiresInMinutes }) =>
  codeEmail({
    subject: 'Reset your NST Entrepreneurship Tracker password',
    title: 'Reset your password',
    intro:
      'Someone asked to reset the password for your NST Entrepreneurship Tracker account. Enter this code on the reset page to choose a new one:',
    code,
    recipientName,
    minutes: expiresInMinutes,
  })

export const signupVerificationEmail = ({
  recipientName,
  code,
  expiresInMinutes,
}) =>
  codeEmail({
    subject: 'Verify your NST Entrepreneurship Tracker email',
    title: 'Verify your email address',
    intro:
      'Welcome to the NST Entrepreneurship Tracker! Enter this code to verify your email and finish signing up:',
    code,
    recipientName,
    minutes: expiresInMinutes,
  })

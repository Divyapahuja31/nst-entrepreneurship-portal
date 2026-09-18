import { Resend } from 'resend'

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured in environment variables')
  }
  return new Resend(apiKey)
}

const buildEmailContent = (username, resetUrl) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
      <h2 style="color: #0f172a; margin-bottom: 16px;">Password Reset Request</h2>
      <p style="color: #334155; font-size: 15px; line-height: 1.5;">Hi ${username || 'there'},</p>
      <p style="color: #334155; font-size: 15px; line-height: 1.5;">You recently requested to reset your password for your NST Entrepreneurship Tracker account. Click the button below to reset it:</p>
      <div style="margin: 24px 0; text-align: center;">
        <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Reset Password</a>
      </div>
      <p style="color: #64748b; font-size: 14px; line-height: 1.5;">This link will expire in 1 hour.</p>
      <p style="color: #64748b; font-size: 14px; line-height: 1.5;">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">NST Entrepreneurship Tracker</p>
    </div>
  `

  const text = `Hi ${username || 'there'},\n\nYou requested to reset your password for your NST Entrepreneurship Tracker account.\n\nPlease copy and paste the following link into your browser to reset your password:\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request a password reset, please ignore this email.`

  return { html, text }
}

export const sendResetPasswordEmail = async ({ to, username, resetUrl }) => {
  const resend = getResendClient()
  const from =
    process.env.EMAIL_FROM?.trim() ||
    'NST Entrepreneurship Tracker <onboarding@resend.dev>'
  const subject = 'Password Reset Request - NST Entrepreneurship Tracker'
  const { html, text } = buildEmailContent(username, resetUrl)

  const payload = { from, to, subject, html, text }
  const { data, error } = await resend.emails.send(payload)

  if (!error) {
    return data
  }

  if (from !== 'onboarding@resend.dev') {
    const fallback = await resend.emails.send({
      ...payload,
      from: 'onboarding@resend.dev',
    })
    if (!fallback.error) {
      return fallback.data
    }
  }

  throw new Error(error.message || 'Failed to send reset email')
}

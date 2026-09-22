import { Resend } from 'resend'

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured in environment variables')
  }
  return new Resend(apiKey)
}

const buildOtpEmailContent = (username, otp) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
      <h2 style="color: #0f172a; margin-bottom: 16px;">Password Reset Verification Code</h2>
      <p style="color: #334155; font-size: 15px; line-height: 1.5;">Hi ${username || 'there'},</p>
      <p style="color: #334155; font-size: 15px; line-height: 1.5;">You requested to reset your password for your NST Entrepreneurship Tracker account. Use the verification code below to reset your password:</p>
      <div style="margin: 24px 0; text-align: center;">
        <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #2563eb; background-color: #eff6ff; padding: 12px 24px; border-radius: 8px; border: 1px dashed #bfdbfe; display: inline-block;">
          ${otp}
        </span>
      </div>
      <p style="color: #64748b; font-size: 14px; line-height: 1.5;">This code will expire in <strong>5 minutes</strong>.</p>
      <p style="color: #64748b; font-size: 14px; line-height: 1.5;">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">NST Entrepreneurship Tracker</p>
    </div>
  `

  const text = `Hi ${username || 'there'},\n\nYou requested to reset your password for your NST Entrepreneurship Tracker account.\n\nYour 6-digit verification code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nIf you did not request a password reset, please ignore this email.`

  return { html, text }
}

export const sendResetPasswordOtpEmail = async ({ to, username, otp }) => {
  const resend = getResendClient()
  const from =
    process.env.EMAIL_FROM?.trim() ||
    'NST Entrepreneurship Tracker <onboarding@resend.dev>'
  const subject = `${otp} is your Password Reset Code - NST Entrepreneurship Tracker`
  const { html, text } = buildOtpEmailContent(username, otp)

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

  throw new Error(error.message || 'Failed to send verification email')
}

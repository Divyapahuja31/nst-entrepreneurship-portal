import { Resend } from 'resend'

const sendWithFallback = async (resend, payload) => {
  const primary = await resend.emails.send(payload)
  if (!primary.error || payload.from === 'onboarding@resend.dev') {
    return primary
  }
  return await resend.emails.send({
    ...payload,
    from: 'onboarding@resend.dev',
  })
}

const sendOtpEmail = async ({ to, username, otp, title, message, subject }) => {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured in environment variables')
  }
  const resend = new Resend(apiKey)
  const from =
    process.env.EMAIL_FROM?.trim() ||
    'NST Entrepreneurship Tracker <onboarding@resend.dev>'

  const name = username || 'there'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
      <h2 style="color: #0f172a; margin-bottom: 16px;">${title}</h2>
      <p style="color: #334155; font-size: 15px; line-height: 1.5;">Hi ${name},</p>
      <p style="color: #334155; font-size: 15px; line-height: 1.5;">${message}</p>
      <div style="margin: 24px 0; text-align: center;">
        <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #2563eb; background-color: #eff6ff; padding: 12px 24px; border-radius: 8px; border: 1px dashed #bfdbfe; display: inline-block;">
          ${otp}
        </span>
      </div>
      <p style="color: #64748b; font-size: 14px; line-height: 1.5;">This code will expire in <strong>5 minutes</strong>.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">NST Entrepreneurship Tracker</p>
    </div>
  `

  const text = `Hi ${name},\n\n${message}\n\nYour 6-digit verification code is: ${otp}\n\nThis code will expire in 5 minutes.`

  const result = await sendWithFallback(resend, {
    from,
    to,
    subject,
    html,
    text,
  })

  if (result.error) {
    throw new Error(result.error.message || 'Failed to send verification email')
  }

  return result.data
}

export const sendResetPasswordOtpEmail = ({ to, username, otp }) =>
  sendOtpEmail({
    to,
    username,
    otp,
    title: 'Password Reset Verification Code',
    message:
      'You requested to reset your password for your NST Entrepreneurship Tracker account. Use the verification code below to reset your password:',
    subject: `${otp} is your Password Reset Code - NST Entrepreneurship Tracker`,
  })

export const sendSignupOtpEmail = ({ to, username, otp }) =>
  sendOtpEmail({
    to,
    username,
    otp,
    title: 'Verify Your Email Address',
    message:
      'Welcome to NST Entrepreneurship Tracker! Please use the verification code below to verify your email address and complete your registration:',
    subject: `${otp} is your Email Verification Code - NST Entrepreneurship Tracker`,
  })

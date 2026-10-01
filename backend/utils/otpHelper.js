import crypto from 'crypto'
import User from '../models/user.js'
import {
  sendResetPasswordOtpEmail,
  sendSignupOtpEmail,
} from './emailService.js'

const OTP_TTL_MS = 5 * 60 * 1000
const OTP_RESEND_COOLDOWN_MS = 60 * 1000
const MAX_OTP_ATTEMPTS = 5

// Signup verification and password reset are separate flows with their own
// code, expiry and attempt counter on the user. They share only the mechanics
// below, so a security fix to one always applies to both.
const SIGNUP = {
  otpField: 'signupOtp',
  expiresField: 'signupOtpExpires',
  attemptsField: 'signupOtpAttempts',
  sendEmail: sendSignupOtpEmail,
}

const PASSWORD_RESET = {
  otpField: 'resetPasswordOtp',
  expiresField: 'resetPasswordOtpExpires',
  attemptsField: 'resetPasswordOtpAttempts',
  sendEmail: sendResetPasswordOtpEmail,
}

const hashOtp = otp => crypto.createHash('sha256').update(otp).digest('hex')

// Seconds until another code may be sent, 0 if one can be sent now.
const getCooldown = (user, flow) => {
  const expires = user[flow.expiresField]
  if (!expires) {
    return 0
  }
  const sentAt = expires.getTime() - OTP_TTL_MS
  const remaining = sentAt + OTP_RESEND_COOLDOWN_MS - Date.now()
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0
}

// Issuing a code resets the attempt counter, so it is rate limited per user;
// otherwise requesting fresh codes would give unlimited guesses.
// Always saves the user, so pending changes are kept even on cooldown.
const sendCode = async (user, flow) => {
  const retryAfter = getCooldown(user, flow)
  if (retryAfter) {
    await user.save()
    return { sent: false, retryAfter }
  }

  const otp = crypto.randomInt(100000, 1000000).toString()
  user[flow.otpField] = hashOtp(otp)
  user[flow.expiresField] = new Date(Date.now() + OTP_TTL_MS)
  user[flow.attemptsField] = 0
  await user.save()

  await flow.sendEmail({ to: user.email, username: user.username, otp })
  return { sent: true, retryAfter: 0 }
}

// Returns an error message, or null when the code is correct.
// Every guess uses up an attempt in a single atomic update before the code is
// compared, so parallel requests can't all slip in under the limit.
const checkCode = async (user, otp, flow) => {
  const { otpField, expiresField, attemptsField } = flow

  if (!user?.[otpField] || !user?.[expiresField]) {
    return 'Invalid or expired verification request'
  }
  if (user[expiresField] < new Date()) {
    return 'Verification code has expired. Please request a new code.'
  }

  const attempt = await User.findOneAndUpdate(
    {
      _id: user._id,
      [otpField]: user[otpField],
      [attemptsField]: { $lt: MAX_OTP_ATTEMPTS },
    },
    { $inc: { [attemptsField]: 1 } }
  )
  if (!attempt) {
    return 'Too many failed verification attempts. Please request a new verification code.'
  }

  if (typeof otp !== 'string' || hashOtp(otp.trim()) !== user[otpField]) {
    return 'Invalid verification code. Please check your email and try again.'
  }
  // Only wrong guesses count. Password reset checks the same code twice
  // (verify, then reset), so a correct one must not use up an attempt.
  await User.updateOne(
    { _id: user._id, [otpField]: user[otpField] },
    { $inc: { [attemptsField]: -1 } }
  )
  return null
}

const clearCode = (user, flow) => {
  user[flow.otpField] = null
  user[flow.expiresField] = null
  user[flow.attemptsField] = 0
}

export const otpCooldownMessage = seconds =>
  `A code was sent recently. Please wait ${seconds} seconds before requesting a new one.`

export const sendSignupCode = user => sendCode(user, SIGNUP)
export const checkSignupCode = (user, otp) => checkCode(user, otp, SIGNUP)
export const clearSignupCode = user => clearCode(user, SIGNUP)

export const sendPasswordResetCode = user => sendCode(user, PASSWORD_RESET)
export const checkPasswordResetCode = (user, otp) =>
  checkCode(user, otp, PASSWORD_RESET)
export const clearPasswordResetCode = user => clearCode(user, PASSWORD_RESET)

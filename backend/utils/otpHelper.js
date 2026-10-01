import crypto from 'crypto'
import User from '../models/user.js'
import {
  sendResetPasswordOtpEmail,
  sendSignupOtpEmail,
} from './emailService.js'

const OTP_TTL_MS = 5 * 60 * 1000
const OTP_RESEND_COOLDOWN_MS = 60 * 1000
const MAX_OTP_ATTEMPTS = 5
// A new code resets the per-code attempts, so failures are also capped per
// user across codes; otherwise asking for codes gives unlimited guesses.
const FAILURE_WINDOW_MS = 24 * 60 * 60 * 1000
const MAX_DAILY_FAILURES = 20

const INVALID_REQUEST = 'Invalid or expired verification request'
const INVALID_CODE =
  'Invalid verification code. Please check your email and try again.'

// Signup verification and password reset are separate flows with their own
// code, expiry and counters on the user. They share only the mechanics
// below, so a security fix to one always applies to both.
const SIGNUP = {
  otpField: 'signupOtp',
  expiresField: 'signupOtpExpires',
  attemptsField: 'signupOtpAttempts',
  failuresField: 'signupOtpFailures',
  failuresSinceField: 'signupOtpFailuresSince',
  sendEmail: sendSignupOtpEmail,
}

const PASSWORD_RESET = {
  otpField: 'resetPasswordOtp',
  expiresField: 'resetPasswordOtpExpires',
  attemptsField: 'resetPasswordOtpAttempts',
  failuresField: 'resetPasswordOtpFailures',
  failuresSinceField: 'resetPasswordOtpFailuresSince',
  sendEmail: sendResetPasswordOtpEmail,
}

const hashOtp = otp => crypto.createHash('sha256').update(otp).digest('hex')

const cleared = flow => ({
  [flow.otpField]: null,
  [flow.expiresField]: null,
  [flow.attemptsField]: 0,
})

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
  const hash = hashOtp(otp)
  user[flow.otpField] = hash
  user[flow.expiresField] = new Date(Date.now() + OTP_TTL_MS)
  user[flow.attemptsField] = 0
  await user.save()

  try {
    await flow.sendEmail({ to: user.email, username: user.username, otp })
  } catch (error) {
    // No code reached the user, so drop it. Otherwise its cooldown would stop
    // them asking for one that does.
    await User.updateOne(
      { _id: user._id, [flow.otpField]: hash },
      { $set: cleared(flow) }
    )
    throw error
  }
  return { sent: true, retryAfter: 0 }
}

// Why a code check matched nothing, read from the user's current state.
const explainRejection = (user, flow, now) => {
  if (!user?.[flow.otpField]) {
    return INVALID_REQUEST
  }
  if (user[flow.expiresField] <= now) {
    return 'Verification code has expired. Please request a new code.'
  }
  if (user[flow.failuresField] >= MAX_DAILY_FAILURES) {
    return 'Too many failed verification attempts today. Please try again tomorrow.'
  }
  if (user[flow.attemptsField] >= MAX_OTP_ATTEMPTS) {
    return 'Too many failed verification attempts. Please request a new verification code.'
  }
  // The code changed while this request was in flight.
  return 'This code is no longer valid. Please use the latest code sent to your email.'
}

// Returns an error message, or null when the code is correct. `consume`
// clears a correct code in the same update, so it works only once.
// Each outcome is a single conditional update, so parallel requests can't
// get past the limits or use one code twice.
const checkCode = async (user, otp, flow, { consume = false } = {}) => {
  if (!user) {
    return INVALID_REQUEST
  }
  const {
    otpField,
    expiresField,
    attemptsField,
    failuresField,
    failuresSinceField,
  } = flow
  const now = new Date()

  // Start a new daily window once the last one is over.
  await User.updateOne(
    {
      _id: user._id,
      $or: [
        { [failuresSinceField]: null },
        { [failuresSinceField]: { $lte: new Date(now - FAILURE_WINDOW_MS) } },
      ],
    },
    { $set: { [failuresField]: 0, [failuresSinceField]: now } }
  )

  const usable = {
    _id: user._id,
    [expiresField]: { $gt: now },
    [attemptsField]: { $lt: MAX_OTP_ATTEMPTS },
    [failuresField]: { $lt: MAX_DAILY_FAILURES },
  }
  const hash = typeof otp === 'string' ? hashOtp(otp.trim()) : null

  if (hash) {
    const match = { ...usable, [otpField]: hash }
    const correct = consume
      ? (await User.updateOne(match, { $set: cleared(flow) })).modifiedCount
      : await User.exists(match)
    if (correct) {
      return null
    }
  }

  const failed = await User.updateOne(
    { ...usable, [otpField]: { $nin: [null, hash] } },
    { $inc: { [attemptsField]: 1, [failuresField]: 1 } }
  )
  if (failed.modifiedCount) {
    return INVALID_CODE
  }

  return explainRejection(await User.findById(user._id), flow, now)
}

const clearCode = (user, flow) => Object.assign(user, cleared(flow))

export const otpCooldownMessage = seconds =>
  `A code was sent recently. Please wait ${seconds} seconds before requesting a new one.`

export const sendSignupCode = user => sendCode(user, SIGNUP)
export const redeemSignupCode = (user, otp) =>
  checkCode(user, otp, SIGNUP, { consume: true })
export const clearSignupCode = user => clearCode(user, SIGNUP)

export const sendPasswordResetCode = user => sendCode(user, PASSWORD_RESET)
// Checks without using the code up, for the step before the new password.
export const checkPasswordResetCode = (user, otp) =>
  checkCode(user, otp, PASSWORD_RESET)
export const redeemPasswordResetCode = (user, otp) =>
  checkCode(user, otp, PASSWORD_RESET, { consume: true })

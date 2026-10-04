import { useState } from 'react'
import { Link as RouterLink } from 'react-router'
import { Alert, Button, Link, Stack, TextField } from '@mui/material'

import AuthScreen from '../../components/AuthScreen'
import { PasswordField } from '../../components/AuthFields'
import OtpVerificationForm from '../../components/OtpVerificationForm'
import { forgotPassword, verifyOtp, resetPassword } from '../../api/auth'

function PageForgotPassword() {
  const [step, setStep] = useState(1) // 1: Email, 2: OTP, 3: New Password, 4: Complete
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleSendOtp = async event => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccessMessage('')

    const formData = new FormData(event.currentTarget)
    const submittedEmail = formData.get('email')?.trim()

    if (!submittedEmail) {
      setError('Enter your email address.')
      setSubmitting(false)
      return
    }

    const result = await forgotPassword({ email: submittedEmail })
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
    } else {
      setEmail(submittedEmail)
      setOtp('')
      setStep(2)
      setSuccessMessage(
        result.message ||
          'A 6-digit verification code has been sent to your email.'
      )
    }
  }

  const handleResendOtp = async () => {
    if (!email) return
    setSubmitting(true)
    setError('')

    const result = await forgotPassword({ email })
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccessMessage(
        result.message ||
          'A new 6-digit verification code has been sent to your email.'
      )
    }
  }

  const handleVerifyOtp = async code => {
    setSubmitting(true)
    setError('')
    setSuccessMessage('')

    const result = await verifyOtp({ email, otp: code })
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
    } else {
      setOtp(code)
      setStep(3)
    }
  }

  const handleResetPassword = async event => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccessMessage('')

    const formData = new FormData(event.currentTarget)
    const password = formData.get('password')
    const confirmPassword = formData.get('confirmPassword')

    if (!password || password.length < 8) {
      setError('Choose a password with at least 8 characters.')
      setSubmitting(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Enter the same password in both fields.')
      setSubmitting(false)
      return
    }

    const result = await resetPassword({ email, otp, password })
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
    } else {
      setStep(4)
    }
  }

  const TITLES = {
    1: 'Reset Your Password',
    2: 'Check Your Email',
    3: 'Choose a New Password',
    4: 'Password Updated',
  }

  const SUBTITLES = {
    1: "Enter the email you use for the portal. We'll send you a 6-digit code.",
    2: `Enter the 6-digit code sent to ${email}.`,
    3: 'Use at least 8 characters.',
    4: 'Sign in with your new password.',
  }

  return (
    <AuthScreen
      title={TITLES[step]}
      subtitle={SUBTITLES[step]}
      footer={
        step === 1 && (
          <>
            Remember your password?{' '}
            <Link component={RouterLink} to="/signin">
              Sign in
            </Link>
          </>
        )
      }
    >
      {step === 4 ? (
        <Button
          component={RouterLink}
          to="/signin"
          variant="contained"
          fullWidth
          size="large"
        >
          Sign In
        </Button>
      ) : step === 1 ? (
        <form onSubmit={handleSendOtp}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            defaultValue={email}
            required
            fullWidth
            sx={{ mb: 4 }}
          />

          <Button
            fullWidth
            variant="contained"
            type="submit"
            size="large"
            disabled={submitting}
          >
            {submitting ? 'Sending Code…' : 'Send Code'}
          </Button>
        </form>
      ) : step === 2 ? (
        <OtpVerificationForm
          onVerify={handleVerifyOtp}
          onResend={handleResendOtp}
          onBack={() => {
            setStep(1)
            setError('')
            setSuccessMessage('')
          }}
          submitting={submitting}
          error={error}
          successMessage={successMessage}
          submitLabel="Continue"
          backLabel="Change Email"
        />
      ) : (
        <form onSubmit={handleResetPassword}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stack spacing={2} sx={{ mb: 4 }}>
            <PasswordField
              label="New Password"
              name="password"
              autoComplete="new-password"
              required
              autoFocus
            />

            <PasswordField
              label="Confirm New Password"
              name="confirmPassword"
              autoComplete="new-password"
              required
            />
          </Stack>

          <Button
            fullWidth
            variant="contained"
            type="submit"
            size="large"
            disabled={submitting}
          >
            {submitting ? 'Updating Password…' : 'Update Password'}
          </Button>
        </form>
      )}
    </AuthScreen>
  )
}

export default PageForgotPassword

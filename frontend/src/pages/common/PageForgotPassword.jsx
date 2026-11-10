import { useState } from 'react'
import { Link as RouterLink } from 'react-router'
import { Alert, Box, Button, Link, TextField, Typography } from '@mui/material'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'

import AuthScreen from '../../components/AuthScreen'
import useAuthStep from '../../components/useAuthStep'
import { PasswordField } from '../../components/AuthFields'
import OtpVerificationForm from '../../components/OtpVerificationForm'
import { forgotPassword, verifyOtp, resetPassword } from '../../api/auth'

function PageForgotPassword() {
  const [step, setStep, direction] = useAuthStep(1) // 1: Email, 2: OTP, 3: New Password, 4: Complete
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
      setError('Email is required')
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
      setError('The passwords you entered don’t match.')
      setSubmitting(false)
      return
    }

    const result = await resetPassword({ email, otp, password })
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
    } else {
      setStep(4)
      setSuccessMessage(
        result.message || 'Password reset successfully! You can now log in.'
      )
    }
  }

  const renderStepSubtitle = () => {
    switch (step) {
      case 1:
        return 'Enter the email you use for the portal and we’ll send you a verification code.'
      case 2:
        return `Enter the 6-digit code sent to ${email}.`
      case 3:
        return 'Choose a new password for your account.'
      case 4:
        return 'You can now sign in with your new password.'
      default:
        return ''
    }
  }

  const titles = {
    1: 'Forgot Password?',
    2: 'Check Your Email',
    3: 'New Password',
    4: 'Password Updated',
  }

  return (
    <AuthScreen
      title={titles[step]}
      subtitle={renderStepSubtitle()}
      stepKey={step}
      direction={direction}
      shakeOn={error}
    >
      {step === 4 ? (
        <Box sx={{ textAlign: 'center' }}>
          <CheckCircleRoundedIcon
            color="success"
            sx={{ fontSize: 64, mb: 3 }}
            aria-hidden="true"
          />
          <Button
            component={RouterLink}
            to="/signin"
            variant="contained"
            fullWidth
            size="large"
          >
            Sign In
          </Button>
        </Box>
      ) : step === 1 ? (
        <form onSubmit={handleSendOtp} autoComplete="off">
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            label="Email"
            type="email"
            name="email"
            defaultValue={email}
            autoComplete="email"
            autoFocus
            required
            fullWidth
            sx={{ mb: 4 }}
          />

          <Button
            fullWidth
            variant="contained"
            type="submit"
            size="large"
            loading={submitting}
          >
            Continue
          </Button>

          <Typography
            variant="body2"
            color="textSecondary"
            sx={{ mt: 4, textAlign: 'center' }}
          >
            Remembered it?{' '}
            <Link component={RouterLink} to="/signin">
              Sign in
            </Link>
          </Typography>
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
          backLabel="Change email"
        />
      ) : (
        <form onSubmit={handleResetPassword} autoComplete="off">
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <PasswordField
            label="New password"
            autoComplete="new-password"
            autoFocus
            required
            helperText="At least 8 characters"
            sx={{ mb: 1.5 }}
          />

          <PasswordField
            label="Confirm password"
            name="confirmPassword"
            autoComplete="new-password"
            required
            sx={{ mb: 4 }}
          />

          <Button
            fullWidth
            variant="contained"
            type="submit"
            size="large"
            loading={submitting}
          >
            Update Password
          </Button>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button variant="text" size="small" onClick={() => setStep(2)}>
              Back
            </Button>
          </Box>
        </form>
      )}
    </AuthScreen>
  )
}

export default PageForgotPassword

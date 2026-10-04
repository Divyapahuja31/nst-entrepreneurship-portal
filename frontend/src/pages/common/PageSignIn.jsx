import { useState } from 'react'
import { Link as RouterLink, Navigate, useNavigate } from 'react-router'
import { Alert, Button, Link, Stack, TextField } from '@mui/material'

import AuthScreen from '../../components/AuthScreen'
import { GoogleSignInButton, PasswordField } from '../../components/AuthFields'
import OtpVerificationForm from '../../components/OtpVerificationForm'
import { useAuthStore } from '../../stores/auth'
import {
  signIn,
  verifySignupOtp,
  resendSignupOtp,
  homePathFor,
} from '../../api/auth'

function SignIn() {
  const navigate = useNavigate()
  const login = useAuthStore(state => state.login)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const user = useAuthStore(state => state.user)

  const [step, setStep] = useState(1) // 1: Sign In form, 2: OTP Verification
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [action, setAction] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [otpSuccess, setOtpSuccess] = useState('')

  const handleSubmit = async event => {
    event.preventDefault()
    setSubmitting(true)
    setAction(null)

    const payload = Object.fromEntries(new FormData(event.currentTarget))
    const result = await signIn(payload)

    setSubmitting(false)
    if (result.requireOtp) {
      setEmail(result.email || payload.email)
      setPassword(payload.password)
      setOtpError('')
      setOtpSuccess(
        result.error ||
          'A 6-digit verification code has been sent to your email.'
      )
      setStep(2)
      return
    }

    if (result.error) {
      setAction(result)
      return
    }

    login(result.user)
    navigate(homePathFor(result.user), { replace: true })
  }

  const handleVerifyOtp = async otp => {
    setSubmitting(true)
    setOtpError('')

    const result = await verifySignupOtp({ email, otp, password })
    setSubmitting(false)

    if (result.error) {
      setOtpError(result.error)
      return
    }

    if (result.user) {
      login(result.user)
      navigate(homePathFor(result.user), { replace: true })
    }
  }

  const handleResendOtp = async () => {
    setSubmitting(true)
    setOtpError('')

    const result = await resendSignupOtp({ email })
    setSubmitting(false)

    if (result.error) {
      setOtpError(result.error)
    } else {
      setOtpSuccess(
        result.message ||
          'A new 6-digit verification code has been sent to your email.'
      )
    }
  }

  if (isAuthenticated) {
    return <Navigate to={homePathFor(user)} replace />
  }

  return (
    <AuthScreen
      title={step === 2 ? 'Verify Your Email' : 'Sign In'}
      subtitle={
        step === 2
          ? `Enter the 6-digit code sent to ${email}.`
          : 'Use your NST account to continue.'
      }
      footer={
        step === 1 && (
          <>
            New here?{' '}
            <Link component={RouterLink} to="/signup">
              Create an account
            </Link>
          </>
        )
      }
    >
      {step === 1 ? (
        <>
          <GoogleSignInButton />

          <form onSubmit={handleSubmit}>
            {action && action.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {action.error}
              </Alert>
            )}

            <Stack spacing={2}>
              <TextField
                error={Boolean(action && action.error)}
                label="Email"
                type="email"
                name="email"
                autoComplete="email"
                required
                fullWidth
              />

              <PasswordField
                error={Boolean(action && action.error)}
                name="password"
                autoComplete="current-password"
                required
              />
            </Stack>

            <Link
              component={RouterLink}
              to="/forgot-password"
              sx={{
                display: 'inline-block',
                mt: 1.5,
                mb: 3,
                fontSize: '0.9375rem',
              }}
            >
              Forgot password?
            </Link>

            <Button
              fullWidth
              variant="contained"
              type="submit"
              size="large"
              disabled={submitting}
            >
              {submitting ? 'Signing In…' : 'Sign In'}
            </Button>
          </form>
        </>
      ) : (
        <OtpVerificationForm
          onVerify={handleVerifyOtp}
          onResend={handleResendOtp}
          onBack={() => setStep(1)}
          submitting={submitting}
          error={otpError}
          successMessage={otpSuccess}
          submitLabel="Verify and Sign In"
          backLabel="Sign In"
        />
      )}
    </AuthScreen>
  )
}

export default SignIn

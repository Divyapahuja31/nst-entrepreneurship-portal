import { useState } from 'react'
import { Link as RouterLink, Navigate, useNavigate } from 'react-router'
import { Alert, Box, Button, Link, TextField, Typography } from '@mui/material'

import AuthScreen from '../../components/AuthScreen'
import useAuthStep from '../../components/useAuthStep'
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

  const [step, setStep, direction] = useAuthStep(1) // 1: Sign In form, 2: OTP Verification
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
      title={step === 2 ? 'Verify Email' : 'Sign In'}
      subtitle={
        step === 2
          ? `Enter the 6-digit verification code sent to ${email}.`
          : 'Use your NST account to continue.'
      }
      stepKey={step}
      direction={direction}
      shakeOn={step === 1 ? action?.error && action : otpError}
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

            <TextField
              error={Boolean(action && action.error)}
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              fullWidth
              sx={{ mb: 1.5 }}
            />

            <PasswordField
              error={Boolean(action && action.error)}
              autoComplete="current-password"
            />

            <Box sx={{ textAlign: 'right', mt: 1, mb: 3 }}>
              <Link
                component={RouterLink}
                to="/forgot-password"
                variant="body2"
              >
                Forgot password?
              </Link>
            </Box>

            <Button
              fullWidth
              variant="contained"
              type="submit"
              size="large"
              loading={submitting}
            >
              Sign In
            </Button>
          </form>

          <Typography
            variant="body2"
            color="textSecondary"
            sx={{ mt: 4, textAlign: 'center' }}
          >
            Don't have an account?{' '}
            <Link component={RouterLink} to="/signup">
              Create one
            </Link>
          </Typography>
        </>
      ) : (
        <OtpVerificationForm
          onVerify={handleVerifyOtp}
          onResend={handleResendOtp}
          onBack={() => setStep(1)}
          submitting={submitting}
          error={otpError}
          successMessage={otpSuccess}
          submitLabel="Verify & Sign In"
          backLabel="Back"
        />
      )}
    </AuthScreen>
  )
}

export default SignIn

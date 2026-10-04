import { useEffect, useState } from 'react'
import { Link as RouterLink, Navigate, useNavigate } from 'react-router'
import { Alert, Button, Link, MenuItem, Stack, TextField } from '@mui/material'

import AuthScreen from '../../components/AuthScreen'
import { GoogleSignInButton, PasswordField } from '../../components/AuthFields'
import OtpVerificationForm from '../../components/OtpVerificationForm'
import { useAuthStore } from '../../stores/auth'
import {
  signUp,
  verifySignupOtp,
  resendSignupOtp,
  homePathFor,
} from '../../api/auth'

function SignUp() {
  const navigate = useNavigate()
  const login = useAuthStore(state => state.login)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const user = useAuthStore(state => state.user)

  const [step, setStep] = useState(1) // 1: Sign Up details, 2: OTP Verification
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [action, setAction] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [otpSuccess, setOtpSuccess] = useState('')

  const [options, setOptions] = useState({
    campuses: [],
    batches: [],
  })
  const [loadingOptions, setLoadingOptions] = useState(true)

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const response = await fetch('/api/auth/google/signup-options')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load signup options')
        }

        setOptions({
          campuses: data.campuses || [],
          batches: data.batches || [],
        })
      } catch (error) {
        console.error('Failed to load signup options:', error)
      } finally {
        setLoadingOptions(false)
      }
    }

    loadOptions()
  }, [])

  const handleSubmit = async event => {
    event.preventDefault()
    setSubmitting(true)
    setAction(null)

    const payload = Object.fromEntries(new FormData(event.currentTarget))
    const result = await signUp(payload)

    setSubmitting(false)
    if (result.error) {
      setAction(result)
      return
    }

    if (result.requireOtp) {
      setEmail(result.email || payload.email)
      setPassword(payload.password)
      setOtpError('')
      setOtpSuccess(
        result.message ||
          'A 6-digit verification code has been sent to your email.'
      )
      setStep(2)
      return
    }

    if (result.user) {
      login(result.user)
      navigate(homePathFor(result.user), { replace: true })
    }
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

  const fieldError = name => action && action.error?.[name]

  return (
    <AuthScreen
      title={step === 2 ? 'Verify Your Email' : 'Create Your Account'}
      subtitle={
        step === 2
          ? `Enter the 6-digit code sent to ${email}.`
          : 'Join the NST Entrepreneurship Portal to track your venture.'
      }
      footer={
        step === 1 && (
          <>
            Already have an account?{' '}
            <Link component={RouterLink} to="/signin">
              Sign in
            </Link>
          </>
        )
      }
    >
      {step === 1 ? (
        <>
          <GoogleSignInButton />

          <form onSubmit={handleSubmit}>
            {typeof action?.error === 'string' && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {action.error}
              </Alert>
            )}

            <Stack spacing={2} sx={{ mb: 4 }}>
              <TextField
                fullWidth
                required
                error={Boolean(fieldError('username'))}
                label="Name"
                name="username"
                type="text"
                autoComplete="name"
                helperText={fieldError('username')}
              />

              <TextField
                fullWidth
                required
                error={Boolean(fieldError('email'))}
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                helperText={fieldError('email')}
              />

              <PasswordField
                required
                error={Boolean(fieldError('password'))}
                name="password"
                autoComplete="new-password"
                helperText={fieldError('password') || 'At least 8 characters'}
              />

              <TextField
                fullWidth
                required
                select
                label="Campus"
                name="campus"
                defaultValue=""
                disabled={loadingOptions}
                error={Boolean(fieldError('campus'))}
                helperText={fieldError('campus')}
              >
                {options.campuses.map(campus => (
                  <MenuItem key={campus._id} value={campus._id}>
                    {campus.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                fullWidth
                required
                select
                label="Batch"
                name="batch"
                defaultValue=""
                disabled={loadingOptions}
                error={Boolean(fieldError('batch'))}
                helperText={fieldError('batch')}
              >
                {options.batches.map(batch => (
                  <MenuItem key={batch._id} value={batch._id}>
                    {batch.name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Button
              fullWidth
              variant="contained"
              type="submit"
              size="large"
              disabled={loadingOptions || submitting}
            >
              {submitting ? 'Sending Code…' : 'Continue'}
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
          submitLabel="Verify and Create Account"
          backLabel="Edit Details"
        />
      )}
    </AuthScreen>
  )
}

export default SignUp

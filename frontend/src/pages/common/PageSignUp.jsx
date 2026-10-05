import { useEffect, useState } from 'react'
import { Link as RouterLink, Navigate, useNavigate } from 'react-router'
import {
  Alert,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  Link,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'

import AuthScreen from '../../components/AuthScreen'
import useAuthStep from '../../components/useAuthStep'
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

  const [step, setStep, direction] = useAuthStep(1) // 1: Sign Up details, 2: OTP Verification
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
  const [optionsError, setOptionsError] = useState('')

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
        setOptionsError(
          'Campus and batch options could not be loaded. Refresh the page to try again.'
        )
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

  // Field errors arrive as an object; anything else is a form-level message.
  const fieldErrors =
    action && typeof action.error === 'object' ? action.error : {}
  const formError =
    action && typeof action.error === 'string' ? action.error : ''

  return (
    <AuthScreen
      title={step === 2 ? 'Verify Email' : 'Create Your Account'}
      subtitle={
        step === 2
          ? `Enter the 6-digit verification code sent to ${email}.`
          : 'One account for everything on the NST Entrepreneurship Portal.'
      }
      stepKey={step}
      direction={direction}
      shakeOn={step === 1 ? action?.error && action : otpError}
    >
      {step === 1 ? (
        <>
          <GoogleSignInButton />

          <form onSubmit={handleSubmit}>
            {(formError || optionsError) && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError || optionsError}
              </Alert>
            )}

            <TextField
              fullWidth
              error={Boolean(fieldErrors.username)}
              label="Name"
              name="username"
              type="text"
              autoComplete="name"
              helperText={fieldErrors.username}
              sx={{ mb: 1.5 }}
            />

            <TextField
              fullWidth
              error={Boolean(fieldErrors.email)}
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              helperText={fieldErrors.email}
              sx={{ mb: 1.5 }}
            />

            <PasswordField
              error={Boolean(fieldErrors.password)}
              autoComplete="new-password"
              helperText={fieldErrors.password || 'At least 8 characters'}
              sx={{ mb: 1.5 }}
            />

            <FormControl
              fullWidth
              sx={{ mb: 1.5 }}
              disabled={loadingOptions}
              error={Boolean(fieldErrors.campus)}
            >
              <InputLabel id="signup-campus-label">Campus</InputLabel>

              <Select
                labelId="signup-campus-label"
                name="campus"
                defaultValue=""
              >
                {options.campuses.map(campus => (
                  <MenuItem key={campus._id} value={campus._id}>
                    {campus.name}
                  </MenuItem>
                ))}
              </Select>

              {fieldErrors.campus && (
                <FormHelperText>{fieldErrors.campus}</FormHelperText>
              )}
            </FormControl>

            <FormControl
              fullWidth
              sx={{ mb: 4 }}
              disabled={loadingOptions}
              error={Boolean(fieldErrors.batch)}
            >
              <InputLabel id="signup-batch-label">Batch</InputLabel>

              <Select labelId="signup-batch-label" name="batch" defaultValue="">
                {options.batches.map(batch => (
                  <MenuItem key={batch._id} value={batch._id}>
                    {batch.name}
                  </MenuItem>
                ))}
              </Select>

              {fieldErrors.batch && (
                <FormHelperText>{fieldErrors.batch}</FormHelperText>
              )}
            </FormControl>

            <Button
              fullWidth
              variant="contained"
              type="submit"
              size="large"
              loading={submitting}
              disabled={loadingOptions}
            >
              Continue
            </Button>
          </form>

          <Typography
            variant="body2"
            color="textSecondary"
            sx={{ mt: 4, textAlign: 'center' }}
          >
            Already have an account?{' '}
            <Link component={RouterLink} to="/signin">
              Sign in
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
          submitLabel="Verify Email"
          backLabel="Back"
        />
      )}
    </AuthScreen>
  )
}

export default SignUp

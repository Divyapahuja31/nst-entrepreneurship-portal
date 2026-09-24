import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import {
  Alert,
  Button,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'

import AuthScreen from '../../components/AuthScreen'
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
  const [action, setAction] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
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
      setOtpError('')
      setOtpSuccess(
        result.error || 'A 6-digit verification code has been sent to your email.'
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

    const result = await verifySignupOtp({ email, otp })
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
        result.message || 'A new 6-digit verification code has been sent to your email.'
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
          : 'Sign in to your account to access the NST Entrepreneurship Portal.'
      }
    >
      <Grid size={12} sx={{ padding: 2 }}>
        {step === 1 ? (
          <>
            {action && action.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {action.error}
              </Alert>
            )}

            <Button
              fullWidth
              variant="outlined"
              type="button"
              size="large"
              onClick={() => {
                window.location.href = '/api/auth/google'
              }}
            >
              Continue with Google
            </Button>

            <Divider sx={{ my: 2 }}>
              <Typography variant="body2" color="textSecondary">
                OR
              </Typography>
            </Divider>

            <form onSubmit={handleSubmit}>
              <TextField
                error={Boolean(action && action.error)}
                label="Email"
                type="email"
                name="email"
                fullWidth
                sx={{ mb: 2 }}
              />

              <TextField
                error={Boolean(action && action.error)}
                label="Password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                fullWidth
                sx={{ mb: 2 }}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(prev => !prev)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <Grid container sx={{ mt: 1, justifyContent: 'space-between' }}>
                <Grid size="auto">
                  <Button
                    component={Link}
                    to="/forgot-password"
                    variant="text"
                    size="large"
                    sx={{ pl: 0 }}
                  >
                    Forgot Password?
                  </Button>
                </Grid>

                <Grid size="auto">
                  <Button
                    fullWidth
                    variant="contained"
                    type="submit"
                    sx={{ mb: 1 }}
                    size="large"
                    disabled={submitting}
                    endIcon={<ArrowForwardRoundedIcon />}
                  >
                    {submitting ? 'Signing In...' : 'Sign In'}
                  </Button>
                </Grid>
              </Grid>
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
            submitLabel="Verify & Sign In"
            backLabel="Back to Sign In"
          />
        )}
      </Grid>

      {step === 1 && (
        <Grid size={12} sx={{ padding: 2 }}>
          <Typography color="textSecondary" sx={{ mb: 1 }}>
            Don't have an account?{' '}
            <Link to="/signup" underline="hover">
              Sign up with email
            </Link>
          </Typography>
        </Grid>
      )}
    </AuthScreen>
  )
}

export default SignIn

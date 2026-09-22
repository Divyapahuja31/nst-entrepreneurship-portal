import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  Alert,
  Box,
  Button,
  Grid,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded'
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'

import AuthScreen from '../../components/AuthScreen'
import { forgotPassword, verifyOtp, resetPassword } from '../../api/auth'

function PageForgotPassword() {
  const [step, setStep] = useState(1) // 1: Email, 2: OTP, 3: New Password, 4: Complete
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Resend timer countdown (60s)
  const [resendTimer, setResendTimer] = useState(0)

  useEffect(() => {
    let interval = null
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1)
      }, 1000)
    } else {
      clearInterval(interval)
    }
    return () => clearInterval(interval)
  }, [resendTimer])

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
      setResendTimer(60)
    }
  }

  const handleResendOtp = async () => {
    if (resendTimer > 0 || !email) return
    setSubmitting(true)
    setError('')

    const result = await forgotPassword({ email })
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccessMessage('A new 6-digit verification code has been sent to your email.')
      setResendTimer(60)
    }
  }

  const handleVerifyOtp = async event => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccessMessage('')

    if (!otp || otp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.')
      setSubmitting(false)
      return
    }

    const result = await verifyOtp({ email, otp: otp.trim() })
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
    } else {
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
      setError('Password must be at least 8 characters long.')
      setSubmitting(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setSubmitting(false)
      return
    }

    const result = await resetPassword({ email, otp: otp.trim(), password })
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
    } else {
      setStep(4)
      setSuccessMessage(result.message || 'Password reset successfully! You can now log in.')
    }
  }

  const renderStepSubtitle = () => {
    switch (step) {
      case 1:
        return 'Enter your registered email address to receive a 6-digit verification code.'
      case 2:
        return `Enter the 6-digit code sent to ${email}.`
      case 3:
        return 'Code verified! Enter your new password below.'
      case 4:
        return 'Your password has been reset successfully.'
      default:
        return ''
    }
  }

  return (
    <AuthScreen
      title={step === 3 || step === 4 ? 'Reset Password' : 'Forgot Password?'}
      subtitle={renderStepSubtitle()}
    >
      <Grid size={12} sx={{ padding: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {successMessage && step === 2 && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}

        {step === 4 ? (
          <Box sx={{ mt: 1 }}>
            <Alert severity="success" sx={{ mb: 3 }}>
              {successMessage}
            </Alert>
            <Button
              component={Link}
              to="/signin"
              variant="contained"
              fullWidth
              size="large"
              startIcon={<ArrowBackRoundedIcon />}
            >
              Sign In with New Password
            </Button>
          </Box>
        ) : step === 1 ? (
          <form onSubmit={handleSendOtp} autoComplete="off">
            <TextField
              label="Email Address"
              type="email"
              name="email"
              defaultValue={email}
              required
              fullWidth
              sx={{ mb: 3 }}
            />

            <Button
              fullWidth
              variant="contained"
              type="submit"
              size="large"
              disabled={submitting}
              endIcon={<ArrowForwardRoundedIcon />}
              sx={{ mb: 2 }}
            >
              {submitting ? 'Sending Code...' : 'Send Verification Code'}
            </Button>

            <Typography textAlign="center" color="textSecondary">
              Remember your password?{' '}
              <Link to="/signin" style={{ color: '#1976d2', textDecoration: 'none' }}>
                Sign In
              </Link>
            </Typography>
          </form>
        ) : step === 2 ? (
          <form onSubmit={handleVerifyOtp} autoComplete="off">
            <TextField
              id="otp-verification-code"
              label="6-Digit Verification Code"
              type="text"
              name="otp"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              required
              fullWidth
              autoComplete="one-time-code"
              inputProps={{
                maxLength: 6,
                autoComplete: 'one-time-code',
                style: { letterSpacing: '4px', fontWeight: 'bold' },
              }}
              placeholder="123456"
              sx={{ mb: 3 }}
            />

            <Button
              fullWidth
              variant="contained"
              type="submit"
              size="large"
              disabled={submitting || otp.trim().length !== 6}
              endIcon={<ArrowForwardRoundedIcon />}
              sx={{ mb: 2 }}
            >
              {submitting ? 'Verifying Code...' : 'Verify Code'}
            </Button>

            <Box
              sx={{
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center',
                mt: 1,
              }}
            >
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  setStep(1)
                  setError('')
                  setSuccessMessage('')
                }}
                startIcon={<ArrowBackRoundedIcon />}
              >
                Change Email
              </Button>

              <Button
                variant="text"
                size="small"
                onClick={handleResendOtp}
                disabled={resendTimer > 0 || submitting}
              >
                {resendTimer > 0 ? `Resend Code (${resendTimer}s)` : 'Resend Code'}
              </Button>
            </Box>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} autoComplete="off">
            <Alert severity="info" icon={<CheckCircleOutlineRoundedIcon />} sx={{ mb: 2 }}>
              Verification code verified successfully. Set your new password below.
            </Alert>

            <TextField
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              required
              fullWidth
              helperText="Must be at least 8 characters long"
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

            <TextField
              label="Confirm New Password"
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              required
              fullWidth
              sx={{ mb: 3 }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle confirm password visibility"
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

            <Button
              fullWidth
              variant="contained"
              type="submit"
              size="large"
              disabled={submitting}
              startIcon={<LockResetRoundedIcon />}
              sx={{ mb: 2 }}
            >
              {submitting ? 'Resetting Password...' : 'Reset Password'}
            </Button>

            <Button
              variant="text"
              size="small"
              onClick={() => setStep(2)}
              startIcon={<ArrowBackRoundedIcon />}
            >
              Back to Code Verification
            </Button>
          </form>
        )}
      </Grid>
    </AuthScreen>
  )
}

export default PageForgotPassword

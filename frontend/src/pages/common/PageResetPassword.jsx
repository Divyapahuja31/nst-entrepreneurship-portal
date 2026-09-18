import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Alert, Button, Grid, TextField, Typography } from '@mui/material'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'

import AuthScreen from '../../components/AuthScreen'
import { resetPassword } from '../../api/auth'

function PageResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleSubmit = async event => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccessMessage('')

    const formData = new FormData(event.currentTarget)
    const password = formData.get('password')
    const confirmPassword = formData.get('confirmPassword')

    if (!token) {
      setError('Invalid or missing password reset token.')
      setSubmitting(false)
      return
    }

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

    const result = await resetPassword({ token, password })
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccessMessage(result.message || 'Password reset successfully!')
    }
  }

  if (!token) {
    return (
      <AuthScreen
        title="Invalid Reset Link"
        subtitle="The password reset link is invalid or missing a token."
      >
        <Grid size={12} sx={{ padding: 2 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            No reset token was provided. Please request a new password reset link.
          </Alert>
          <Button
            component={Link}
            to="/forgot-password"
            variant="contained"
            fullWidth
            size="large"
          >
            Request Reset Link
          </Button>
        </Grid>
      </AuthScreen>
    )
  }

  return (
    <AuthScreen
      title="Reset Password"
      subtitle="Enter your new password below."
    >
      <Grid size={12} sx={{ padding: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {successMessage ? (
          <div>
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
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <TextField
              label="New Password"
              type="password"
              name="password"
              required
              fullWidth
              helperText="Must be at least 8 characters long"
              sx={{ mb: 2 }}
            />

            <TextField
              label="Confirm New Password"
              type="password"
              name="confirmPassword"
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
              {submitting ? 'Resetting Password...' : 'Reset Password'}
            </Button>

            <Typography textAlign="center" color="textSecondary">
              <Link to="/signin" style={{ color: '#1976d2', textDecoration: 'none' }}>
                Back to Sign In
              </Link>
            </Typography>
          </form>
        )}
      </Grid>
    </AuthScreen>
  )
}

export default PageResetPassword

import { useState } from 'react'
import { Link } from 'react-router'
import { Alert, Button, Grid, TextField, Typography } from '@mui/material'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'

import AuthScreen from '../../components/AuthScreen'
import { forgotPassword } from '../../api/auth'

function PageForgotPassword() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleSubmit = async event => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccessMessage('')

    const formData = new FormData(event.currentTarget)
    const email = formData.get('email')

    if (!email) {
      setError('Email is required')
      setSubmitting(false)
      return
    }

    const result = await forgotPassword({ email })
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccessMessage(
        result.message ||
          'If an account with that email exists, a password reset link has been sent.'
      )
    }
  }

  return (
    <AuthScreen
      title="Forgot Password?"
      subtitle="Enter your registered email address and we will send you a link to reset your password."
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
              Back to Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <TextField
              label="Email Address"
              type="email"
              name="email"
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
              {submitting ? 'Sending Link...' : 'Send Reset Link'}
            </Button>

            <Typography textAlign="center" color="textSecondary">
              Remember your password?{' '}
              <Link to="/signin" style={{ color: '#1976d2', textDecoration: 'none' }}>
                Sign In
              </Link>
            </Typography>
          </form>
        )}
      </Grid>
    </AuthScreen>
  )
}

export default PageForgotPassword

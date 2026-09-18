import { useState } from 'react'

import { Link, Navigate, useNavigate } from 'react-router'

import { Button, Divider, Grid, TextField, Typography } from '@mui/material'

import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'

import AuthScreen from '../../components/AuthScreen'

import { useAuthStore } from '../../stores/auth'
import { signIn, homePathFor } from '../../api/auth'

function SignIn() {
  const navigate = useNavigate()
  const login = useAuthStore(state => state.login)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const user = useAuthStore(state => state.user)

  const [action, setAction] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async event => {
    event.preventDefault()
    setSubmitting(true)
    setAction(null)

    const payload = Object.fromEntries(new FormData(event.currentTarget))
    const result = await signIn(payload)

    setSubmitting(false)
    if (result.error) {
      setAction(result)
      return
    }
    login(result.user)
    navigate(homePathFor(result.user), { replace: true })
  }

  if (isAuthenticated) {
    return <Navigate to={homePathFor(user)} replace />
  }

  return (
    <AuthScreen
      title="Sign In"
      subtitle="Sign in to your account to access the NST Entrepreneurship Portal."
    >
      <Grid size={12} sx={{ padding: 2 }}>
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
            type="password"
            name="password"
            fullWidth
            sx={{ mb: 2 }}
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
                Sign In
              </Button>
            </Grid>
          </Grid>
        </form>
      </Grid>

      <Grid size={12} sx={{ padding: 2 }}>
        <Typography color="textSecondary" sx={{ mb: 1 }}>
          Don't have an account?{' '}
          <Link to="/signup" underline="hover">
            Sign up with email
          </Link>
        </Typography>
      </Grid>
    </AuthScreen>
  )
}

export default SignIn

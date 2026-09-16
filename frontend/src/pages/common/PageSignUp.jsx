import { useEffect, useState } from 'react'

import { Link, Navigate, useNavigate } from 'react-router'

import {
  Button,
  Divider,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'

import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'

import AuthScreen from '../../components/AuthScreen'

import { useAuthStore } from '../../stores/auth'
import { signUp, homePathFor } from '../../api/auth'

function SignUp() {
  const navigate = useNavigate()
  const login = useAuthStore(state => state.login)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const user = useAuthStore(state => state.user)

  const [action, setAction] = useState(null)
  const [submitting, setSubmitting] = useState(false)

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
    login(result.user)
    navigate(homePathFor(result.user), { replace: true })
  }

  if (isAuthenticated) {
    return <Navigate to={homePathFor(user)} replace />
  }

  return (
    <AuthScreen
      title="Sign Up"
      subtitle="Create an account to access the NST Entrepreneurship Portal."
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
            fullWidth
            error={Boolean(action && action.error?.username)}
            label="Name"
            name="username"
            type="text"
            helperText={action && action.error?.username}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            error={Boolean(action && action.error?.email)}
            label="Email"
            name="email"
            type="email"
            helperText={action && action.error?.email}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            error={Boolean(action && action.error?.password)}
            label="Password"
            name="password"
            type="password"
            helperText={action && action.error?.password}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }} disabled={loadingOptions}>
            <InputLabel>Campus</InputLabel>

            <Select
              label="Campus"
              name="campus"
              defaultValue=""
              error={Boolean(action && action.error?.campus)}
            >
              {options.campuses.map(campus => (
                <MenuItem key={campus._id} value={campus._id}>
                  {campus.name}
                </MenuItem>
              ))}
            </Select>

            {action && action.error?.campus && (
              <FormHelperText error>{action.error.campus}</FormHelperText>
            )}
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }} disabled={loadingOptions}>
            <InputLabel>Batch</InputLabel>

            <Select
              label="Batch"
              name="batch"
              defaultValue=""
              error={Boolean(action && action.error?.batch)}
            >
              {options.batches.map(batch => (
                <MenuItem key={batch._id} value={batch._id}>
                  {batch.name}
                </MenuItem>
              ))}
            </Select>

            {action && action.error?.batch && (
              <FormHelperText error>{action.error.batch}</FormHelperText>
            )}
          </FormControl>

          <Grid container sx={{ mt: 1, justifyContent: 'flex-end' }}>
            <Grid size="auto">
              <Button
                fullWidth
                variant="contained"
                type="submit"
                sx={{ mb: 1 }}
                size="large"
                disabled={loadingOptions || submitting}
                endIcon={<ArrowForwardRoundedIcon />}
              >
                Sign Up
              </Button>
            </Grid>
          </Grid>
        </form>
      </Grid>

      <Grid size={12} sx={{ padding: 2 }}>
        <Typography color="textSecondary" sx={{ mb: 1 }}>
          Already have an account?{' '}
          <Link to="/signin" underline="hover">
            Sign in
          </Link>
        </Typography>
      </Grid>
    </AuthScreen>
  )
}

export default SignUp

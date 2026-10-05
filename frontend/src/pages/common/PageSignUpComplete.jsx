import { useEffect, useState } from 'react'

import { useNavigate, useSearchParams } from 'react-router'

import { Alert, Button, MenuItem, TextField, Typography } from '@mui/material'

import AuthScreen from '../../components/AuthScreen'

import { useAuthStore } from '../../stores/auth'
import { completeGoogleSignup } from '../../api/auth'

function CompleteSignup() {
  const navigate = useNavigate()
  const login = useAuthStore(state => state.login)
  const [searchParams] = useSearchParams()

  const token = searchParams.get('token')

  const [options, setOptions] = useState({
    campuses: [],
    batches: [],
  })

  const [form, setForm] = useState({
    username: '',
    batch: '',
    campus: '',
  })

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
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

        setError('Failed to load signup options. Please try again.')
      } finally {
        setLoadingOptions(false)
      }
    }

    loadOptions()
  }, [])

  const handleChange = event => {
    const { name, value } = event.target

    setForm(previousForm => ({
      ...previousForm,
      [name]: value,
    }))
  }

  const handleSubmit = async event => {
    event.preventDefault()

    if (!token) {
      setError('Signup session is missing or expired.')
      return
    }

    if (!form.username.trim() || !form.batch || !form.campus) {
      setError('Please complete all required fields.')
      return
    }

    setLoading(true)
    setError('')

    const result = await completeGoogleSignup({
      token,
      username: form.username.trim(),
      batch: form.batch,
      campus: form.campus,
    })

    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    login(result.user)
    navigate('/', { replace: true })
  }

  if (!token) {
    return (
      <AuthScreen
        title="Session Expired"
        subtitle="Your Google sign-up link is missing or has expired. Start again from the sign-in page."
      >
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={() => navigate('/signin')}
        >
          Back to Sign In
        </Button>
      </AuthScreen>
    )
  }

  if (loadingOptions) {
    return (
      <AuthScreen title="Complete Your Profile">
        <Typography color="textSecondary">
          Loading profile options...
        </Typography>
      </AuthScreen>
    )
  }

  return (
    <AuthScreen
      title="Complete Your Profile"
      subtitle="Your Google account is verified. Add a few details to finish setting up."
      shakeOn={error}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          required
          label="Name"
          name="username"
          autoComplete="name"
          autoFocus
          value={form.username}
          onChange={handleChange}
          sx={{ mb: 1.5 }}
          disabled={loading}
        />

        <TextField
          fullWidth
          required
          select
          label="Campus"
          name="campus"
          value={form.campus}
          onChange={handleChange}
          sx={{ mb: 1.5 }}
          disabled={loading}
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
          value={form.batch}
          onChange={handleChange}
          sx={{ mb: 1.5 }}
          disabled={loading}
        >
          {options.batches.map(batch => (
            <MenuItem key={batch._id} value={batch._id}>
              {batch.name}
            </MenuItem>
          ))}
        </TextField>

        <Button
          fullWidth
          variant="contained"
          type="submit"
          sx={{ mt: 4 }}
          size="large"
          loading={loading}
        >
          Create Account
        </Button>
      </form>
    </AuthScreen>
  )
}

export default CompleteSignup

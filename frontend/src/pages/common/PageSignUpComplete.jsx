import { useEffect, useState } from 'react'

import { useNavigate, useSearchParams } from 'react-router'

import { Alert, Button, MenuItem, Stack, TextField } from '@mui/material'

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

        setError(
          "Campus and batch options couldn't load. Refresh the page to try again."
        )
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
      setError('Your sign-up session has expired. Sign in with Google again.')
      return
    }

    if (!form.username.trim() || !form.batch || !form.campus) {
      setError('Enter your name, campus, and batch.')
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
        title="Sign-Up Link Expired"
        subtitle="Your Google sign-up session is missing or has expired. Sign in with Google again to finish creating your account."
      >
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={() => navigate('/signin')}
        >
          Go to Sign In
        </Button>
      </AuthScreen>
    )
  }

  return (
    <AuthScreen
      title="Finish Your Profile"
      subtitle="Your Google account is verified. Add a few details to create your account."
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Stack spacing={2} sx={{ mb: 4 }}>
          <TextField
            fullWidth
            required
            label="Name"
            name="username"
            autoComplete="name"
            value={form.username}
            onChange={handleChange}
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
            disabled={loading || loadingOptions}
            helperText={loadingOptions ? 'Loading campuses…' : undefined}
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
            disabled={loading || loadingOptions}
            helperText={loadingOptions ? 'Loading batches…' : undefined}
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
          disabled={loading || loadingOptions}
        >
          {loading ? 'Creating Account…' : 'Create Account'}
        </Button>
      </form>
    </AuthScreen>
  )
}

export default CompleteSignup

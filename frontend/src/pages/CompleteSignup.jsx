import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'

import '../style/auth.css'

function CompleteSignup() {
  const navigate = useNavigate()
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
        const response = await fetch(
          '/api/auth/google/signup-options'
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to load signup options'
          )
        }

        setOptions({
          campuses: data.campuses || [],
          batches: data.batches || [],
        })
      } catch (error) {
        console.error(
          'Failed to load signup options:',
          error
        )

        setError(
          'Failed to load signup options. Please try again.'
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
      setError(
        'Signup session is missing or expired.'
      )
      return
    }


    if (
      !form.username.trim() ||
      !form.batch ||
      !form.campus
    ) {
      setError(
        'Please complete all required fields.'
      )
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        '/api/auth/google/complete-signup',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          credentials: 'include',

          body: JSON.stringify({
            token,
            username: form.username.trim(),
            batch: form.batch,
            campus: form.campus,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(
          data.error || 'Failed to create account.'
        )
        return
      }


      navigate('/')
    } catch (error) {
      console.error(
        'Complete Google signup error:',
        error
      )

      setError(
        'Network error. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }



  if (!token) {
    return (
      <div className="container">
        <div className="box">
          <h1>Invalid Signup Session</h1>

          <p>
            Your Google signup session is missing
            or has expired.
          </p>

          <Button
            variant="contained"
            onClick={() => navigate('/signin')}
          >
            Back to Sign In
          </Button>
        </div>
      </div>
    )
  }



  if (loadingOptions) {
    return (
      <div className="container">
        <div className="box">
          <h1>Complete Your Profile</h1>

          <p>
            Loading profile options...
          </p>
        </div>
      </div>
    )
  }



  return (
    <div className="container">
      <div className="box">

        <h1>Complete Your Profile</h1>

        <p>
          Your Google account has been verified.
          Complete your profile to create your account.
        </p>

        {error && (
          <p style={{ color: 'red' }}>
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit}>


          <TextField
            fullWidth
            required
            label="Name"
            name="username"
            value={form.username}
            onChange={handleChange}
            margin="normal"
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
            margin="normal"
            disabled={loading}
          >
            {options.campuses.map(campus => (
              <MenuItem
                key={campus._id}
                value={campus._id}
              >
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
            margin="normal"
            disabled={loading}
          >
            {options.batches.map(batch => (
              <MenuItem
                key={batch._id}
                value={batch._id}
              >
                {batch.name}
              </MenuItem>
            ))}
          </TextField>


          <Button
            fullWidth
            variant="contained"
            type="submit"
            disabled={loading}
            sx={{ mt: 2 }}
          >
            {loading
              ? 'Creating Account...'
              : 'Complete Signup'}
          </Button>

        </form>
      </div>
    </div>
  )
}

export default CompleteSignup

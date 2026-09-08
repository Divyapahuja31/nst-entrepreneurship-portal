import { useEffect, useState } from 'react'
import { Form, useActionData } from 'react-router'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import FormHelperText from '@mui/material/FormHelperText'
import Select from '@mui/material/Select'
import { Link } from 'react-router'
import { Typography } from '@mui/material'

import '../style/auth.css'

function SignUp() {
  const action = useActionData()

  const [options, setOptions] = useState({
    campuses: [],
    batches: [],
  })

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
      } finally {
        setLoadingOptions(false)
      }
    }

    loadOptions()
  }, [])

  return (
    <div className="container">
      <div className="box">

        <h1 style={{marginBottom:"10px"}}>Sign Up</h1>



        <Form method="post">


          <TextField
            fullWidth
            error={Boolean(action && action.error?.username)}
            label="Name"
            name="username"
            type="text"
            helperText={
              action &&
              action.error?.username &&
              action.error.username
            }
          />


          <TextField
            fullWidth
            error={Boolean(action && action.error?.email)}
            label="Email"
            name="email"
            type="email"
            helperText={
              action &&
              action.error?.email &&
              action.error.email
            }
          />

          <TextField
            fullWidth
            error={Boolean(action && action.error?.password)}
            label="Password"
            name="password"
            type="password"
            helperText={
              action &&
              action.error?.password &&
              action.error.password
            }
          />

          <FormControl
            fullWidth
            sx={{ mt: 2 }}
            disabled={loadingOptions}
          >
            <InputLabel>Campus</InputLabel>

            <Select
              label="Campus"
              name="campus"
              defaultValue=""
              error={Boolean(action && action.error?.campus)}
            >
              {options.campuses.map(campus => (
                <MenuItem
                  key={campus._id}
                  value={campus._id}
                >
                  {campus.name}
                </MenuItem>
              ))}
            </Select>

            {action && action.error?.campus && (
              <FormHelperText error>
                {action.error.campus}
              </FormHelperText>
            )}
          </FormControl>


          <FormControl
            fullWidth
            sx={{ mt: 2 }}
            disabled={loadingOptions}
          >
            <InputLabel>Batch</InputLabel>

            <Select
              label="Batch"
              name="batch"
              defaultValue=""
              error={Boolean(action && action.error?.batch)}
            >
              {options.batches.map(batch => (
                <MenuItem
                  key={batch._id}
                  value={batch._id}
                >
                  {batch.name}
                </MenuItem>
              ))}
            </Select>

            {action && action.error?.batch && (
              <FormHelperText error>
                {action.error.batch}
              </FormHelperText>
            )}
          </FormControl>



          <Button
            fullWidth
            variant="contained"
            type="submit"
            sx={{ mt: 2 }}
            disabled={loadingOptions}
          >
            Sign Up
          </Button>


          <div
            style={{
              margin: '16px 0',
              textAlign: 'center',
            }}
          >
            OR
          </div>



          <Button
            fullWidth
            variant="outlined"
            type="button"
            onClick={() => {
              window.location.href = '/api/auth/google'
            }}
          >
            Continue with Google
          </Button>

         <Typography> If already have account ? <Link to="/signin">Login</Link></Typography>

        </Form>
      </div>
    </div>
  )
}

export default SignUp

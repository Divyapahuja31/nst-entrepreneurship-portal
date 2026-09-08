import { Form, useActionData } from 'react-router'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import { Link } from 'react-router'
import { Typography } from '@mui/material';

import '../style/auth.css'

function SignIn() {
  const action = useActionData()
  console.log(action)
  return (
    <div className="container">
      <div className="box">
        <h1 style={{marginBottom:"10px"}}>Sign In</h1>
        <p> {action && action.error}</p>

        <Form method="post">
          <TextField
            error={Boolean(action && action.error)}
            label="Email"
            type="email"
            name="email"
          />

          <TextField
            error={Boolean(action && action.error)}
            label="Password"
            type="password"
            name="password"
          />

          <Button fullWidth variant="contained" type="submit" sx={{ mt: 2 }}>
            SignIn
          </Button>
          <div style={{ margin: '5px', textAlign: 'center' }}>
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
        </Form>

        <Typography> Don't have account ? <Link to="/signup">SignUp</Link></Typography>
      </div>
    </div>
  )
}

export default SignIn

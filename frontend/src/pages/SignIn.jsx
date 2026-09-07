import { Form, useActionData } from 'react-router'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'

import '../style/auth.css'

function SignIn() {
  const action = useActionData()
  console.log(action)
  return (
    <div className="container">
      <div className="box">
        <h1>Sign In</h1>
        <h3>
          Access is restricted, Student must be on the approval list; faculty
          are reviewed manually
        </h3>
        <p> {action && action.error}</p>

        <Form method="post">
          <TextField
            error={Boolean(action && action.error)}
            label="Email"
            type="email"
          />

          <TextField
            error={Boolean(action && action.error)}
            label="Password"
            type="password"
          />

          <Button fullWidth variant="contained" type="submit" sx={{ mt: 2 }}>
            Contained
          </Button>
        </Form>
      </div>
    </div>
  )
}

export default SignIn

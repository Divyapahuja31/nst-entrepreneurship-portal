import { Form, useActionData } from 'react-router'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import FormHelperText from '@mui/material/FormHelperText'
import Select from '@mui/material/Select'

import '../style/auth.css'

function SignUp() {
  const action = useActionData()
  console.log(action)
  return (
    <div className="container">
      <div className="box">
        <h1>Sign Up</h1>
        <h3>
          Access is restricted, Student must be on the approval list; faculty
          are reviewed manually
        </h3>
        <Form method="post">
          <div>
            <FormControl fullWidth>
              <InputLabel>Position</InputLabel>
              <Select
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                label="Position"
                error={Boolean(action && action.error?.position)}
                name="position"
              >
                <MenuItem value={'student'}>Student (Founder)</MenuItem>
                <MenuItem value={'faculty'}>Faculty/Staff</MenuItem>
              </Select>
            </FormControl>
            {action && action.error?.position && (
              <FormHelperText sx={{ color: 'error.main' }}>
                {action.error.position}
              </FormHelperText>
            )}
          </div>

          <TextField
            error={Boolean(action && action.error?.username)}
            label="Name"
            name="username"
            type="text"
            helperText={
              action && action.error?.username && action.error.username
            }
          />
          <TextField
            error={Boolean(action && action.error?.email)}
            label="Email"
            name="email"
            type="email"
            helperText={action && action.error?.email && action.error.email}
          />
          <TextField
            error={Boolean(action && action.error?.password)}
            label="Password"
            name="password"
            type="password"
            helperText={
              action && action.error?.password && action.error.password
            }
          />
          <Button fullWidth variant="contained" type="submit" sx={{ mt: 2 }}>
            Contained
          </Button>
        </Form>
      </div>
    </div>
  )
}

export default SignUp

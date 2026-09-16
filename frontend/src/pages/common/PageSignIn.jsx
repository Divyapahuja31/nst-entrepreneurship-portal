import { Form, useActionData, Link } from 'react-router'

import { Button, Divider, Grid, TextField, Typography } from '@mui/material'

import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'

import AuthScreen from '../../components/AuthScreen'

function SignIn() {
  const action = useActionData()

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

        <Form method="post" sx={{ my: 2 }}>
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
              <Button variant="text" type="button" size="large" sx={{ pl: 0 }}>
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
                endIcon={<ArrowForwardRoundedIcon />}
              >
                Sign In
              </Button>
            </Grid>
          </Grid>
        </Form>
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

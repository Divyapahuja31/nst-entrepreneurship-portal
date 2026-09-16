import { Form, useActionData } from 'react-router'
import {
  Button,
  Divider,
  Grid,
  TextField,
  Typography,
} from '@mui/material'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'

import '../style/auth.css'

function SignIn() {
  const action = useActionData()

  return (
    <>
      <Grid container spacing={2} justifyContent="center" sx={{ pt: 4 }}>
        <Grid
          size={{ xs: 10, sm: 8, md: 6, lg: 4 }}
          offset={{ xs: 1, sm: 2, md: 3, lg: 4 }}
        >
          <Grid container>
            <Grid size={12} sx={{ padding: 2 }}>
              <Typography
                variant="h4"
                component="h1"
                gutterBottom
                sx={{ my: 2 }}
              >
                Sign In
              </Typography>

              <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
                Sign in to your account to access the NST Entrepreneurship
                Portal.
              </Typography>
            </Grid>

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
                />

                <TextField
                  error={Boolean(action && action.error)}
                  label="Password"
                  type="password"
                  name="password"
                  fullWidth
                />

                <Grid container sx={{ mt: 1, justifyContent: 'space-between' }}>
                  <Grid size="auto">
                    <Button variant="text" type="button" size="large">
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
              <Button
                fullWidth
                variant="outlined"
                type="button"
                size="large"
                onClick={() => {
                  window.location.href = '/signup'
                }}
              >
                New here? Sign up
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </>
  )
}

export default SignIn

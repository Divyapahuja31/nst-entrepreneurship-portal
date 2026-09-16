import { Grid, Typography } from '@mui/material'

function AuthScreen({ title, subtitle, children }) {
  return (
    <Grid container spacing={2} sx={{ pt: 4 }}>
      <Grid
        size={{ xs: 10, sm: 8, md: 6, lg: 4 }}
        offset={{ xs: 1, sm: 2, md: 3, lg: 4 }}
      >
        <Grid container>
          <Grid size={12} sx={{ padding: 2 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ my: 2 }}>
              {title}
            </Typography>

            <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
              {subtitle}
            </Typography>
          </Grid>

          {children}
        </Grid>
      </Grid>
    </Grid>
  )
}

export default AuthScreen

import { Box, Typography } from '@mui/material'

// One centered card holding the title, a line of context, and the form. On
// phones the card drops its chrome so the form uses the full width.
function AuthScreen({ title, subtitle, children, footer }) {
  return (
    <Box sx={{ width: '100%', maxWidth: 440 }}>
      <Box
        sx={theme => ({
          [theme.breakpoints.up('sm')]: {
            bgcolor: 'background.paper',
            borderRadius: '28px',
            p: 5,
            // Light mode lifts the card with a soft shadow; dark mode has no
            // shadow to see, so a hairline edge does the job.
            ...(theme.palette.mode === 'light'
              ? {
                  boxShadow:
                    '0 2px 8px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.06)',
                }
              : { border: `1px solid ${theme.palette.divider}` }),
          },
        })}
      >
        <Typography variant="h1" sx={{ mb: 1 }}>
          {title}
        </Typography>

        {subtitle && (
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            {subtitle}
          </Typography>
        )}

        {children}
      </Box>

      {footer && (
        <Typography
          color="text.secondary"
          sx={{ mt: 3, textAlign: 'center', fontSize: '0.9375rem' }}
        >
          {footer}
        </Typography>
      )}
    </Box>
  )
}

export default AuthScreen

import { useMemo } from 'react'
import { Outlet } from 'react-router'

import { Box, CssBaseline, Typography, useMediaQuery } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'

import { createAuthTheme } from '../theme/auth'

export default function App() {
  const dark = useMediaQuery('(prefers-color-scheme: dark)')
  const highContrast = useMediaQuery('(prefers-contrast: more)')
  const theme = useMemo(
    () => createAuthTheme({ dark, highContrast }),
    [dark, highContrast]
  )

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />

      <Box
        sx={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          pl: 'env(safe-area-inset-left)',
          pr: 'env(safe-area-inset-right)',
        }}
      >
        <Box
          component="header"
          sx={{
            height: 52,
            mt: 'env(safe-area-inset-top)',
            px: { xs: 2, sm: 3 },
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Typography
            component="span"
            sx={{ fontWeight: 600, letterSpacing: '-0.022em' }}
          >
            NST Entrepreneurship Portal
          </Typography>
        </Box>

        <Box
          component="main"
          sx={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: { xs: 'flex-start', sm: 'center' },
            px: { xs: 2, sm: 3 },
            pt: { xs: 2, sm: 4 },
            pb: 'calc(48px + env(safe-area-inset-bottom))',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </ThemeProvider>
  )
}

import { Outlet } from 'react-router'

import { Box, Typography } from '@mui/material'

import { chromeMaterial } from '../theme'

export default function App() {
  return (
    <Box
      sx={{
        flexGrow: 1,
        minHeight: '100vh',
        bgcolor: { xs: 'background.paper', sm: 'background.default' },
      }}
    >
      {/* Translucent chrome: content scrolls underneath it. */}
      <Box
        component="header"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          height: 48,
          px: { xs: 2, sm: 3 },
          display: 'flex',
          alignItems: 'center',
          ...chromeMaterial,
        }}
      >
        <Typography
          component="div"
          sx={{
            fontSize: '0.9375rem',
            fontWeight: 600,
            letterSpacing: '-0.01em',
          }}
        >
          NST Entrepreneurship Portal
        </Typography>
      </Box>

      <Outlet />
    </Box>
  )
}

import { Outlet } from 'react-router'

import { Box, AppBar, Toolbar, Typography } from '@mui/material'

export default function App() {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            NST Entrepreneurship Portal
          </Typography>
        </Toolbar>
      </AppBar>

      <Outlet />
    </Box>
  )
}

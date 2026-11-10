import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { CssBaseline } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'

import './index.css'

import theme from './theme'

import { router } from './router'
import { useAuthStore } from './stores/auth'

// fetch the auth store from the session cookie before the first render.
useAuthStore.getState().fetchUser()

createRoot(document.getElementById('root')).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <RouterProvider router={router} />
  </ThemeProvider>
)

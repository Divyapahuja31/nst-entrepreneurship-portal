import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'

import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import './index.css'

import { router } from './router'
import { useAuthStore } from './stores/auth'

// fetch the auth store from the session cookie before the first render.
useAuthStore.getState().fetchUser()

createRoot(document.getElementById('root')).render(
  <RouterProvider router={router} />
)

import axios from 'axios'
import { createRoot } from 'react-dom/client'

import { createBrowserRouter, redirect } from 'react-router'
import { RouterProvider } from 'react-router/dom'

import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import './index.css'

import App from './App.jsx'
import EmptyLayout from './layouts/EmptyLayout.jsx'
import MainLayout from './layouts/MainLayout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Kpis from './pages/Kpis.jsx'
import SignIn from './pages/SignIn.jsx'
import SignUp from './pages/SignUp.jsx'

const api = axios.create({ baseURL: '/api', withCredentials: true })

const credentialsAction =
  (path, fallbackError) =>
  async ({ request }) => {
    const formData = await request.formData()
    try {
      await api.post(path, Object.fromEntries(formData))
      return redirect('/')
    } catch (err) {
      if (!err.response) {
        return { error: 'Network error. Try again.' }
      }

      return { error: err.response.data?.error || fallbackError }
    }
  }

const signoutAction = async () => {
  try {
    await api.post('/auth/signout')
    return redirect('/signin')
  } catch (err) {
    if (!err.response) {
      return { error: 'Network error. Try again.' }
    }

    return { error: err.response.data?.error || 'Could not sign out' }
  }
}

const router = createBrowserRouter([
  {
    Component: EmptyLayout,
    children: [
      {
        Component: MainLayout,
        children: [
          { index: true, Component: App },
          { path: 'dashboard', Component: Dashboard },
          { path: 'kpis', Component: Kpis },
        ],
      },
      {
        path: 'signin',
        Component: SignIn,
        action: credentialsAction('/auth/signin', 'Invalid credentials'),
      },
      {
        path: 'signup',
        Component: SignUp,
        action: credentialsAction('/auth/signup', 'Something went wrong'),
      },
      { path: 'signout', action: signoutAction },
    ],
  },
])

createRoot(document.getElementById('root')).render(
  <RouterProvider router={router} />
)

import { createBrowserRouter } from 'react-router'

import App from '../App.jsx'
import EmptyLayout from '../layouts/EmptyLayout.jsx'
import MainLayout from '../layouts/MainLayout.jsx'
import Dashboard from '../pages/Dashboard.jsx'
import Kpis from '../pages/Kpis.jsx'
import SignIn from '../pages/SignIn.jsx'
import SignUp from '../pages/SignUp.jsx'
import Admin from '../pages/admin/Index.jsx'

import { foundersCount, foundersLoader } from '../api/admin.js'
import { credentialsAction, profileLoader, signoutAction } from '../api/auth.js'
import Methodology from '../pages/admin/Methodology.jsx'
import Profile from '../pages/admin/Profile.jsx'
import CompleteSignup from '../pages/CompleteSignup.jsx'

export const router = createBrowserRouter([
  {
    Component: EmptyLayout,
    children: [
      {
        Component: MainLayout,
        loader: profileLoader,
        children: [
          { index: true, Component: App },
          { path: 'dashboard', Component: Dashboard },
          { path: 'kpis', Component: Kpis },
          {
            path: 'admin',
            children: [
              { index: true, Component: Admin, loader: foundersCount },
              {
                path: 'profiles',
                Component: Profile,
                loader: foundersLoader,
              },
              { path: 'methodology', Component: Methodology },
            ],
          },
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
      {
        path: 'complete-signup',
        Component: CompleteSignup,
      },
    ],
  },
])

import { createBrowserRouter } from 'react-router'
import EmptyLayout from '../layouts/EmptyLayout.jsx'
import MainLayout from '../layouts/MainLayout.jsx'
import Dashboard from '../pages/Dashboard.jsx'
import Kpis from '../pages/Kpis.jsx'
import SignIn from '../pages/SignIn.jsx'
import SignUp from '../pages/SignUp.jsx'
import Admin from '../pages/admin/Index.jsx'

import AddFounder from '../components/AddFounder.jsx'

import {
  addFounderAction,
  addFounderLoader,
  foundersCount,
  foundersLoader,
} from '../api/admin.js'
import {
  credentialsAction,
  portfolioLoader,
  signoutAction,
} from '../api/auth.js'
import { biWeeklyLoader } from '../api/biweekly.js'
import BiWeekly from '../pages/admin/BiWeekly.jsx'
import Methodology from '../pages/admin/Methodology.jsx'
import Portfolio from '../pages/admin/Portfolio.jsx'
import CompleteSignup from '../pages/CompleteSignup.jsx'
import { Proposal } from '../pages/student/Proposal.jsx'

export const router = createBrowserRouter([
  {
    Component: EmptyLayout,
    children: [
      {
        Component: MainLayout,
        loader: portfolioLoader,
        children: [
          { index: true, Component: Dashboard },
          { path: 'kpis', Component: Kpis },
          { path: 'proposal', Component: Proposal },
          {
            path: 'admin',
            children: [
              { index: true, Component: Admin, loader: foundersCount },
              {
                path: 'portfolio',
                Component: Portfolio,
                loader: foundersLoader,
              },
              {
                path: 'founders/new',
                Component: AddFounder,
                loader: addFounderLoader,
                action: addFounderAction,
              },
              {
                path: 'biweekly',
                Component: BiWeekly,
                loader: biWeeklyLoader,
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

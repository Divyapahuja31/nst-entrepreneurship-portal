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
  portfolioAction,
  biWeeklyLoader,
  profileAction,
} from '../api/admin.js'
import { kpisLoader, kpisAction } from '../api/kpi.js'
import {
  credentialsAction,
  portfolioLoader,
  signoutAction,
} from '../api/auth.js'
import Methodology from '../pages/admin/Methodology.jsx'
import Portfolio from '../pages/admin/Portfolio.jsx'
import Profile from '../pages/admin/Profile.jsx'
import CompleteSignup from '../pages/CompleteSignup.jsx'
import { Proposal } from '../pages/student/Proposal.jsx'
import {
  proposalLoader,
  proposalAction,
} from '../api/proposal.js'

export const router = createBrowserRouter([
  {
    Component: EmptyLayout,
    children: [
      {
        Component: MainLayout,
        loader: portfolioLoader,
        children: [
          { index: true, Component: Dashboard },
          {
            path: 'kpis',
            Component: Kpis,
            loader: kpisLoader,
            action: kpisAction,
          },
          { path: 'proposal', Component: Proposal, loader: proposalLoader, action: proposalAction, },
          {
            path: 'profile/:userid',
            Component: Profile,
            loader: biWeeklyLoader,
            action: profileAction,
          },
          {
            path: 'admin',
            children: [
              { index: true, Component: Admin, loader: foundersCount },
              {
                path: 'portfolio',
                Component: Portfolio,
                loader: foundersLoader,
                action: portfolioAction,
              },
              {
                path: 'founders/new',
                Component: AddFounder,
                loader: addFounderLoader,
                action: addFounderAction,
              },
              { path: 'methodology', Component: Methodology },
              {
                path: 'profile/:userid',
                Component: Profile,
                loader: biWeeklyLoader,
                action: profileAction,
              },
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

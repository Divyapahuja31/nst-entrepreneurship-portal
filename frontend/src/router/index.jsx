import { createBrowserRouter } from 'react-router'
import EmptyLayout from '../layouts/EmptyLayout.jsx'
import MainLayout from '../layouts/MainLayout.jsx'

import Dashboard from '../pages/Dashboard.jsx'
import Kpis from '../pages/Kpis.jsx'
import SignIn from '../pages/SignIn.jsx'
import SignUp from '../pages/SignUp.jsx'
import CompleteSignup from '../pages/CompleteSignup.jsx'
import { Proposal } from '../pages/student/Proposal.jsx'
import Admin from '../pages/admin/Index.jsx'
import Portfolio from '../pages/admin/Portfolio.jsx'
import Profile from '../pages/admin/Profile.jsx'
import Methodology from '../pages/admin/Methodology.jsx'
import AddFounder from '../components/AddFounder.jsx'
import {
  credentialsAction,
  portfolioLoader,
  signoutAction,
} from '../api/auth.js'

import { kpisLoader, kpisAction } from '../api/kpi.js'
import { proposalLoader, proposalAction } from '../api/proposal.js'
import {
  addFounderAction,
  addFounderLoader,
  biWeeklyLoader,
  foundersCount,
  foundersLoader,
  portfolioAction,
  profileAction,
} from '../api/admin.js'

export const router = createBrowserRouter([
  {
    Component: MainLayout,
    loader: portfolioLoader,
    path: '/',
    children: [
      {
        path: '/',
        index: true,
        Component: Dashboard,
      },
      {
        path: '/kpis',
        Component: Kpis,
        loader: kpisLoader,
        action: kpisAction,
      },
      {
        path: '/proposal',
        Component: Proposal,
        loader: proposalLoader,
        action: proposalAction,
      },
      {
        path: '/methodology',
        Component: Methodology,
      },
      {
        path: '/profile/:userid',
        Component: Profile,
        loader: biWeeklyLoader,
        action: profileAction,
      },
    ],
  },

  {
    Component: EmptyLayout,
    children: [
      {
        path: '/signin',
        Component: SignIn,
        action: credentialsAction('/auth/signin', 'Invalid credentials'),
      },
      {
        path: '/signup',
        Component: SignUp,
        action: credentialsAction('/auth/signup', 'Something went wrong'),
      },
      {
        path: '/signout',
        action: signoutAction,
      },
      {
        path: '/complete-signup',
        Component: CompleteSignup,
      },
    ],
  },

  {
    path: '/admin',
    Component: MainLayout,
    loader: portfolioLoader,
    children: [
      {
        path: '/admin',
        index: true,
        Component: Admin,
        loader: foundersCount,
      },
      {
        path: '/admin/portfolio',
        Component: Portfolio,
        loader: foundersLoader,
        action: portfolioAction,
      },
      {
        path: '/admin/founders/new',
        Component: AddFounder,
        loader: addFounderLoader,
        action: addFounderAction,
      },

      {
        path: '/admin/profile/:userid',
        Component: Profile,
        loader: biWeeklyLoader,
        action: profileAction,
      },
    ],
  },
])

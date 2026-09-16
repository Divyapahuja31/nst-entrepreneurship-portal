import { createBrowserRouter } from 'react-router'

import EmptyLayout from '../layouts/EmptyLayout.jsx'
import MainLayout from '../layouts/MainLayout.jsx'

// Student pages

import PageStudentOverview from '../pages/student/PageOverview.jsx'
import PageOnboarding from '../pages/student/PageOnboarding.jsx'
import PageKPIs from '../pages/student/PageKPIs.jsx'
import PageCreateProposal from '../pages/student/PageCreateProposal.jsx'

// Admin pages
import PageAdminOverview from '../pages/admin/PageOverview.jsx'
import PagePortfolios from '../pages/admin/PagePortfolios.jsx'
import PageFounders from '../pages/admin/PageFounders.jsx'
import PageReportBiWeekly from '../pages/admin/PageReportBiWeekly.jsx'
import Venture from '../pages/admin/Venture.jsx'

// Common pages
import PageSignIn from '../pages/common/PageSignIn.jsx'
import PageSignUp from '../pages/common/PageSignUp.jsx'
import PageSignUpComplete from '../pages/common/PageSignUpComplete.jsx'
import PageMethodology from '../pages/common/PageMethodology.jsx'

import PageAllPages from '../pages/common/PageAllPages.jsx'
import PageError, { PageNotFound } from '../pages/common/PageError.jsx'

// TODO: make this a pop up modal instead of a page
import AddFounder from '../components/AddFounder.jsx'

// TODO: clean up unnecessary actions by writing them as functions in the component itself instead of in the router. The router should only be used for routing and data fetching, not for handling actions that are specific to a component.
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
  ventureLoader,
} from '../api/admin.js'

export const router = createBrowserRouter([
  {
    Component: MainLayout,
    ErrorBoundary: PageError,
    children: [
      {
        path: '/',
        index: true,
        Component: PageStudentOverview,
      },
      {
        path: '/onboarding',
        Component: PageOnboarding,
      },
      {
        path: '/kpis',
        Component: PageKPIs,
        loader: kpisLoader,
        // action: kpisAction,
      },
      {
        path: '/create-proposal',
        Component: PageCreateProposal,
        loader: proposalLoader,
        // action: proposalAction,
      },
      {
        path: '/methodology',
        Component: PageMethodology,
      },
      {
        path: '/profile/:userid',
        Component: PageReportBiWeekly,
        loader: biWeeklyLoader,
        // action: profileAction,
      },
    ],
  },

  {
    Component: EmptyLayout,
    ErrorBoundary: PageError,
    children: [
      {
        path: '/signin',
        Component: PageSignIn,
      },
      {
        path: '/signup',
        Component: PageSignUp,
      },
      {
        path: '/complete-signup',
        Component: PageSignUpComplete,
      },
    ],
  },

  {
    Component: MainLayout,
    ErrorBoundary: PageError,
    children: [
      {
        path: '/admin',
        index: true,
        Component: PageAdminOverview,
        loader: foundersCount,
      },
      {
        path: '/admin/founders',
        Component: PageFounders,
        loader: foundersLoader,
        // action: portfolioAction,
      },
      {
        path: '/admin/venture',
        Component: Venture,
        loader: ventureLoader,
      },
      {
        path: '/admin/portfolio',
        Component: PagePortfolios,
        loader: foundersLoader,
        // action: portfolioAction,
      },
      {
        path: '/admin/founders/new',
        Component: AddFounder,
        loader: addFounderLoader,
        // action: addFounderAction,
      },

      {
        path: '/admin/profile/:userid',
        Component: PageReportBiWeekly,
        loader: biWeeklyLoader,
        // action: profileAction,
      },
    ],
  },

  {
    Component: MainLayout,
    ErrorBoundary: PageError,
    children: [
      {
        path: '/test/all-pages',
        Component: PageAllPages,
      },
    ],
  },

  {
    path: '*',
    Component: MainLayout,
    children: [
      {
        path: '*',
        Component: PageNotFound,
      },
    ],
  },
])

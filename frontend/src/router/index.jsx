import { createBrowserRouter, redirect } from 'react-router'
import { ROLE_NAMES, ROLES, STAFF_ROLES } from '@nst/shared/permissions.js'

import EmptyLayout from '../layouts/EmptyLayout.jsx'
import MainLayout from '../layouts/MainLayout.jsx'

// Student pages

import PageStudentOverview from '../pages/student/PageOverview.jsx'
import PageOnboarding, {
  OnboardingSignOut,
} from '../pages/student/PageOnboarding.jsx'
import PageKPIs from '../pages/student/PageKPIs.jsx'

// Admin pages
import PageAdminOverview from '../pages/admin/PageOverview.jsx'
import PagePortfolios from '../pages/admin/PagePortfolios.jsx'
import PageFounderProfile from '../pages/admin/PageFounderProfile.jsx'
import PageAdminKPIs from '../pages/admin/PageKPIs.jsx'
import PageReportBiWeekly from '../pages/admin/PageReportBiWeekly.jsx'
import PageVentures from '../pages/admin/PageVentures.jsx'
import PageVentureDetail from '../pages/admin/PageVentureDetail.jsx'
import PageAccounts from '../pages/admin/PageAccounts.jsx'

// Common pages
import PageSignIn from '../pages/common/PageSignIn.jsx'
import PageSignUp from '../pages/common/PageSignUp.jsx'
import PageSignUpComplete from '../pages/common/PageSignUpComplete.jsx'
import PageForgotPassword from '../pages/common/PageForgotPassword.jsx'
import PageMethodology from '../pages/common/PageMethodology.jsx'

import PageError, { PageNotFound } from '../pages/common/PageError.jsx'
import RequireAuth from '../components/RequireAuth.jsx'
import RequireOnboarded from '../components/RequireOnboarded.jsx'
import RequireRole from '../components/RequireRole.jsx'

// TODO: make this a pop up modal instead of a page
import AddFounder from '../components/AddFounder.jsx'

// Routes carry loaders only. Actions live in the components that trigger them,
// calling the API directly and revalidating the loader afterwards.
import { allKPIsLoader, kpisLoader } from '../api/kpi.js'
import {
  addFounderLoader,
  founderProfileLoader,
  foundersCount,
  foundersLoader,
} from '../api/admin.js'
import { biWeeklyLoader } from '../api/biweekly.js'
import { ventureDetailLoader, venturesPageLoader } from '../api/venture.js'
import { accountsLoader } from '../api/accounts.js'
import { whenAuthReady } from '../stores/auth.js'

// Runs a route's loader only for the roles RequireRole lets through, once
// the session is confirmed. Anyone else gets no data, so RequireRole can
// explain why instead of the API's 403 replacing the page.
const forRoles = (allow, loader) => async args => {
  const { user } = await whenAuthReady()
  return allow.includes(user?.role?.name) ? loader(args) : null
}
const studentLoader = loader => forRoles([ROLES.STUDENT], loader)
const staffLoader = loader => forRoles(STAFF_ROLES, loader)

export const router = createBrowserRouter([
  // Public: the only routes a signed-out visitor may reach.
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
      {
        path: '/forgot-password',
        Component: PageForgotPassword,
      },
      {
        path: '/reset-password',
        Component: PageForgotPassword,
      },
    ],
  },

  // Signed in.
  {
    ErrorBoundary: PageError,
    Component: RequireAuth,
    children: [
      // Full page, no sidebar: a student has to finish this first.
      {
        element: <EmptyLayout action={<OnboardingSignOut />} />,
        children: [
          {
            path: '/onboarding',
            Component: PageOnboarding,
          },
        ],
      },
      {
        Component: RequireOnboarded,
        children: [
          {
            Component: MainLayout,
            children: [
              // Students only; MainLayout sends staff from / to /admin.
              {
                element: <RequireRole allow={[ROLES.STUDENT]} />,
                children: [
                  {
                    path: '/',
                    index: true,
                    Component: PageStudentOverview,
                  },
                  {
                    path: '/kpis',
                    Component: PageKPIs,
                    loader: studentLoader(kpisLoader),
                  },
                  {
                    path: '/biweekly',
                    Component: PageReportBiWeekly,
                    loader: studentLoader(biWeeklyLoader),
                  },
                  // Bi-weekly reports used to live under the student's id.
                  {
                    path: '/profile/:userid',
                    loader: () => redirect('/biweekly'),
                  },
                ],
              },
              {
                element: <RequireRole allow={ROLE_NAMES} />,
                children: [
                  {
                    path: '/methodology',
                    Component: PageMethodology,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  // Signed in as staff. Mentors see only the startups assigned to them; the
  // API applies the same limits.
  {
    ErrorBoundary: PageError,
    element: <RequireRole allow={STAFF_ROLES} />,
    children: [
      {
        Component: MainLayout,
        children: [
          {
            path: '/admin',
            index: true,
            Component: PageAdminOverview,
            loader: staffLoader(foundersCount),
          },
          {
            path: '/admin/founders',
            Component: PagePortfolios,
            loader: staffLoader(foundersLoader),
          },
          {
            path: '/admin/kpis',
            Component: PageAdminKPIs,
            loader: staffLoader(allKPIsLoader),
          },
          {
            path: '/admin/venture',
            Component: PageVentures,
            loader: staffLoader(venturesPageLoader),
          },
          {
            path: '/admin/venture/:ventureId',
            Component: PageVentureDetail,
            loader: staffLoader(ventureDetailLoader),
          },
          {
            path: '/admin/portfolio',
            Component: PagePortfolios,
            loader: staffLoader(foundersLoader),
          },
          {
            path: '/admin/founders/new',
            Component: AddFounder,
            loader: staffLoader(addFounderLoader),
          },
          {
            path: '/admin/profile/:userid',
            Component: PageFounderProfile,
            loader: staffLoader(founderProfileLoader),
          },
          {
            element: <RequireRole allow={[ROLES.ADMIN]} />,
            children: [
              {
                path: '/admin/accounts',
                Component: PageAccounts,
                loader: forRoles([ROLES.ADMIN], accountsLoader),
              },
            ],
          },
        ],
      },
    ],
  },

  {
    path: '*',
    Component: PageNotFound,
  },
])

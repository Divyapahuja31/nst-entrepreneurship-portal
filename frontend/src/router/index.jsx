import { createBrowserRouter } from 'react-router'

import App from '../App.jsx'
import EmptyLayout from '../layouts/EmptyLayout.jsx'
import MainLayout from '../layouts/MainLayout.jsx'
import Dashboard from '../pages/Dashboard.jsx'
import Kpis from '../pages/Kpis.jsx'
import SignIn from '../pages/SignIn.jsx'
import SignUp from '../pages/SignUp.jsx'
import Admin from '../pages/admin/Index.jsx'

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
              { index: true, Component: Admin },
              {
                path: 'profiles',
                Component: Profile,
                loader: async () => {
                  const campus = ['ADYPU', 'RU']
                  const stage = [
                    'Idea',
                    'Validation',
                    'Mvp',
                    'Pilot',
                    'Revenue',
                    'Scale',
                  ]
                  const status = [
                    'On Track',
                    'Watch',
                    'At Risk',
                    'No reviews yet',
                  ]
                  const students = [
                    {
                      founder: 'Kanishk',
                      startup: 'Newton School',
                      campus: 'RU',
                      stage: 'IDEA',
                      team: 15,
                      score: null,
                      status: null,
                    },
                    {
                      founder: 'Krit Garg',
                      startup: 'Persistent AI',
                      campus: 'ADYPU',
                      stage: 'IDEA',
                      team: 2,
                      score: null,
                      status: null,
                    },
                    {
                      founder: 'Pathan Amaan',
                      startup: 'Vyapaar Express / LayerX',
                      campus: 'ADYPU',
                      stage: 'MVP',
                      team: 4,
                      score: null,
                      status: null,
                    },
                    {
                      founder: 'MANISH BALAYAN',
                      startup: 'Vyapaar Express / LayerX',
                      campus: 'ADYPU',
                      stage: 'IDEA',
                      team: 4,
                      score: null,
                      status: null,
                    },
                    {
                      founder: 'Vansh Dagar',
                      startup: 'Vyapaar Express / LayerX',
                      campus: 'ADYPU',
                      stage: 'IDEA',
                      team: 4,
                      score: null,
                      status: null,
                    },
                    {
                      founder: 'Bhavya Jain',
                      startup: 'NYX',
                      campus: 'ADYPU',
                      stage: 'IDEA',
                      team: 2,
                      score: null,
                      status: null,
                    },
                    {
                      founder: 'Atharv Paharia',
                      startup: 'NYX',
                      campus: 'ADYPU',
                      stage: 'IDEA',
                      team: 2,
                      score: null,
                      status: null,
                    },
                    {
                      founder: 'Arkapravo Rajkonwar',
                      startup: 'Klyth',
                      campus: 'ADYPU',
                      stage: 'IDEA',
                      team: 2,
                      score: null,
                      status: null,
                    },
                    {
                      founder: 'Soham Saranga',
                      startup: 'Klyth',
                      campus: 'ADYPU',
                      stage: 'IDEA',
                      team: 2,
                      score: null,
                      status: null,
                    },
                    {
                      founder: 'Ashu Choudhary',
                      startup: 'Persistent AI',
                      campus: 'ADYPU',
                      stage: 'IDEA',
                      team: 2,
                      score: null,
                      status: null,
                    },
                    {
                      founder: 'SAHIL KHAN',
                      startup: 'RESTART / Jinni',
                      campus: 'ADYPU',
                      stage: 'IDEA',
                      team: 1,
                      score: null,
                      status: null,
                    },
                  ]

                  return { students, campus, stage, status }
                },
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

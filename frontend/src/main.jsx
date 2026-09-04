import {createRoot} from 'react-dom/client'

import {createBrowserRouter} from 'react-router'
import {RouterProvider} from 'react-router/dom'

import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import './index.css'

import App from './App.jsx'
import EmptyLayout from './layouts/EmptyLayout.jsx'
import MainLayout from './layouts/MainLayout.jsx'

const router = createBrowserRouter([
  {
    Component: EmptyLayout,
    children: [
      {Component: MainLayout, children: [{index: true, Component: App}]},
    ],
  },
])

createRoot(document.getElementById('root')).render(
  <RouterProvider router={router} />
)

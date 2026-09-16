import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuthStore } from '../stores/auth'
import AuthLoading from './AuthLoading'

// Route guard: nothing below it renders until we know who the caller is, and
// an anonymous caller never reaches the page at all.
export default function RequireAuth() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const isLoading = useAuthStore(state => state.isLoading)
  const location = useLocation()

  if (isLoading) {
    return <AuthLoading />
  }

  if (!isAuthenticated) {
    // Remember where they were headed so sign-in can send them back.
    return <Navigate to="/signin" replace state={{ from: location }} />
  }

  return <Outlet />
}

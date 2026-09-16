import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuthStore } from '../stores/auth'
import AuthLoading from './AuthLoading'
import { ErrorView } from '../pages/common/PageError'

// Route guard for a role. An anonymous caller is sent to sign in; a signed-in
// caller with the wrong role gets 403 rather than a redirect, so they are not
// bounced somewhere confusing.
export default function RequireRole({ role }) {
  const user = useAuthStore(state => state.user)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const isLoading = useAuthStore(state => state.isLoading)
  const location = useLocation()

  if (isLoading) {
    return <AuthLoading />
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace state={{ from: location }} />
  }

  if (user?.role?.name !== role) {
    return <ErrorView status={403} />
  }

  return <Outlet />
}

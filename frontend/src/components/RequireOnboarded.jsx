import { Navigate, Outlet } from 'react-router'

import { needsOnboarding, useAuthStore } from '../stores/auth'

// Until a student belongs to a startup, every page sends them to onboarding.
export default function RequireOnboarded() {
  const user = useAuthStore(state => state.user)

  if (needsOnboarding(user)) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}

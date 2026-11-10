import { Navigate, Outlet, useLocation } from 'react-router'
import { ROLE_LABELS } from '@nst/shared/permissions.js'

import useAccess from '../hooks/useAccess'
import { useAuthStore } from '../stores/auth'
import AuthLoading from './AuthLoading'
import { ErrorView } from '../pages/common/PageError'

const listRoles = roles => {
  const labels = roles.map(role => ROLE_LABELS[role])
  return labels.length > 1
    ? `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}`
    : labels[0]
}

// Route guard for the roles in `allow`. An anonymous caller is sent to sign
// in; a signed-in caller without a role, or with another role, is told why
// rather than bounced somewhere confusing. The API checks the same roles.
export default function RequireRole({ allow }) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const isLoading = useAuthStore(state => state.isLoading)
  const { role } = useAccess()
  const location = useLocation()

  if (isLoading) {
    return <AuthLoading />
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace state={{ from: location }} />
  }

  if (!role) {
    return (
      <ErrorView
        status={403}
        title="No role assigned"
        detail="This account has no role yet. Ask an administrator to assign one."
      />
    )
  }

  if (!allow.includes(role)) {
    return (
      <ErrorView
        status={403}
        title="Restricted"
        detail={`This page is for ${listRoles(allow)} accounts. You are signed in as ${ROLE_LABELS[role]}.`}
      />
    )
  }

  return <Outlet />
}

import {
  isAdmin,
  isBoard,
  isMentor,
  isRole,
  isStaff,
  isStudent,
} from '@nst/shared/permissions.js'

import { useAuthStore } from '../stores/auth'

// The signed-in user as an actor for the @nst/shared permission rules.
// These only decide what to show: the API enforces the same rules.
export const actorOf = user =>
  user ? { id: String(user._id ?? user.id), role: user.role?.name } : null

export default function useAccess() {
  const user = useAuthStore(state => state.user)
  const actor = actorOf(user)
  const role = isRole(actor?.role) ? actor.role : null

  return {
    actor,
    role,
    isStudent: isStudent(actor),
    isMentor: isMentor(actor),
    isStaff: isStaff(actor),
    isBoard: isBoard(actor),
    isAdmin: isAdmin(actor),
  }
}

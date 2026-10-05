import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuthStore } from '../stores/auth'
import { signOut } from '../api/auth'

// Signs out on the server, then clears the local session.
export default function useSignOut() {
  const logout = useAuthStore(state => state.logout)
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState(null)

  const handleSignOut = async () => {
    setSigningOut(true)
    setSignOutError(null)
    const result = await signOut()
    setSigningOut(false)
    if (result.error) {
      setSignOutError(result.error)
      return
    }
    logout()
    navigate('/signin')
  }

  return { signingOut, signOutError, handleSignOut }
}

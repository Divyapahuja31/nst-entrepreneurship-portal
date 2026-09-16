import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { api } from '../api/client'

export const useAuthStore = create(
  persist(
    set => ({
      // State
      isAuthenticated: false,
      isLoading: true, // Start as true to check local tokens on boot
      user: null,

      // Actions
      login: userData => {
        set({
          isAuthenticated: true,
          user: userData,
          isLoading: false,
        })
      },
      logout: () => {
        set({
          isAuthenticated: false,
          user: null,
          isLoading: false,
        })
      },
      setLoading: isLoading => {
        set({ isLoading })
      },
      fetchUser: async () => {
        set({ isLoading: true })
        try {
          const response = await api.get('/auth/portfolio', {
            credentials: 'include',
          })
          set({
            isAuthenticated: true,
            user: response.data,
            isLoading: false,
          })
        } catch (error) {
          set({
            isAuthenticated: false,
            user: null,
            isLoading: false,
          })
          console.error('Error fetching user:', error)
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserInfo } from '../types/auth.types'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: UserInfo | null
  isLoggedIn: boolean
}

interface AuthActions {
  setTokens: (accessToken: string, refreshToken: string) => void
  setUser: (user: UserInfo) => void
  logout: () => void
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isLoggedIn: false,

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isLoggedIn: true }),

      setUser: (user) => set({ user }),

      logout: () =>
        set({ accessToken: null, refreshToken: null, user: null, isLoggedIn: false }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isLoggedIn: state.isLoggedIn,
      }),
    },
  ),
)

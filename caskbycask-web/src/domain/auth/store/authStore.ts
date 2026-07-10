import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AttendanceResult, UserInfo } from '../types/auth.types'

interface AuthState {
  // access token은 만료 시간이 짧으므로 localStorage에 저장하지 않고 메모리에만 둔다.
  accessToken: string | null
  user: UserInfo | null
  isLoggedIn: boolean
  isAuthReady: boolean
  // 로그인 직후 출석 토스트 표시용. 비영구 상태라 localStorage에 저장하지 않는다.
  pendingAttendanceToast: AttendanceResult | null
}

interface AuthActions {
  setAccessToken: (accessToken: string) => void
  setUser: (user: UserInfo) => void
  setAuthReady: (ready: boolean) => void
  logout: () => void
  setPendingAttendanceToast: (result: AttendanceResult | null) => void
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isLoggedIn: false,
      isAuthReady: false,
      pendingAttendanceToast: null,

      setAccessToken: (accessToken) =>
        set({ accessToken, isLoggedIn: true }),

      setUser: (user) => set({ user }),

      setAuthReady: (ready) => set({ isAuthReady: ready }),

      logout: () =>
        set({
          accessToken: null,
          user: null,
          isLoggedIn: false,
          isAuthReady: true,
          pendingAttendanceToast: null,
        }),

      setPendingAttendanceToast: (result) =>
        set({ pendingAttendanceToast: result }),
    }),
    {
      name: 'auth-storage',
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as Partial<AuthState> | undefined
        const user = state?.user ?? null
        return {
          user,
          isLoggedIn: Boolean(state?.isLoggedIn || user),
          accessToken: null,
          isAuthReady: false,
        }
      },
      partialize: (state) => ({
        user: state.user,
        isLoggedIn: state.isLoggedIn,
      }),
    },
  ),
)

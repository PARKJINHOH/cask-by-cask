import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AttendanceResult, UserInfo } from '../types/auth.types'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: UserInfo | null
  isLoggedIn: boolean
  // 로그인 후 출석 토스트 표시용 — localStorage에 저장하지 않음
  pendingAttendanceToast: AttendanceResult | null
}

interface AuthActions {
  setTokens: (accessToken: string, refreshToken: string) => void
  setUser: (user: UserInfo) => void
  logout: () => void
  setPendingAttendanceToast: (result: AttendanceResult | null) => void
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isLoggedIn: false,
      pendingAttendanceToast: null,

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isLoggedIn: true }),

      setUser: (user) => set({ user }),

      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isLoggedIn: false,
          pendingAttendanceToast: null,
        }),

      setPendingAttendanceToast: (result) =>
        set({ pendingAttendanceToast: result }),
    }),
    {
      name: 'auth-storage',
      // pendingAttendanceToast는 비영구 상태 — 제외
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isLoggedIn: state.isLoggedIn,
      }),
    },
  ),
)

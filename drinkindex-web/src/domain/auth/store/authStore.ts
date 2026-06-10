import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AttendanceResult, UserInfo } from '../types/auth.types'

interface AuthState {
  // accessToken 만 JS 가 보유(헤더용). refresh 토큰은 httpOnly 쿠키에만 존재 → JS 접근 불가.
  accessToken: string | null
  user: UserInfo | null
  isLoggedIn: boolean
  // 로그인 후 출석 토스트 표시용 — localStorage에 저장하지 않음
  pendingAttendanceToast: AttendanceResult | null
}

interface AuthActions {
  setAccessToken: (accessToken: string) => void
  setUser: (user: UserInfo) => void
  logout: () => void
  setPendingAttendanceToast: (result: AttendanceResult | null) => void
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isLoggedIn: false,
      pendingAttendanceToast: null,

      setAccessToken: (accessToken) =>
        set({ accessToken, isLoggedIn: true }),

      setUser: (user) => set({ user }),

      logout: () =>
        set({
          accessToken: null,
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
        user: state.user,
        isLoggedIn: state.isLoggedIn,
      }),
    },
  ),
)

import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { authApi } from '../api/authApi'
import type { LoginRequest, LoginResponse, ReactivateRequest, SignupRequest } from '../types/auth.types'

export function useAuth() {
  const { setAccessToken, setUser, setAuthReady, setPendingAttendanceToast, logout: logoutStore } = useAuthStore()
  const qc = useQueryClient()

  // 토큰 적재 + 출석 토스트 + 프로필 로드 (login / reactivate 공통)
  // refresh 토큰은 응답 바디에 없고 httpOnly 쿠키로 자동 저장됨 → access 토큰만 적재.
  const establishSession = async (loginData: LoginResponse) => {
    qc.removeQueries({ queryKey: ['me'] })
    setAccessToken(loginData.accessToken)

    // 출석 결과 저장 — MainLayout의 AttendanceToastHandler가 소비 후 제거
    if (loginData.attendance && !loginData.attendance.alreadyChecked) {
      setPendingAttendanceToast(loginData.attendance)
    }

    const meRes = await authApi.getMe()
    if (meRes.data.data) {
      setUser(meRes.data.data)
      qc.setQueryData(['me'], meRes.data.data)
    }
    setAuthReady(true)

    // 로그인 후 이전 세션 캐시 초기화 → 알림·쪽지 즉시 최신화
    qc.invalidateQueries({ queryKey: ['notifications'] })
    qc.invalidateQueries({ queryKey: ['messages'] })
  }

  const login = async (data: LoginRequest) => {
    const res = await authApi.login(data)
    await establishSession(res.data.data!)
  }

  // 휴면 계정 해제 후 로그인
  const reactivate = async (data: ReactivateRequest) => {
    const res = await authApi.reactivate(data)
    await establishSession(res.data.data!)
  }

  const signup = (data: SignupRequest) => authApi.signup(data)

  // 소셜 로그인/가입 완료 응답으로 세션 수립 (콜백·소셜가입 페이지에서 사용)
  const establishOAuthSession = (loginData: LoginResponse) => establishSession(loginData)

  const logout = async () => {
    try {
      await authApi.logout()
    } finally {
      logoutStore()
      qc.removeQueries({ queryKey: ['me'] })
      qc.removeQueries({ queryKey: ['socialAccounts'] })
      qc.removeQueries({ queryKey: ['blockedUsers'] })
    }
  }

  return { login, reactivate, signup, logout, establishOAuthSession }
}

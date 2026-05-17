import { useAuthStore } from '../store/authStore'
import { authApi } from '../api/authApi'
import type { LoginRequest, SignupRequest } from '../types/auth.types'

export function useAuth() {
  const { setTokens, setUser, setPendingAttendanceToast, logout: logoutStore } = useAuthStore()

  const login = async (data: LoginRequest) => {
    const res = await authApi.login(data)
    const loginData = res.data.data!
    setTokens(loginData.accessToken, loginData.refreshToken)

    // 출석 결과 저장 — MainLayout의 AttendanceToastHandler가 소비 후 제거
    if (loginData.attendance && !loginData.attendance.alreadyChecked) {
      setPendingAttendanceToast(loginData.attendance)
    }

    const meRes = await authApi.getMe()
    if (meRes.data.data) setUser(meRes.data.data)
  }

  const signup = (data: SignupRequest) => authApi.signup(data)

  const logout = async () => {
    try {
      await authApi.logout()
    } finally {
      logoutStore()
    }
  }

  return { login, signup, logout }
}

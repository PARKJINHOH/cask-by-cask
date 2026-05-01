import { useAuthStore } from '../store/authStore'
import { authApi } from '../api/authApi'
import type { LoginRequest, SignupRequest } from '../types/auth.types'

export function useAuth() {
  const { setTokens, setUser, logout: logoutStore } = useAuthStore()

  const login = async (data: LoginRequest) => {
    const res = await authApi.login(data)
    const tokens = res.data.data!
    setTokens(tokens.accessToken, tokens.refreshToken)
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

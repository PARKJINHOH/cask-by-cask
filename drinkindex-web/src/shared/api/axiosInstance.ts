import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/domain/auth/store/authStore'
import type { ApiResponse } from '@/shared/types/common.types'
import type { TokenResponse } from '@/domain/auth/types/auth.types'

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ── 요청 인터셉터: accessToken 자동 첨부 ─────────────────────
axiosInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── 응답 인터셉터: 401 시 토큰 재발급 ────────────────────────
let isRefreshing = false
type QueueItem = { resolve: (value: string) => void; reject: (err: unknown) => void }
let failedQueue: QueueItem[] = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token!)
  })
  failedQueue = []
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    // 이미 재발급 중이면 큐에 대기
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`
        return axiosInstance(original)
      })
    }

    original._retry = true
    isRefreshing = true

    const { refreshToken, setTokens, logout } = useAuthStore.getState()

    if (!refreshToken) {
      logout()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    try {
      const { data } = await axios.post<ApiResponse<TokenResponse>>(
        `${import.meta.env.VITE_API_BASE_URL}/api/auth/refresh`,
        { refreshToken },
      )
      const { accessToken: newAccess, refreshToken: newRefresh } = data.data!
      setTokens(newAccess, newRefresh)
      processQueue(null, newAccess)
      original.headers.Authorization = `Bearer ${newAccess}`
      return axiosInstance(original)
    } catch (refreshErr) {
      processQueue(refreshErr)
      logout()
      window.location.href = '/login'
      return Promise.reject(refreshErr)
    } finally {
      isRefreshing = false
    }
  },
)

export default axiosInstance

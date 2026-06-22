import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/domain/auth/store/authStore'
import type { ApiResponse } from '@/shared/types/common.types'
import type { TokenResponse } from '@/domain/auth/types/auth.types'

// 빌드 시 VITE_API_BASE_URL 미설정이면 빈 문자열 → nginx 상대경로(/api) 프록시 사용.
// (운영/개발 서버는 .env 없이 빌드되므로 undefined 가 되어 'undefined/api/...' 로
//  깨지는 것을 방지)
const getApiBaseUrl = () => {
  if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) {
    // @ts-ignore
    return import.meta.env.VITE_API_BASE_URL
  }
  return ''
}
const API_BASE_URL = getApiBaseUrl()

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // refresh 토큰 httpOnly 쿠키 송수신을 위해 자격증명 포함.
  // (쿠키 Path=/api/auth 이므로 실제로 쿠키가 실리는 요청은 인증 엔드포인트뿐)
  withCredentials: true,
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

    const { isLoggedIn, setAccessToken, logout } = useAuthStore.getState()

    if (!isLoggedIn) {
      // 미인증 상태에서 보호된 엔드포인트 접근 — refresh 시도 없이 거부만 처리
      return Promise.reject(error)
    }

    original._retry = true
    isRefreshing = true

    try {
      // refresh 토큰은 httpOnly 쿠키로 자동 전송됨 → 바디 없이 호출(withCredentials).
      const { data } = await axios.post<ApiResponse<TokenResponse>>(
        `${API_BASE_URL}/api/auth/refresh`,
        {},
        { withCredentials: true },
      )
      const { accessToken: newAccess } = data.data!
      setAccessToken(newAccess)
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

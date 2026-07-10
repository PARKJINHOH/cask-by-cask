import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/domain/auth/store/authStore'
import type { ApiResponse } from '@/shared/types/common.types'
import type { TokenResponse } from '@/domain/auth/types/auth.types'

// 빌드 시 API URL이 없으면 nginx 상대 경로(/api)를 사용한다.
const getApiBaseUrl = () => {
  if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  // @ts-ignore Vite 호환 빌드 지원
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) {
    // @ts-ignore Vite 호환 빌드 지원
    return import.meta.env.VITE_API_BASE_URL
  }
  return ''
}
const API_BASE_URL = getApiBaseUrl()

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // refresh token은 httpOnly 쿠키로 전달되므로 인증 요청에 쿠키를 포함한다.
  withCredentials: true,
})

let refreshPromise: Promise<string> | null = null

export function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise

  refreshPromise = axios
    .post<ApiResponse<TokenResponse>>(
      `${API_BASE_URL}/api/auth/refresh`,
      {},
      { withCredentials: true },
    )
    .then(({ data }) => {
      const newAccess = data.data?.accessToken
      if (!newAccess) {
        throw new Error('Access token refresh response is empty.')
      }
      useAuthStore.getState().setAccessToken(newAccess)
      return newAccess
    })
    .catch((error) => {
      useAuthStore.getState().logout()
      throw error
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

axiosInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

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

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`
        return axiosInstance(original)
      })
    }

    const { isLoggedIn } = useAuthStore.getState()

    if (!isLoggedIn) {
      return Promise.reject(error)
    }

    original._retry = true
    isRefreshing = true

    try {
      const newAccess = await refreshAccessToken()
      processQueue(null, newAccess)
      original.headers.Authorization = `Bearer ${newAccess}`
      return axiosInstance(original)
    } catch (refreshErr) {
      processQueue(refreshErr)
      return Promise.reject(refreshErr)
    } finally {
      isRefreshing = false
    }
  },
)

export default axiosInstance

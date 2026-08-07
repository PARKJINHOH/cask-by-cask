import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/domain/auth/store/authStore'
import type { ApiResponse } from '@/shared/types/common.types'
import type { TokenResponse } from '@/domain/auth/types/auth.types'
import { queryClient } from '@/shared/api/queryClient'
import { clearSessionQueryCache } from '@/shared/api/sessionQueryCache.js'

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

// 다른 탭이 먼저 회전시킨 쿠키가 우리 요청보다 늦게 심어졌을 수 있어 재시도 전에 잠깐 기다린다.
const REFRESH_RETRY_DELAY_MS = 400

function statusOf(error: unknown): number | undefined {
  return (error as AxiosError | undefined)?.response?.status
}

/** 재발급 요청 1회. refresh 쿠키만 쓰므로 인터셉터가 없는 순수 axios 로 보낸다. */
async function requestRefresh(): Promise<string> {
  const { data } = await axios.post<ApiResponse<TokenResponse>>(
    `${API_BASE_URL}/api/auth/refresh`,
    {},
    { withCredentials: true },
  )
  const newAccess = data.data?.accessToken
  if (!newAccess) {
    throw new Error('Access token refresh response is empty.')
  }
  return newAccess
}

async function runRefresh(): Promise<string> {
  try {
    return await requestRefresh()
  } catch (error) {
    // 서버는 사용자당 refresh 토큰을 하나만 두고 재발급마다 회전시킨다.
    // 탭 여러 개가 동시에 재발급하면 진 쪽은 이미 회전된(=낡은) 쿠키를 보내 401 을 받는데,
    // 그 시점의 쿠키는 이긴 탭이 새로 심어 준 유효한 값이므로 한 번 더 시도하면 성공한다.
    // 세션이 정말 끝났다면 재시도도 401 이라 판정이 늦어지지 않는다.
    if (statusOf(error) !== 401) throw error
    await new Promise((resolve) => setTimeout(resolve, REFRESH_RETRY_DELAY_MS))
    return await requestRefresh()
  }
}

export function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise

  refreshPromise = runRefresh()
    .then((newAccess) => {
      useAuthStore.getState().setAccessToken(newAccess)
      return newAccess
    })
    .catch(async (error) => {
      // 서버가 세션을 실제로 거부한 경우(401/403)에만 로그아웃한다.
      // 절전 복귀 직후의 네트워크 단절·타임아웃·5xx 는 세션이 끝난 게 아니라 잠깐 못 닿은 것이라
      // 여기서 로그아웃 + 캐시 초기화까지 해 버리면 멀쩡한 화면이 통째로 비어 버린다.
      // 토큰은 그대로 만료 상태로 두면 다음 401 에서 다시 재발급을 시도해 스스로 복구된다.
      const status = statusOf(error)
      if (status === 401 || status === 403) {
        useAuthStore.getState().logout()
        await clearSessionQueryCache(queryClient)
      }
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

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined

    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    if (!useAuthStore.getState().isLoggedIn) {
      return Promise.reject(error)
    }

    original._retry = true

    // refreshAccessToken 이 동시 호출을 하나의 요청으로 합쳐 주므로 별도 대기 큐가 필요 없다.
    // (예전의 isRefreshing/failedQueue 조합은 큐에 들어간 요청에 _retry 를 달지 않아
    //  재시도가 또 401 이면 재발급을 반복할 수 있었다.)
    const newAccess = await refreshAccessToken()
    original.headers.Authorization = `Bearer ${newAccess}`
    return axiosInstance(original)
  },
)

export default axiosInstance

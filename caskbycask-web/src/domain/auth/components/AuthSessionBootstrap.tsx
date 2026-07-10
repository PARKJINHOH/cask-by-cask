import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/domain/auth/api/authApi'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { refreshAccessToken } from '@/shared/api/axiosInstance'

export default function AuthSessionBootstrap() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let cancelled = false

    const restoreSession = async () => {
      const { isLoggedIn, setAuthReady } = useAuthStore.getState()

      if (!isLoggedIn) {
        queryClient.removeQueries({ queryKey: ['me'] })
        setAuthReady(true)
        return
      }

      try {
        await refreshAccessToken()
        const meRes = await authApi.getMe()
        const profile = meRes.data.data

        if (cancelled) return
        if (profile) {
          useAuthStore.getState().setUser(profile)
          queryClient.setQueryData(['me'], profile)
        }
      } catch {
        queryClient.removeQueries({ queryKey: ['me'] })
      } finally {
        if (!cancelled) {
          useAuthStore.getState().setAuthReady(true)
        }
      }
    }

    if (useAuthStore.persist.hasHydrated()) {
      void restoreSession()
      return () => {
        cancelled = true
      }
    }

    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      void restoreSession()
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [queryClient])

  return null
}

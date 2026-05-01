import { useQuery } from '@tanstack/react-query'
import { userApi } from '../api/userApi'
import { useAuthStore } from '@/domain/auth/store/authStore'

export function useMe() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  return useQuery({
    queryKey: ['me'],
    queryFn: () => userApi.getMe().then((res) => res.data.data!),
    enabled: isLoggedIn,
  })
}

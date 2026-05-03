import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userApi } from '../api/userApi'
import { useAuthStore } from '@/domain/auth/store/authStore'
import type { UpdateNicknameRequest, UpdatePasswordRequest } from '../types/user.types'

export function useMe() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  return useQuery({
    queryKey: ['me'],
    queryFn: () => userApi.getMe().then((res) => res.data.data!),
    enabled: isLoggedIn,
  })
}

export function useUpdateNickname() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateNicknameRequest) => userApi.updateNickname(data),
    onSuccess: (res) => {
      const profile = res.data.data!
      const { user } = useAuthStore.getState()
      if (user) {
        useAuthStore.getState().setUser({ ...user, nickname: profile.nickname })
      }
      queryClient.setQueryData(['me'], profile)
    },
  })
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: (data: UpdatePasswordRequest) => userApi.updatePassword(data),
  })
}

export function useDeleteMe() {
  return useMutation({
    mutationFn: () => userApi.deleteMe(),
    onSuccess: () => {
      useAuthStore.getState().logout()
    },
  })
}

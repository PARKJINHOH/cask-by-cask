import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userApi } from '../api/userApi'
import { useAuthStore } from '@/domain/auth/store/authStore'
import type { UpdateNicknameRequest, UpdatePasswordRequest } from '../types/user.types'

export function useUploadProfileImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => userApi.uploadProfileImage(file),
    onSuccess: (res) => {
      const profile = res.data.data!
      const { user } = useAuthStore.getState()
      if (user) {
        useAuthStore.getState().setUser({ ...user, profileImageUrl: profile.profileImageUrl })
      }
      queryClient.setQueryData(['me'], profile)
    },
  })
}

export function useDeleteProfileImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => userApi.deleteProfileImage(),
    onSuccess: (res) => {
      const profile = res.data.data!
      const { user } = useAuthStore.getState()
      if (user) {
        useAuthStore.getState().setUser({ ...user, profileImageUrl: null })
      }
      queryClient.setQueryData(['me'], profile)
    },
  })
}

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

export function useResetPassword() {
  return useMutation({
    mutationFn: () => userApi.resetPassword(),
  })
}

export function useFixNickname() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => userApi.fixNickname(),
    onSuccess: (res) => {
      const profile = res.data.data!
      queryClient.setQueryData(['me'], profile)
    },
  })
}

export function useUpdateEmailSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (emailSubscribed: boolean) => userApi.updateEmailSubscription(emailSubscribed),
    onSuccess: (res) => {
      const profile = res.data.data!
      queryClient.setQueryData(['me'], profile)
    },
  })
}

export function useBlockedUsers() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  return useQuery({
    queryKey: ['blockedUsers'],
    queryFn: () => userApi.getBlockedUsers().then((res) => res.data.data ?? []),
    enabled: isLoggedIn,
  })
}

export function useUnblockUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) => userApi.unblockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] })
      // 차단 해제 시 목록/댓글에 다시 노출되도록 갱신
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['comments'] })
    },
  })
}

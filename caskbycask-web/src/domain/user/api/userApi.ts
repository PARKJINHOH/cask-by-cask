import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'
import type { BlockedUser, UpdateNicknameRequest, UpdatePasswordRequest, UserProfile, SocialAccountsResponse } from '../types/user.types'
import type { OAuthCodeRequest } from '@/domain/auth/types/auth.types'

export const userApi = {
  getMe: () =>
    axiosInstance.get<ApiResponse<UserProfile>>('/api/users/me'),

  updateNickname: (data: UpdateNicknameRequest) =>
    axiosInstance.patch<ApiResponse<UserProfile>>('/api/users/me', data),

  updatePassword: (data: UpdatePasswordRequest) =>
    axiosInstance.patch<ApiResponse<null>>('/api/users/me/password', data),

  deleteMe: () =>
    axiosInstance.delete<ApiResponse<null>>('/api/users/me'),

  resetPassword: () =>
    axiosInstance.post<ApiResponse<null>>('/api/users/me/reset-password'),

  fixNickname: () =>
    axiosInstance.post<ApiResponse<UserProfile>>('/api/users/me/fix-nickname'),

  uploadProfileImage: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return axiosInstance.post<ApiResponse<UserProfile>>('/api/users/me/profile-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  deleteProfileImage: () =>
    axiosInstance.delete<ApiResponse<UserProfile>>('/api/users/me/profile-image'),

  updateEmailSubscription: (emailSubscribed: boolean) =>
    axiosInstance.patch<ApiResponse<UserProfile>>('/api/users/me/email-subscription', { emailSubscribed }),

  verifyAdult: (birthDate: string) =>
    axiosInstance.post<ApiResponse<UserProfile>>('/api/users/me/adult-verification', { birthDate }),

  // ── 차단 ──────────────────────────────────────────────────
  getBlockedUsers: () =>
    axiosInstance.get<ApiResponse<BlockedUser[]>>('/api/users/me/blocks'),

  unblockUser: (userId: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/users/${userId}/block`),

  // ── 소셜 연동 ───────────────────────────────────────────────
  getSocialAccounts: () =>
    axiosInstance.get<ApiResponse<SocialAccountsResponse>>('/api/users/me/social'),

  connectSocial: (data: OAuthCodeRequest) =>
    axiosInstance.post<ApiResponse<SocialAccountsResponse>>('/api/users/me/social/connect', data),

  linkSocial: (linkTicket: string) =>
    axiosInstance.post<ApiResponse<SocialAccountsResponse>>('/api/users/me/social/link', { linkTicket }),

  unlinkSocial: (provider: string) =>
    axiosInstance.delete<ApiResponse<SocialAccountsResponse>>(`/api/users/me/social/${provider}`),
}

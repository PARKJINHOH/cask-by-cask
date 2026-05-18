import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'
import type { UpdateNicknameRequest, UpdatePasswordRequest, UserProfile } from '../types/user.types'

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
}

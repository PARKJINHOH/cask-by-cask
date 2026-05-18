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
}

import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'
import type { LoginRequest, LoginResponse, SignupRequest, UserInfo } from '../types/auth.types'

export const authApi = {
  login: (data: LoginRequest) =>
    axiosInstance.post<ApiResponse<LoginResponse>>('/api/auth/login', data),

  signup: (data: SignupRequest) =>
    axiosInstance.post<ApiResponse<UserInfo>>('/api/auth/signup', data),

  logout: () =>
    axiosInstance.post<ApiResponse<null>>('/api/auth/logout'),

  getMe: () =>
    axiosInstance.get<ApiResponse<UserInfo>>('/api/users/me'),
}

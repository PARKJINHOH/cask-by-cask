import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'
import type { LoginRequest, LoginResponse, SignupRequest, UserInfo, VerifyEmailRequest, CheckAvailableResponse, ReactivateRequest } from '../types/auth.types'

export const authApi = {
  login: (data: LoginRequest) =>
    axiosInstance.post<ApiResponse<LoginResponse>>('/api/auth/login', data),

  signup: (data: SignupRequest) =>
    axiosInstance.post<ApiResponse<UserInfo>>('/api/auth/signup', data),

  reactivate: (data: ReactivateRequest) =>
    axiosInstance.post<ApiResponse<LoginResponse>>('/api/auth/reactivate', data),

  logout: () =>
    axiosInstance.post<ApiResponse<null>>('/api/auth/logout'),

  getMe: () =>
    axiosInstance.get<ApiResponse<UserInfo>>('/api/users/me'),

  checkEmailAvailable: (email: string) =>
    axiosInstance.get<ApiResponse<CheckAvailableResponse>>('/api/auth/check-email', { params: { email } }),

  checkNicknameAvailable: (nickname: string) =>
    axiosInstance.get<ApiResponse<CheckAvailableResponse>>('/api/auth/check-nickname', { params: { nickname } }),

  sendVerificationCode: (email: string) =>
    axiosInstance.post<ApiResponse<null>>('/api/auth/send-verification', { email }),

  verifyEmail: (data: VerifyEmailRequest) =>
    axiosInstance.post<ApiResponse<null>>('/api/auth/verify-email', data),
}

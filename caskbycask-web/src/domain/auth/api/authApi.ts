import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'
import type { LoginRequest, LoginResponse, SignupRequest, UserInfo, VerifyEmailRequest, CheckAvailableResponse, ReactivateRequest, FindEmailResponse, PasswordResetVerifyRequest, PasswordResetConfirmRequest, OAuthAuthorizeUrlResponse, OAuthCallbackResponse, OAuthCodeRequest, OAuthSignupRequest, AdminCredentials } from '../types/auth.types'

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

  findEmail: (nickname: string) =>
    axiosInstance.post<ApiResponse<FindEmailResponse>>('/api/auth/find-email', { nickname }),

  sendPasswordResetCode: (email: string) =>
    axiosInstance.post<ApiResponse<null>>('/api/auth/password-reset/send-code', { email }),

  verifyPasswordResetCode: (data: PasswordResetVerifyRequest) =>
    axiosInstance.post<ApiResponse<null>>('/api/auth/password-reset/verify-code', data),

  confirmPasswordReset: (data: PasswordResetConfirmRequest) =>
    axiosInstance.post<ApiResponse<null>>('/api/auth/password-reset/confirm', data),

  // ── 소셜 로그인(OAuth2) ───────────────────────────────────────
  getOAuthAuthorizeUrl: (provider: string, redirectUri: string) =>
    axiosInstance.post<ApiResponse<OAuthAuthorizeUrlResponse>>('/api/auth/oauth/authorize-url', { provider, redirectUri }),

  oauthCallback: (data: OAuthCodeRequest) =>
    axiosInstance.post<ApiResponse<OAuthCallbackResponse>>('/api/auth/oauth/callback', data),

  oauthSignup: (data: OAuthSignupRequest) =>
    axiosInstance.post<ApiResponse<LoginResponse>>('/api/auth/oauth/signup', data),

  getAdminCredentials: () =>
    axiosInstance.get<ApiResponse<AdminCredentials>>('/api/auth/admin-credentials'),
}


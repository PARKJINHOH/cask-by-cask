export type UserRole = 'ADMIN' | 'MEMBER' | 'DISTILLERY'

export interface UserInfo {
  id: number
  email: string
  nickname: string
  role: UserRole
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface SignupRequest {
  email: string
  password: string
  nickname: string
}

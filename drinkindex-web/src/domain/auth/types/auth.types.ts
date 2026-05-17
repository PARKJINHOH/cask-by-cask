export type UserRole = 'ADMIN' | 'MEMBER' | 'DISTILLERY'

export interface UserInfo {
  id: number
  email: string
  nickname: string
  role: UserRole
  currentLevel?: number
  maturingPower?: number
  distilleryLogoUrl?: string
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
}

export type StreakBonus = 'NONE' | 'STREAK_7' | 'STREAK_30'

export interface AttendanceResult {
  alreadyChecked: boolean
  isFirst: boolean
  streakCount: number
  bonusAwarded: StreakBonus
  totalMaturingPower: number
}

export interface LoginResponse extends TokenResponse {
  attendance: AttendanceResult
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

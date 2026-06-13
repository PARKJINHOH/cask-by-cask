export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'MEMBER' | 'PARTNER'

export type AdminMenuKey =
  | 'SPIRIT_REQUESTS'
  | 'SPIRITS'
  | 'PRODUCER_REQUESTS'
  | 'PRODUCERS'

export interface UserInfo {
  id: number
  email: string
  nickname: string
  role: UserRole
  currentLevel?: number
  maturingPower?: number
  producerLogoUrl?: string
  nicknameFixed?: boolean
  profileImageUrl?: string | null
  allowedMenus?: AdminMenuKey[]
  passwordChangeRequired?: boolean
  mustChangePassword?: boolean
}

// refresh 토큰은 httpOnly 쿠키로만 전달되므로 JS 가 다루는 응답에는 포함되지 않는다.
export interface TokenResponse {
  accessToken: string
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
  passwordChangeRequired: boolean
  mustChangePassword: boolean
}

export interface ReactivateRequest {
  email: string
  password: string
  code: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface SignupRequest {
  email: string
  password: string
  nickname: string
  agreedToTerms: boolean
  agreedToPrivacy: boolean
  emailSubscribed: boolean
}

export interface VerifyEmailRequest {
  email: string
  code: string
}

export interface CheckAvailableResponse {
  available: boolean
}

export interface FindEmailResponse {
  maskedEmail: string
}

export interface PasswordResetVerifyRequest {
  email: string
  code: string
}

export interface PasswordResetConfirmRequest {
  email: string
  code: string
  newPassword: string
}

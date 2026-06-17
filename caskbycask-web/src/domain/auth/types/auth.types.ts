export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MODERATOR'
  | 'MEMBER'
  | 'PARTNER'
  | 'DISTILLERY_STAFF'
  | 'IMPORTER'

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
  /** 접근 허용 메뉴 키(라우트 path) — 비관리자 역할 전용 */
  allowedMenus?: string[]
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

// ── 소셜 로그인(OAuth2) ─────────────────────────────────────────
export type SocialProvider = 'NAVER' | 'GOOGLE'

export interface OAuthAuthorizeUrlResponse {
  authorizeUrl: string
}

export type OAuthCallbackStatus = 'LOGIN' | 'NEEDS_SIGNUP' | 'NEEDS_LINK'

export interface OAuthCallbackResponse {
  status: OAuthCallbackStatus
  // LOGIN
  login: LoginResponse | null
  // NEEDS_SIGNUP
  signupTicket: string | null
  email: string | null
  emailVerified: boolean
  suggestedNickname: string | null
  // NEEDS_LINK
  linkTicket: string | null
  maskedEmail: string | null
}

export interface OAuthCodeRequest {
  provider: string
  code: string
  state: string
  redirectUri: string
}

export interface OAuthSignupRequest {
  signupTicket: string
  nickname: string
  email?: string
  emailCode?: string
  agreedToTerms: boolean
  agreedToPrivacy: boolean
  emailSubscribed: boolean
}

export interface AdminCredentials {
  email: string
  password: string
}


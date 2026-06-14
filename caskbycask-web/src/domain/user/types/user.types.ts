export interface UserProfile {
  id: number
  email: string
  nickname: string
  role: string
  createdAt: string
  maturingPower?: number
  currentLevel?: number
  consecutiveAttendance?: number
  nicknameFixed?: boolean
  nicknameChangedAt?: string | null
  profileImageUrl?: string | null
  profileImageChangedAt?: string | null
  emailSubscribed?: boolean
  passwordChangeRequired?: boolean
  mustChangePassword?: boolean
  adultVerified?: boolean
  adultVerifiedAt?: string | null
}

export interface BlockedUser {
  userId: number
  nickname: string
  role: string
  currentLevel?: number
  maturingPower?: number
  nicknameFixed?: boolean
  profileImageUrl?: string | null
  blockedAt: string
}

export interface UpdateNicknameRequest {
  nickname: string
}

export interface UpdatePasswordRequest {
  currentPassword: string
  newPassword: string
}

// ── 소셜 연동 ───────────────────────────────────────────────────
export type SocialProvider = 'NAVER' | 'GOOGLE'

export interface SocialAccount {
  provider: SocialProvider
  email: string | null
  linkedAt: string
}

export interface SocialAccountsResponse {
  accounts: SocialAccount[]
  // false 이면서 연동이 1개뿐이면 마지막 로그인 수단이라 해제 불가
  hasPassword: boolean
}

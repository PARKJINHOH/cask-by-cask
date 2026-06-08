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

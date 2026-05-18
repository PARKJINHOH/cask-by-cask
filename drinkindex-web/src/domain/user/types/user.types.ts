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
}

export interface UpdateNicknameRequest {
  nickname: string
}

export interface UpdatePasswordRequest {
  currentPassword: string
  newPassword: string
}

import type { SpiritCategory, SpiritStatus } from '@/domain/spirit/types/spirit.types'

// ── Users ──────────────────────────────────────────────────────
export type AdminUserRole = 'ADMIN' | 'MEMBER' | 'DISTILLERY'

export interface AdminUser {
  id: number
  email: string
  nickname: string
  role: AdminUserRole
  isActive: boolean
  distilleryId: number | null
  distilleryNameKo: string | null
  createdAt: string
}

export interface ChangeRoleRequest {
  role: AdminUserRole
  distilleryId?: number | null
}

export interface AdminUserSearchParams {
  keyword?: string
  role?: AdminUserRole
  isActive?: boolean
  page?: number
  size?: number
}

// ── Spirits ────────────────────────────────────────────────────
export interface AdminSpiritItem {
  id: number
  nameKo: string
  nameEn: string
  category: SpiritCategory
  country: string | null
  abv: number | null
  avgScore: number | null
  reviewCount: number
  primaryImageUrl: string | null
  status: SpiritStatus
}

export interface AdminSpiritImageItem {
  id: number
  imageUrl: string
  isPrimary: boolean
  sortOrder: number
}

export interface AdminSpiritDetail {
  id: number
  nameKo: string
  nameEn: string
  category: SpiritCategory
  distilleryId: number | null
  distilleryNameKo: string | null
  distilleryNameEn: string | null
  bottler: string | null
  bottledYear: number | null
  vintageYear: number | null
  abv: number | null
  volumeMl: number | null
  country: string | null
  region: string | null
  avgScore: number | null
  reviewCount: number
  status: SpiritStatus
  images: AdminSpiritImageItem[]
  createdAt: string
  updatedAt: string
}

export interface UpdateSpiritPayload {
  nameKo?: string
  nameEn?: string
  category?: SpiritCategory
  distilleryId?: number | null
  bottler?: string | null
  bottledYear?: number | null
  vintageYear?: number | null
  abv?: number | null
  volumeMl?: number | null
  country?: string | null
  region?: string | null
}

export interface CreateSpiritPayload {
  nameKo: string
  nameEn: string
  category: SpiritCategory
  distilleryId?: number | null
  bottler?: string | null
  bottledYear?: number | null
  vintageYear?: number | null
  abv?: number | null
  volumeMl?: number | null
  country?: string | null
  region?: string | null
}

// ── Register Requests ──────────────────────────────────────────
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface SpiritRegisterRequestDetail {
  id: number
  requesterId: number
  requesterNickname: string
  nameKo: string
  nameEn: string
  category: SpiritCategory
  distilleryId: number | null
  distilleryNameKo: string | null
  bottler: string | null
  bottledYear: number | null
  vintageYear: number | null
  abv: number | null
  volumeMl: number | null
  country: string | null
  region: string | null
  imageUrls: string[]
  status: RequestStatus
  rejectReason: string | null
  createdAt: string
  reviewedAt: string | null
}

export interface UpdateRequestBody {
  nameKo: string
  nameEn: string
  category: SpiritCategory
  distilleryId?: number | null
  bottler?: string | null
  bottledYear?: number | null
  vintageYear?: number | null
  abv?: number | null
  volumeMl?: number | null
  country?: string | null
  region?: string | null
}

export interface SpiritRegisterRequest {
  id: number
  nameKo: string
  nameEn: string
  category: SpiritCategory
  status: RequestStatus
  rejectReason: string | null
  createdAt: string
  reviewedAt: string | null
}

// ── Reports ────────────────────────────────────────────────────
export type ReportStatus = 'PENDING' | 'RESOLVED' | 'DISMISSED'
export type ReportTargetType = 'REVIEW' | 'COMMENT' | 'IMAGE'

export interface AdminReport {
  id: number
  reporterId: number
  reporterNickname: string
  targetType: ReportTargetType
  targetId: number
  reason: string | null
  status: ReportStatus
  targetContent: string | null
  createdAt: string
}

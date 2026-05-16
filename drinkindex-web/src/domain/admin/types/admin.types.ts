import type {
  SpiritCategory, SpiritStatus,
  SpiritCommonDetailResponse, WhiskyDetailResponse, WineDetailResponse,
  CognacDetailResponse,
} from '@/domain/spirit/types/spirit.types'

// ── 폼용 Detail Request 타입 ─────────────────────────────────
export interface SpiritCommonDetailRequest {
  isNas?: boolean
  ageStatement?: number | null
  distilledDate?: string | null
  bottledDate?: string | null
  releaseDate?: string | null
  volumeMl?: number | null
  abv?: number | null
  bottleNo?: string | null
  batchNo?: string | null
  totalBottles?: number | null
}

export interface GrapeVarietyRequest { name: string; percentage: number | null }

export interface WhiskyDetailRequest {
  style?: string | null
  bottlingType?: string | null
  caskType?: string | null
  maturationStyle?: string | null
  finishCaskType?: string | null
  isNonChillFiltered?: boolean | null
  isNaturalColour?: boolean | null
  isSingleCask?: boolean | null
  isCaskStrength?: boolean | null
  isPeated?: boolean | null
  phenolPpm?: number | null
  caskNo?: string | null
  finishCaskDetail?: string | null
}

export interface WineDetailRequest {
  wineType?: string | null
  vintage?: number | null
  isOakAged?: boolean | null
  isNaturalWine?: boolean | null
  certification?: string | null
  grapeVarieties?: GrapeVarietyRequest[] | null
  appellationDesignation?: string | null
  soilType?: string | null
  altitudeM?: number | null
  harvestMethod?: string | null
  fermentationVessel?: string | null
  oakType?: string | null
  oakAgedMonths?: number | null
}

export interface CognacDetailRequest {
  grade?: string | null
  cru?: string | null
  isFineChampagne?: boolean | null
  blendDetail?: string | null
}

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
  commonDetail: SpiritCommonDetailResponse | null
  whiskyDetail: WhiskyDetailResponse | null
  wineDetail: WineDetailResponse | null
  cognacDetail: CognacDetailResponse | null
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
  commonDetail?: SpiritCommonDetailRequest
  whiskyDetail?: WhiskyDetailRequest
  wineDetail?: WineDetailRequest
  cognacDetail?: CognacDetailRequest
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
  commonDetail?: SpiritCommonDetailRequest
  whiskyDetail?: WhiskyDetailRequest
  wineDetail?: WineDetailRequest
  cognacDetail?: CognacDetailRequest
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

// ── Community Admin ────────────────────────────────────────────
export type PostReportAdminStatus = 'PENDING' | 'RESOLVED' | 'DISMISSED'

export interface PostReportAdmin {
  id: number
  postId: number | null
  postTitle: string | null
  reporterNickname: string
  reason: string | null
  status: PostReportAdminStatus
  createdAt: string
}

export interface BadWord {
  id: number
  word: string
  isActive: boolean
  createdAt: string
}

export interface EmojiGroup {
  id: number
  name: string
  sortOrder: number
  isActive: boolean
  createdAt: string
}

export interface EmojiAdmin {
  id: number
  groupId: number | null
  groupName: string | null
  code: string
  unicode: string | null
  imageUrl: string | null
  label: string
  isActive: boolean
  sortOrder: number
  createdAt: string
}

export interface PostPrefixAdmin {
  id: number
  boardType: 'NOTICE' | 'FREE'
  name: string
  colorHex: string | null
  isActive: boolean
  sortOrder: number
}

import type {
  SpiritCategory, SpiritStatus,
  SpiritCommonDetailResponse, WhiskyDetailResponse, WineDetailResponse,
  CognacDetailResponse, OtherDetailResponse,
  WhiskyStyle, WineType, CognacGrade, OtherSpiritType,
} from '@/domain/spirit/types/spirit.types'

// ── 폼용 Detail Request 타입 ─────────────────────────────────
export interface SpiritCommonDetailRequest {
  isNas?: boolean
  ageStatement?: number | null
  ageStatementMonths?: number | null
  ageStatementMin?: number | null
  ageStatementMinMonths?: number | null
  ageStatementMax?: number | null
  ageStatementMaxMonths?: number | null
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
  styleOther?: string | null
  brandName?: string | null
  bottlingType?: string | null
  caskTypes?: string[] | null
  caskFinishes?: string[] | null
  caskTypeOther?: string | null
  caskDetails?: Record<string, string[]> | null
  isNonChillFiltered?: boolean | null
  isNaturalColour?: boolean | null
  isSingleCask?: boolean | null
  isCaskStrength?: boolean | null
  isPeated?: boolean | null
  phenolPpm?: number | null
  phenolPpmMin?: number | null
  phenolPpmMax?: number | null
  caskNo?: string | null
  notes?: string | null
}

export interface CreateVariantRequest {
  variantType: 'BATCH' | 'RELEASE_YEAR' | 'SINGLE_CASK'
  variantValue: string
  variantValueEn?: string | null
  seriesIdentifier: string
  seriesIdentifierEn?: string | null
  abv?: number | null
  abvMin?: number | null
  abvMax?: number | null
  volumeMl?: number | null
  volumeMlMin?: number | null
  volumeMlMax?: number | null
  commonDetail?: SpiritCommonDetailRequest
  whiskyDetail?: WhiskyDetailRequest
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
  sweetness?: string | null
  body?: string | null
  acidity?: string | null
  tannin?: string | null
}

export interface CognacDetailRequest {
  grade?: string | null
  cru?: string | null
  isFineChampagne?: boolean | null
  blendDetail?: string | null
  vintageYear?: number | null
  ageYears?: number | null
  oakType?: string | null
  caskFinish?: string | null
}

export interface OtherDetailRequest {
  otherType?: string | null
  mainIngredient?: string | null
  productionMethod?: string | null
  notes?: string | null
  styleClassification?: string | null
  caskType?: string | null
  originDesignation?: string | null
}

// ── Users ──────────────────────────────────────────────────────
export type AdminUserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MODERATOR'
  | 'MEMBER'
  | 'PARTNER'
  | 'DISTILLERY_STAFF'
  | 'IMPORTER'

/** 회원 상세 역할 Select 에 노출되는 할당 가능 역할 (SUPER_ADMIN/MODERATOR 제외) */
export const ASSIGNABLE_ROLES: AdminUserRole[] = ['MEMBER', 'PARTNER', 'DISTILLERY_STAFF', 'IMPORTER', 'ADMIN']

export const ROLE_LABELS: Record<AdminUserRole, string> = {
  SUPER_ADMIN: '운영자',
  ADMIN: '관리자',
  MODERATOR: '모더레이터',
  MEMBER: '회원',
  PARTNER: '파트너',
  DISTILLERY_STAFF: '증류소 관계자',
  IMPORTER: '수입사',
}

export type BoardType = 'NOTICE' | 'FREE'

export const BOARD_TYPE_LABELS: Record<BoardType, string> = {
  NOTICE: '공지 게시판',
  FREE: '자유 게시판',
}

export const ALL_BOARD_TYPES: BoardType[] = ['FREE']

// ── AdminUser ──────────────────────────────────────────────────
export type SignupMethod = 'EMAIL' | 'NAVER' | 'GOOGLE'

export interface AdminUser {
  id: number
  email: string
  nickname: string
  role: AdminUserRole
  isActive: boolean
  producerId: number | null
  producerNameKo: string | null
  createdAt: string
  signupMethod: SignupMethod
  suspendedUntil: string | null
  suspendReason: string | null
  description: string | null
  /** 접근 허용 메뉴 키(라우트 path) 목록 */
  allowedMenus: string[] | null
  boardPermissions: BoardType[] | null
}

export interface UpdateBoardPermissionsRequest {
  boardTypes: BoardType[]
}

// ── AdminLog ───────────────────────────────────────────────────
export type AdminLogType =
  | 'CONTENT_HIDE'
  | 'CONTENT_RESTORE'
  | 'ROLE_CHANGE'
  | 'ACCOUNT_SUSPEND'
  | 'ACCOUNT_DELETE'

export type AdminLogTargetType = 'POST' | 'COMMENT' | 'USER'

export const ADMIN_LOG_TYPE_LABELS: Record<AdminLogType, string> = {
  CONTENT_HIDE:    '게시글/댓글 숨김',
  CONTENT_RESTORE: '게시글/댓글 복구',
  ROLE_CHANGE:     '역할 변경',
  ACCOUNT_SUSPEND: '계정 정지',
  ACCOUNT_DELETE:  '계정 삭제',
}

export const ADMIN_LOG_CATEGORY: Record<string, AdminLogType[]> = {
  커뮤니티: ['CONTENT_HIDE', 'CONTENT_RESTORE'],
  회원:     ['ROLE_CHANGE', 'ACCOUNT_SUSPEND', 'ACCOUNT_DELETE'],
}

export interface AdminLog {
  id: number
  logType: AdminLogType
  logTypeLabel: string
  actorId: number
  actorEmail: string
  targetType: AdminLogTargetType
  targetId: number
  targetUserEmail: string | null
  summary: string
  detail: string | null
  createdAt: string
}

export interface AdminLogSearchParams {
  logTypes?: AdminLogType[]
  actorEmail?: string
  from?: string
  to?: string
  page?: number
  size?: number
}

export interface ChangeRoleRequest {
  role: AdminUserRole
  description?: string | null
  producerId?: number | null
  allowedMenus: string[]
}

export interface SuspendUserRequest {
  days: number
  reason: string
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
  seriesIdentifier?: string | null
  seriesIdentifierEn?: string | null
  category: SpiritCategory
  country: string | null
  abv: number | null
  avgScore: number | null
  reviewCount: number
  primaryImageUrl: string | null
  style?: string | null
  styleOther?: string | null
  viewCount?: number
  status: SpiritStatus
}

export interface AdminSpiritImageItem {
  id: number
  imageUrl: string
  isPrimary: boolean
  sortOrder: number
}

/** 관리자 연관 술(다른 배치·병입) 목록 항목 — origin: 이름 자동(AUTO) / 수동 추가(MANUAL) */
export interface AdminSpiritVariant {
  id: number
  nameKo: string
  nameEn: string
  category: SpiritCategory
  bottledYear: number | null
  vintageYear: number | null
  abv: number | null
  volumeMl: number | null
  batchNo: string | null
  bottledDate: string | null
  primaryImageUrl: string | null
  status: SpiritStatus
  origin: 'AUTO' | 'MANUAL'
  variantType?: 'BATCH' | 'RELEASE_YEAR' | 'SINGLE_CASK' | 'NONE' | null
  variantValue?: string | null
  variantValueEn?: string | null
  seriesIdentifier?: string | null
  seriesIdentifierEn?: string | null
  abvMin?: number | null
  abvMax?: number | null
  volumeMlMin?: number | null
  volumeMlMax?: number | null
  commonDetail?: SpiritCommonDetailResponse | null
  whiskyDetail?: WhiskyDetailResponse | null
}

export interface AdminSpiritDetail {
  id: number
  nameKo: string
  nameEn: string
  category: SpiritCategory
  producerId: number | null
  producerNameKo: string | null
  producerNameEn: string | null
  bottler: string | null
  bottledYear: number | null
  vintageYear: number | null
  abv: number | null
  volumeMl: number | null
  country: string | null
  region: string | null
  avgScore: number | null
  reviewCount: number
  viewCount?: number
  status: SpiritStatus
  images: AdminSpiritImageItem[]
  createdAt: string
  updatedAt: string
  parentId?: number | null
  variantType?: 'BATCH' | 'RELEASE_YEAR' | 'SINGLE_CASK' | 'NONE' | null
  variantValue?: string | null
  variantValueEn?: string | null
  seriesIdentifier?: string | null
  seriesIdentifierEn?: string | null
  abvMin?: number | null
  abvMax?: number | null
  volumeMlMin?: number | null
  volumeMlMax?: number | null
  variants?: AdminSpiritVariant[]
  commonDetail: SpiritCommonDetailResponse | null
  whiskyDetail: WhiskyDetailResponse | null
  wineDetail: WineDetailResponse | null
  cognacDetail: CognacDetailResponse | null
  otherDetail: OtherDetailResponse | null
}

export interface UpdateSpiritPayload {
  nameKo?: string
  nameEn?: string
  category?: SpiritCategory
  producerId?: number | null
  bottler?: string | null
  bottledYear?: number | null
  vintageYear?: number | null
  abv?: number | null
  volumeMl?: number | null
  country?: string | null
  region?: string | null
  isVariantSplit?: boolean
  variants?: CreateVariantRequest[]
  variantType?: 'BATCH' | 'RELEASE_YEAR' | 'SINGLE_CASK' | 'NONE' | null
  variantValue?: string | null
  variantValueEn?: string | null
  seriesIdentifier?: string | null
  seriesIdentifierEn?: string | null
  abvMin?: number | null
  abvMax?: number | null
  volumeMlMin?: number | null
  volumeMlMax?: number | null
  commonDetail?: SpiritCommonDetailRequest
  whiskyDetail?: WhiskyDetailRequest
  wineDetail?: WineDetailRequest
  cognacDetail?: CognacDetailRequest
  otherDetail?: OtherDetailRequest
}

export interface CreateSpiritPayload {
  nameKo: string
  nameEn: string
  category: SpiritCategory
  status?: SpiritStatus
  producerId?: number | null
  bottler?: string | null
  bottledYear?: number | null
  vintageYear?: number | null
  abv?: number | null
  volumeMl?: number | null
  country?: string | null
  region?: string | null
  isVariantSplit?: boolean
  variants?: CreateVariantRequest[]
  variantType?: 'BATCH' | 'RELEASE_YEAR' | 'SINGLE_CASK' | 'NONE' | null
  variantValue?: string | null
  variantValueEn?: string | null
  seriesIdentifier?: string | null
  seriesIdentifierEn?: string | null
  abvMin?: number | null
  abvMax?: number | null
  volumeMlMin?: number | null
  volumeMlMax?: number | null
  commonDetail?: SpiritCommonDetailRequest
  whiskyDetail?: WhiskyDetailRequest
  wineDetail?: WineDetailRequest
  cognacDetail?: CognacDetailRequest
  otherDetail?: OtherDetailRequest
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
  producerId: number | null
  producerNameKo: string | null
  bottler: string | null
  bottledYear: number | null
  vintageYear: number | null
  abv: number | null
  volumeMl: number | null
  abvMin: number | null
  abvMax: number | null
  volumeMlMin: number | null
  volumeMlMax: number | null
  country: string | null
  region: string | null
  ageStatement: number | null
  ageStatementMonths: number | null
  ageStatementMin: number | null
  ageStatementMinMonths: number | null
  ageStatementMax: number | null
  ageStatementMaxMonths: number | null
  isNas: boolean | null
  distilledDate: string | null
  bottledDate: string | null
  releaseDate: string | null
  bottleNo: string | null
  batchNo: string | null
  totalBottles: number | null
  whiskyStyle: WhiskyStyle | null
  whiskyStyleOther: string | null
  brandName: string | null
  bottlingType: string | null
  caskNo: string | null
  whiskyNotes: string | null
  caskTypes: string[] | null
  caskFinishes: string[] | null
  caskTypeOther: string | null
  caskDetails: Record<string, string[]> | null
  isNonChillFiltered: boolean | null
  isNaturalColour: boolean | null
  isSingleCask: boolean | null
  isCaskStrength: boolean | null
  isPeated: boolean | null
  phenolPpm: number | null
  phenolPpmMin: number | null
  phenolPpmMax: number | null
  wineType: WineType | null
  cognacGrade: CognacGrade | null
  otherType: OtherSpiritType | null
  wineDetail: WineDetailRequest | null
  cognacDetail: CognacDetailRequest | null
  otherDetail: OtherDetailRequest | null
  imageUrls: string[]
  note: string | null
  variantType: 'BATCH' | 'RELEASE_YEAR' | 'SINGLE_CASK' | 'NONE' | null
  variantValue: string | null
  variantValueEn: string | null
  seriesIdentifier: string | null
  seriesIdentifierEn: string | null
  status: RequestStatus
  rejectReason: string | null
  createdAt: string
  reviewedAt: string | null
}

export interface UpdateRequestBody {
  nameKo: string
  nameEn: string
  category: SpiritCategory
  producerId?: number | null
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

export type PostReportTargetType = 'POST' | 'COMMENT'

export interface PostReportAdmin {
  id: number
  targetType: PostReportTargetType
  postId: number | null
  postTitle: string | null
  boardType: 'NOTICE' | 'FREE' | null
  postLocked: boolean | null
  postHidden: boolean | null
  postReportCount: number | null
  commentId: number | null
  commentContent: string | null
  commentHidden: boolean | null
  commentDeleted: boolean | null
  commentReportCount: number | null
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

export interface NicknameBadWord {
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

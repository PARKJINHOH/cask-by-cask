export type BannerType = 'IMAGE' | 'HTML'
export type BannerLanguage = 'KO' | 'EN'
export type BannerImageType = 'PC' | 'MO'

export interface BannerImageInfo {
  imageUrl: string
  originalFileName: string
}

export interface BannerResponse {
  id: number
  bannerType: BannerType
  language: BannerLanguage
  contentSanitized: string | null
  pcImage: BannerImageInfo | null
  moImage: BannerImageInfo | null
  linkUrl: string | null
  linkTargetBlank: boolean | null
  sortOrder: number
}

export interface AdminBannerListItem {
  id: number
  adminTitle: string
  bannerType: BannerType
  language: BannerLanguage
  isVisible: boolean
  sortOrder: number
  isAlwaysVisible: boolean
  startAt: string | null
  endAt: string | null
  createdAt: string
}

export interface AdminBannerDetail {
  id: number
  adminTitle: string
  bannerType: BannerType
  language: BannerLanguage
  content: string | null
  contentSanitized: string | null
  linkUrl: string | null
  linkTargetBlank: boolean
  isVisible: boolean
  sortOrder: number
  isAlwaysVisible: boolean
  startAt: string | null
  endAt: string | null
  pcImage: BannerImageInfo | null
  moImage: BannerImageInfo | null
  createdAt: string
  updatedAt: string
}

export interface UploadedBannerImage {
  id: number
  imageUrl: string
  originalFileName: string
  fileSize: number
  mimeType: string
  imageType: BannerImageType
}

export interface CreateBannerPayload {
  adminTitle: string
  bannerType: BannerType
  language: BannerLanguage
  content?: string | null
  bannerPcImageId?: number | null
  bannerMoImageId?: number | null
  linkUrl?: string | null
  linkTargetBlank?: boolean
  isVisible: boolean
  sortOrder: number
  isAlwaysVisible: boolean
  startAt?: string | null
  endAt?: string | null
}

export interface UpdateBannerPayload {
  adminTitle?: string
  content?: string | null
  bannerPcImageId?: number | null
  bannerMoImageId?: number | null
  removeMoImage?: boolean
  linkUrl?: string | null
  linkTargetBlank?: boolean
  isVisible?: boolean
  isAlwaysVisible?: boolean
  startAt?: string | null
  endAt?: string | null
}

export interface BannerPreviewData {
  bannerType: BannerType
  content?: string | null
  pcImageUrl?: string | null
  moImageUrl?: string | null
  linkUrl?: string | null
  linkTargetBlank?: boolean
}

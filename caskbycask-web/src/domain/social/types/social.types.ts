export type SocialPlatform = 'INSTAGRAM' | 'THREADS'
export type SocialPublicationStatus =
  | 'WAITING_SOURCE' | 'QUEUED' | 'RENDERING' | 'CONTAINER_CREATED'
  | 'PUBLISHING' | 'VERIFYING' | 'PUBLISHED' | 'RETRY_WAIT'
  | 'FAILED' | 'CANCELED' | 'EXTERNALLY_DELETED'
export type SocialSourceType = 'REVIEW' | 'VARIANT_REVIEW_REQUEST' | 'POST' | 'AI_NEWS_ARTICLE'
export type SocialMediaMode = 'REVIEW_IMAGE' | 'DIRECT_UPLOAD' | 'TEMPLATE'

export interface SocialTemplate {
  id: number
  name: string
  backgroundImageUrl: string
  active: boolean
  displayOrder: number
}

export interface SocialCapabilities {
  enabled: boolean
  instagramAvailable: boolean
  threadsAvailable: boolean
  reviewImageAvailable: boolean
  consentVersion: string
  templates: SocialTemplate[]
}

export interface SocialPublishSelection {
  instagram: boolean
  threads: boolean
  consentAccepted: boolean
  consentVersion?: string
  locale?: 'ko' | 'en'
  mediaMode?: SocialMediaMode
  templateId?: number
  thumbnailText?: string
  directImageUrl?: string
}

export interface SocialPublication {
  id: number
  bundleId: number
  platform: SocialPlatform
  status: SocialPublicationStatus
  sourceType: SocialSourceType
  sourceId: number
  permalink: string | null
  renderedImageUrl: string | null
  lastError: string | null
  canRetry: boolean
  publishedAt: string | null
  createdAt: string
}

export interface SocialAccount {
  platform: SocialPlatform
  externalUserId: string
  username: string | null
  tokenExpiresAt: string
  grantedScopes: string
  status: 'CONNECTED' | 'EXPIRING' | 'EXPIRED' | 'INVALID'
  lastVerifiedAt: string | null
  lastRefreshedAt: string | null
  lastError: string | null
}

export interface SocialHubItem {
  bundleId: number
  sourceType: SocialSourceType
  sourceId: number
  title: string
  imageUrl: string | null
  sourcePath: string
  platforms: Array<{ platform: SocialPlatform; permalink: string }>
  publishedAt: string | null
}

export interface PublicReview {
  id: number
  spiritId: number
  parentSpiritId: number | null
  displayNameKo: string
  displayNameEn: string | null
  canonicalPathKo: string
  canonicalPathEn: string
  imageUrl: string | null
  nickname: string
  noseScore: number | null
  tasteScore: number | null
  finishScore: number | null
  totalScore: number | null
  noseNote: string | null
  tasteNote: string | null
  finishNote: string | null
  comment: string | null
  createdAt: string
  images: Array<{ id: number; imageUrl: string; sortOrder: number }>
}

export const EMPTY_SOCIAL_SELECTION: SocialPublishSelection = {
  instagram: false,
  threads: false,
  consentAccepted: false,
}

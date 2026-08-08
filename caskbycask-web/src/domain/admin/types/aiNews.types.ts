export type AiNewsArticleType = 'RELEASE_NEWS' | 'TIP_INFO'
export type AiNewsArticleStatus =
  | 'DRAFT' | 'PENDING_REVIEW' | 'SCHEDULED' | 'PUBLISHED' | 'REJECTED'
  | 'SKIPPED_DUPLICATE' | 'FAILED' | 'DELETED' | 'REWRITE_REQUESTED'
export type AiNewsCategory = 'WHISKY' | 'WINE' | 'COGNAC' | 'OTHER'
export type AiNewsSourceType = 'OFFICIAL' | 'TRUSTED_MEDIA' | 'COMMUNITY' | 'UNAPPROVED'
/** 출처 목록 필터의 수집 상태. 차단은 enabled 와 별개 축이라 하나의 select 로 합쳐 다룬다. */
export type AiNewsSourceState = 'ENABLED' | 'DISABLED' | 'BLOCKED'
export type AiNewsSourceCrawlStatus = 'NOT_CHECKED' | 'SUCCESS' | 'ERROR'
export type AiNewsTopicStatus = 'READY' | 'SCHEDULED' | 'HOLD' | 'BLOCKED' | 'COMPLETED'
export type AiNewsDraftRequestStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

export interface AiNewsDraftRequest {
  id: number
  prompt: string
  referenceUrls: string[]
  status: AiNewsDraftRequestStatus
  failureReason: string | null
  articleId: number | null
  createdAt: string
  updatedAt: string
}

export interface AiNewsDraftRequestCreateRequest {
  prompt: string
  referenceUrls: string[]
}

export interface AiNewsDraftRequestRetryRequest {
  prompt: string
}

export interface AiNewsArticleSummary {
  id: number
  articleType: AiNewsArticleType
  status: AiNewsArticleStatus
  category: AiNewsCategory
  title: string
  confidenceScore: number
  postId: number | null
  pinned: boolean
  updateAvailable: boolean
  failureReason: string | null
  scheduledAt: string | null
  publishedAt: string | null
  createdAt: string
}

export interface AiNewsSourceEvidence {
  id?: number
  sourceUrl: string
  canonicalUrl: string
  domain: string
  sourceTitle?: string | null
  sourceType: AiNewsSourceType
  evidenceSummary?: string | null
  contentHash?: string | null
  publishedAt?: string | null
  retrievedAt?: string | null
}

export interface AiNewsArticleDetail extends AiNewsArticleSummary {
  content: string
  dedupeKey: string
  semanticFingerprint: string | null
  deletedPostId: number | null
  topicId: number | null
  topicTitle: string | null
  prefixId: number | null
  imageUrl: string | null
  imageKind: string | null
  imageRightsEvidence: string | null
  modelName: string | null
  hashtags: string[]
  duplicateReason: string | null
  rewritePrompt: string | null
  rewriteRequestedAt: string | null
  updatedAt: string
  sources: AiNewsSourceEvidence[]
}

export interface AiNewsArticleCreateRequest {
  articleType: AiNewsArticleType
  category: AiNewsCategory
  title: string
  content: string
  dedupeKey: string
  confidenceScore?: number
  canonicalUrlHash?: string | null
  semanticFingerprint?: string | null
  topicId?: number | null
  prefixId?: number | null
  pinned?: boolean
  autoPublishRequested?: boolean
  imageUrl?: string | null
  imageKind?: string | null
  imageRightsEvidence?: string | null
  modelName?: string | null
  hashtags?: string[]
  sources?: AiNewsSourceEvidence[]
}

export interface AiNewsArticleUpdateRequest {
  category: AiNewsCategory
  title: string
  content: string
  prefixId?: number | null
  pinned?: boolean
  confidenceScore?: number
  semanticFingerprint?: string | null
  hashtags?: string[]
  sourceUrls?: string[]
}

export interface AiNewsTopic {
  id: number
  title: string
  normalizedKey: string
  aliases: string | null
  category: AiNewsCategory
  status: AiNewsTopicStatus
  aiSuggested: boolean
  allowRepublish: boolean
  lastPublishedAt: string | null
  createdAt: string
}

export interface AiNewsTopicRequest {
  title: string
  normalizedKey: string
  aliases?: string | null
  category: AiNewsCategory
  status?: AiNewsTopicStatus
  allowRepublish?: boolean
  aiSuggested?: boolean
}

export interface AiNewsSourceConfig {
  id: number
  sourceName: string
  sourceUrl: string
  domain: string
  pathPrefix: string
  sourceType: AiNewsSourceType
  enabled: boolean
  /** 관리자가 차단한 출처. 행이 남아 있어야 수집이 같은 도메인을 다시 등록하지 않는다. */
  blocked: boolean
  blockedAt: string | null
  /** 관리자가 등록한 게 아니라 기사 수집 중 자동 등록된 출처. 삭제하면 차단으로 남는다. */
  autoDiscovered: boolean
  autoPublishAllowed: boolean
  imageUseAllowed: boolean
  crawlStatus: AiNewsSourceCrawlStatus
  lastCrawledAt: string | null
  lastCrawlError: string | null
}

export interface AiNewsSourceConfigRequest {
  sourceName: string
  sourceUrl: string
  sourceType: AiNewsSourceType
  enabled: boolean
  autoPublishAllowed: boolean
  imageUseAllowed: boolean
}

export interface AiNewsSettings {
  automationEnabled: boolean
  autoPublishEnabled: boolean
  dryRun: boolean
  dailyReleaseLimit: number
  tipIntervalHours: number
  confidenceThreshold: number
  tavilyMonthlyCreditLimit: number
  openaiMonthlyBudgetUsd: number | null
  openaiMonthlyTokenLimit: number | null
  openaiMonthlyImageLimit: number | null
  whiskyRatio: number
  wineRatio: number
  cognacRatio: number
}

export interface AiNewsUsageSummary {
  tavilyCredits: number
  inputTokens: number
  outputTokens: number
  imageCount: number
  estimatedCostUsd: number
  tavilyCreditLimit: number
  openaiBudgetUsd: number | null
  openaiTokenLimit: number | null
  openaiImageLimit: number | null
}

export interface AiNewsRun {
  id: number
  runKey: string
  runType: 'SCHEDULED' | 'MANUAL' | 'DRY_RUN'
  status: 'RUNNING' | 'SUCCEEDED' | 'PARTIAL' | 'FAILED'
  candidateCount: number
  publishedCount: number
  reviewCount: number
  duplicateCount: number
  errorCount: number
  errorMessage: string | null
  startedAt: string
  finishedAt: string | null
}

export type AiNewsArticleType = 'RELEASE_NEWS' | 'TIP_INFO'
export type AiNewsArticleStatus =
  | 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED'
  | 'SKIPPED_DUPLICATE' | 'FAILED' | 'DELETED' | 'REWRITE_REQUESTED'
export type AiNewsCategory = 'WHISKY' | 'WINE' | 'COGNAC'
export type AiNewsSourceType = 'OFFICIAL' | 'TRUSTED_MEDIA' | 'COMMUNITY' | 'UNAPPROVED'
export type AiNewsTopicStatus = 'READY' | 'SCHEDULED' | 'HOLD' | 'BLOCKED' | 'COMPLETED'

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
  domain: string
  sourceType: AiNewsSourceType
  enabled: boolean
  autoPublishAllowed: boolean
  imageUseAllowed: boolean
  crawlerType: string | null
  crawlerTargetKey: string | null
  crawlerTargetValue: string | null
}

export type AiNewsSourceConfigRequest = Omit<AiNewsSourceConfig, 'id'>

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

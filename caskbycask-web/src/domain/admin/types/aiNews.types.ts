export type AiNewsArticleType = 'RELEASE_NEWS' | 'TIP_INFO'
export type AiNewsArticleStatus =
  | 'DRAFT' | 'PENDING_REVIEW' | 'SCHEDULED' | 'PUBLISHED' | 'REJECTED'
  | 'SKIPPED_DUPLICATE' | 'FAILED' | 'DELETED'
export type AiNewsCategory = 'WHISKY' | 'WINE' | 'COGNAC' | 'OTHER'
/**
 * 출처별 마지막 수집 결과.
 * SUCCESS 는 근거를 실제로 가져온 경우뿐이고, 정상 확인했지만 새 소식이 없으면 NO_RESULT 다.
 */
export type AiNewsSourceCrawlStatus = 'NOT_CHECKED' | 'SUCCESS' | 'NO_RESULT' | 'ERROR'
export type AiNewsTopicStatus = 'PLANNED' | 'DONE'
export interface AiNewsArticleSummary {
  id: number
  articleType: AiNewsArticleType
  status: AiNewsArticleStatus
  category: AiNewsCategory
  title: string
  /** AI 가 물어온 소재의 요약. 본문을 쓸지 판단할 때 읽는다. 관리자가 직접 만든 글은 없다. */
  leadSummary: string | null
  /** 본문이 아직 비어 있는 소재인지. true 면 발행할 수 없다. */
  contentEmpty: boolean
  sourceDomains: string[]
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
  evidenceSummary?: string | null
  contentHash?: string | null
  publishedAt?: string | null
  retrievedAt?: string | null
}

export interface AiNewsArticleDetail extends AiNewsArticleSummary {
  content: string
  dedupeKey: string
  deletedPostId: number | null
  topicId: number | null
  topicTitle: string | null
  prefixId: number | null
  imageUrl: string | null
  modelName: string | null
  hashtags: string[]
  duplicateReason: string | null
  updatedAt: string
  sources: AiNewsSourceEvidence[]
}

export interface AiNewsArticleCreateRequest {
  articleType: AiNewsArticleType
  category: AiNewsCategory
  title: string
  content: string
  dedupeKey?: string
  topicId?: number | null
  prefixId?: number | null
  pinned?: boolean
  hashtags?: string[]
  sources?: AiNewsSourceEvidence[]
}

export interface AiNewsArticleUpdateRequest {
  category: AiNewsCategory
  title: string
  content: string
  prefixId?: number | null
  pinned?: boolean
  hashtags?: string[]
  sourceUrls?: string[]
}

/** 관리자가 직접 쓸 팁·정보 글의 '쓸 거리' 메모. AI 는 이 목록을 쓰지 않는다. */
export interface AiNewsTopic {
  id: number
  title: string
  category: AiNewsCategory
  memo: string | null
  status: AiNewsTopicStatus
  lastPublishedAt: string | null
  createdAt: string
}

export interface AiNewsTopicRequest {
  title: string
  category: AiNewsCategory
  memo?: string | null
  status?: AiNewsTopicStatus
}

export interface AiNewsSourceConfig {
  id: number
  sourceName: string
  sourceUrl: string
  domain: string
  pathPrefix: string
  enabled: boolean
  /** 자동 등록 시절에 생긴 옛 출처. 지금은 아무도 true 로 만들지 않고, 정리 필터용으로만 남아 있다. */
  autoDiscovered: boolean
  crawlStatus: AiNewsSourceCrawlStatus
  lastCrawledAt: string | null
  lastCrawlError: string | null
}

export interface AiNewsSourceConfigRequest {
  sourceName: string
  sourceUrl: string
  enabled: boolean
}

/** 일괄 삭제 결과. 원고가 붙어 지울 수 없던 건수를 skipped 로 알려 준다. */
export interface AiNewsBulkDeleteResult {
  deleted: number
  skipped: number
}

export interface AiNewsSettings {
  automationEnabled: boolean
  /**
   * 수집할 시각을 0~23 으로 나열한 값(예 '9,18'). cron 은 매시간 확인하고
   * 지금이 그 시각을 지났는지는 서버가 판단한다.
   */
  collectionHours: string
  /** 최신 기사로 볼 기간(일). 이 기간 밖의 기사는 소재 후보에 넣지 않는다. */
  recentWindowDays: number
  /** 하루에 모을 소재 수. 발행이 아니라 생성 기준이다. */
  dailyReleaseLimit: number
  openaiMonthlyBudgetUsd: number | null
  openaiMonthlyTokenLimit: number | null
  whiskyRatio: number
  wineRatio: number
  cognacRatio: number
}

export interface AiNewsUsageSummary {
  inputTokens: number
  outputTokens: number
  estimatedCostUsd: number
  openaiBudgetUsd: number | null
  openaiTokenLimit: number | null
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

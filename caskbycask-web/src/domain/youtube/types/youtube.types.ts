/** 영상 유형 — 세로형 숏츠와 가로형 일반 영상은 카드 비율이 다르다. */
export type YoutubeVideoType = 'VIDEO' | 'SHORTS'

/** 영상이 목록에 들어온 경로. 자동 수집분(CHANNEL_FEED)은 삭제해도 다음 수집에서 되살아난다. */
export type YoutubeVideoSource = 'CHANNEL_FEED' | 'MANUAL'

export interface YoutubeSpiritTag {
  spiritId: number
  nameKo: string
  nameEn: string | null
  category: string | null
}

/**
 * 영상 카드에 붙는 채널 요약.
 * `channelUrl` 은 유튜브 채널 홈, `handle`/`channelKey` 는 우리 채널 페이지 주소를 만드는 데 쓴다
 * (핸들이 없는 채널도 있어 둘 다 내려온다).
 */
export interface YoutubeVideoChannel {
  id: number
  title: string
  handle: string | null
  channelKey: string
  thumbnailUrl: string | null
  channelUrl: string
}

/**
 * 공개 갤러리의 영상.
 * 조회수·재생시간은 없다 — Data API 를 쓰지 않기 때문이고, 있더라도 금세 낡는다.
 */
export interface YoutubeVideo {
  id: number
  videoKey: string
  title: string
  description: string | null
  thumbnailUrl: string | null
  videoType: YoutubeVideoType
  publishedAt: string
  pinned: boolean
  embedUrl: string
  watchUrl: string
  channel: YoutubeVideoChannel
  /** 목록 응답에는 비어 있고 상세 응답에만 채워진다. */
  spiritTags: YoutubeSpiritTag[]
}

export interface YoutubeChannel {
  id: number
  channelKey: string
  handle: string | null
  title: string
  description: string | null
  descriptionEn: string | null
  thumbnailUrl: string | null
  channelUrl: string
  videoCount: number
}

export interface YoutubeVideoQuery {
  channelId?: number
  videoType?: YoutubeVideoType
  keyword?: string
  spiritId?: number
}

// ─── 관리자 ────────────────────────────────────────────────

export interface AdminYoutubeChannel {
  id: number
  channelKey: string
  handle: string | null
  title: string
  description: string | null
  descriptionEn: string | null
  thumbnailUrl: string | null
  channelUrl: string
  visible: boolean
  syncEnabled: boolean
  permissionConfirmed: boolean
  permissionNote: string | null
  sortOrder: number
  lastSyncedAt: string | null
  lastSyncError: string | null
  videoCount: number
  createdAt: string
}

export interface AdminYoutubeVideo {
  id: number
  videoKey: string
  title: string
  thumbnailUrl: string | null
  videoType: YoutubeVideoType
  source: YoutubeVideoSource
  publishedAt: string
  visible: boolean
  pinned: boolean
  hiddenReason: string | null
  /** 가용성 점검이 자동으로 내린 영상 — 관리자가 숨긴 것과 구분해 보여 준다. */
  autoHidden: boolean
  lastCheckedAt: string | null
  watchUrl: string
  channelId: number
  channelTitle: string
  spiritTags: YoutubeSpiritTag[]
}

/**
 * 가용성 점검 결과.
 * `skipped` 는 확인에 실패해 **상태를 바꾸지 않은** 건수다 — 이 수가 계속 크면 네트워크를 의심한다.
 */
export interface YoutubeAvailabilityResult {
  checked: number
  hidden: number
  restored: number
  skipped: number
  autoHiddenTotal: number
}

export interface CreateYoutubeChannelPayload {
  channelUrl: string
  title?: string
  description?: string
  descriptionEn?: string
  thumbnailUrl?: string
  visible?: boolean
  syncEnabled?: boolean
  permissionConfirmed?: boolean
  permissionNote?: string
}

export interface UpdateYoutubeChannelPayload {
  title: string
  handle?: string
  description?: string
  descriptionEn?: string
  thumbnailUrl?: string
  visible?: boolean
  syncEnabled?: boolean
  permissionConfirmed?: boolean
  permissionNote?: string
}

export interface CreateYoutubeVideoPayload {
  channelId: number
  videoUrl: string
  title?: string
  videoType?: YoutubeVideoType
}

/** `spiritIds` 는 보낸 목록이 곧 전체다 — 생략하면 태그를 건드리지 않고, `[]` 면 모두 해제한다. */
export interface UpdateYoutubeVideoPayload {
  visible?: boolean
  pinned?: boolean
  hiddenReason?: string
  videoType?: YoutubeVideoType
  spiritIds?: number[]
}

export interface YoutubeSyncResult {
  channelCount: number
  createdCount: number
  updatedCount: number
  items: Array<{
    channelId: number
    channelTitle: string | null
    created: number
    updated: number
    error: string | null
  }>
}

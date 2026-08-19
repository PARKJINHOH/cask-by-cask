import { Metadata } from 'next'
import {
  SPIRIT_CATEGORIES,
  SPIRIT_CATEGORY_META,
  isSpiritSeoCategory,
  type SpiritSeoCategory,
} from '@/domain/spirit/config/spiritSeo'
import {
  buildListPageHref,
  hasUnsupportedPageParam,
  isBoardListNoindex,
  readPageParam,
  type BoardListType,
  type MetadataSearchParams,
} from '@/shared/utils/seoIndexing'
import { appendWineVintageDisplay } from '@/domain/spirit/utils/spiritDisplayName'

// 페이지네이션 규칙은 SPA 도 함께 써야 하므로 client-safe 한 seoIndexing 이 원본이다.
export { isBoardListNoindex, buildListPageHref, readPageParam, hasUnsupportedPageParam }
export type { BoardListType, MetadataSearchParams }

const API_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
const SITE_URL = 'https://www.caskbycask.net'
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`

interface ApiResponse<T> {
  success: boolean
  data: T | null
}

interface SpiritSeoResponse {
  canonicalId: number
  canonicalPathKo: string
  canonicalPathEn: string
  canonicalUrlKo: string
  canonicalUrlEn: string
  titleKo: string
  titleEn: string
  descriptionKo: string
  descriptionEn: string
  primaryImageUrl: string
  updatedAt: string | null
  relationType?: 'STANDALONE' | 'MASTER' | 'EDITION'
  parent?: SpiritSeoRelationResponse | null
  editions?: SpiritSeoRelationResponse[]
  recentPrice?: SpiritSeoPriceObservationResponse | null
  recentHotDeal?: SpiritSeoPriceObservationResponse | null
}

interface SpiritSeoRelationResponse {
  id: number
  nameKo: string
  nameEn: string
  canonicalPathKo: string
  canonicalPathEn: string
}

interface SpiritSeoPriceObservationResponse {
  amount: number | string
  currency: string | null
  sourceName: string | null
  observedDate: string | null
  sourceUrl: string | null
}

interface SpiritDetailResponse {
  id: number
  nameKo: string
  nameEn: string | null
  category: string | null
  producerId?: number | null
  producerNameKo: string | null
  producerNameEn: string | null
  vintageYear?: number | null
  abv?: number | string | null
  abvMin?: number | string | null
  abvMax?: number | string | null
  volumeMl?: number | null
  volumeMlMin?: number | null
  volumeMlMax?: number | null
  country: string | null
  region?: string | null
  avgScore: number | string | null
  reviewCount: number | null
  /** 평균 점수의 모수 — 점수를 남긴 리뷰 수. 없으면 reviewCount 로 떨어진다(구버전 응답). */
  scoredReviewCount?: number | null
  viewCount?: number | null
  updatedAt?: string | null
  commonDetail?: {
    isNas?: boolean | null
    ageStatement?: number | null
    ageStatementMonths?: number | null
    distilledDate?: string | null
    bottledDate?: string | null
    bottleNo?: string | null
    totalBottles?: number | null
  } | null
  whiskyDetail?: {
    style?: string | null
    brandName?: string | null
    bottlingType?: string | null
    caskTypes?: string[] | null
    caskFinishes?: string[] | null
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
  } | null
  wineDetail?: {
    wineType?: string | null
    vintageStatus?: 'VINTAGE' | 'NON_VINTAGE' | 'UNKNOWN' | null
    appellationDesignation?: string | null
    grapeVarieties?: Array<{ name?: string | null; percentage?: number | null }> | null
    sweetness?: string | null
    body?: string | null
    acidity?: string | null
    tannin?: string | null
  } | null
  cognacDetail?: {
    grade?: string | null
    cru?: string | null
    isFineChampagne?: boolean | null
    blendDetail?: string | null
    vintageYear?: number | null
    ageYears?: number | null
    oakTypes?: string[] | null
    caskFinish?: string | null
  } | null
  otherDetail?: {
    otherType?: string | null
    mainIngredient?: string | null
    productionMethod?: string | null
    notes?: string | null
    styleClassification?: string | null
    caskType?: string | null
    originDesignation?: string | null
  } | null
  images?: Array<{
    imageUrl?: string | null
    isPrimary?: boolean
  }> | null
  variantType?: string | null
  variantValue?: string | null
  variantValueEn?: string | null
  seriesIdentifier?: string | null
  seriesIdentifierEn?: string | null
}

/**
 * 게시글에 붙은 주류 태그. 커뮤니티에서 주류 상세로 내려가는 내부 링크의 재료다.
 * <p>canonical 경로는 담고 있지 않으므로 링크를 만들 때 SEO API 로 한 번 더 확인한다.
 */
interface CommunityPostSpiritTagResponse {
  spiritId: number
  nameKo?: string | null
  nameEn?: string | null
  category?: string | null
}

/**
 * 게시글 제한 여부.
 * <p>백엔드의 boolean 필드는 Jackson 이 접두사 `is` 를 떼고 직렬화하므로 실제 JSON 키는
 * `locked`·`hidden` 이다. 과거 이름으로도 들어올 수 있어 양쪽을 모두 본다 —
 * 한쪽만 보면 잠금·숨김 글이 색인 대상으로 새어 나간다.
 */
interface CommunityPostRestrictionFlags {
  locked?: boolean | null
  hidden?: boolean | null
  isLocked?: boolean | null
  isHidden?: boolean | null
  adultOnly?: boolean | null
}

interface CommunityPostResponse extends CommunityPostRestrictionFlags {
  id: number
  boardType?: string | null
  prefix?: { name?: string | null } | null
  title: string
  content?: string | null
  contentSanitized?: string | null
  authorNickname?: string | null
  authorName?: string | null
  authorId?: number | null
  viewCount?: number | null
  likeCount?: number | null
  commentCount?: number | null
  createdAt?: string | null
  updatedAt?: string | null
  imageUrl?: string | null
  images?: Array<{ imageUrl?: string | null }> | null
  sourceUrls?: string[] | null
  hashtags?: string[] | null
  spiritTags?: CommunityPostSpiritTagResponse[] | null
}

interface CommunityPostListItemResponse extends CommunityPostRestrictionFlags {
  id: number
  boardType?: string | null
  title: string
  authorNickname?: string | null
  createdAt?: string | null
  spiritTags?: CommunityPostSpiritTagResponse[] | null
}

/** 색인·SSR 노출에서 제외해야 하는 게시글인지. */
function isRestrictedPost(post: CommunityPostRestrictionFlags): boolean {
  return Boolean(
    post.adultOnly
    || post.locked || post.isLocked
    || post.hidden || post.isHidden,
  )
}

interface CommunityPostCommentResponse {
  id: number
  authorNickname?: string | null
  authorId?: number | null
  content?: string | null
  children?: CommunityPostCommentResponse[] | null
  createdAt?: string | null
  isDeleted?: boolean | null
  isHidden?: boolean | null
  isSecretMasked?: boolean | null
}

interface ByobDetailResponse {
  id: number
  title: string
  content?: string | null
  hostNickname?: string | null
  location?: string | null
  address?: string | null
  eventAt?: string | null
  recruitStartAt?: string | null
  recruitEndAt?: string | null
  hostBottles?: string[] | null
  maxParticipants?: number | null
  approvedCount?: number | null
  status?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

interface ByobListItemResponse {
  id: number
  title: string
  location?: string | null
  eventAt?: string | null
  status?: string | null
}

interface NoticeListItemResponse {
  id: number
  title: string
  category?: string | null
  createdAt?: string | null
}

interface NoticeDetailResponse {
  id: number
  title: string
  contentSanitized?: string | null
  category?: string | null
  viewCount?: number | null
  recommendCount?: number | null
  images?: Array<{ imageUrl?: string | null }> | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface SeoSnapshotItem {
  title: string
  href: string
  description?: string | null
  meta?: string | null
}

export interface SeoPaginationLink {
  /** 0-based 페이지 번호. 화면에는 +1 해서 보여준다. */
  page: number
  href: string
  current: boolean
}

/**
 * 목록의 SSR 페이지네이션.
 * <p>목록 1페이지에만 링크가 걸리면 밀려난 항목은 sitemap 외에 유입 경로가 없는 고아가 된다.
 * 크롤러가 JS 없이도 뒤 페이지로 내려갈 수 있도록 raw HTML 에 앵커를 남기는 것이 목적이다.
 */
export interface SeoPagination {
  /** 0-based 현재 페이지. */
  current: number
  total: number
  prevHref: string | null
  nextHref: string | null
  links: SeoPaginationLink[]
}

export interface SeoSnapshotData {
  kind: 'home' | 'spirit' | 'spirits-list' | 'community' | 'byob' | 'board-list' | 'notice' | 'tier-list'
    | 'youtube'
  lang: 'ko' | 'en'
  eyebrow: string
  title: string
  subtitle?: string | null
  description?: string | null
  image?: string | null
  metrics: Array<{ label: string; value: string }>
  details: Array<{ label: string; value: string }>
  bodyHtml?: string | null
  sourceUrls?: string[]
  hashtags?: string[]
  items?: SeoSnapshotItem[]
  /** 목록 섹션의 제목. 주류 목록과 게시글 목록이 같은 문구를 쓰지 않도록 경로별로 지정한다. */
  itemsHeading?: string
  pagination?: SeoPagination | null
  links: Array<{ label: string; href: string }>
}

/**
 * 크롤 경로용 페이지 링크 묶음을 만든다.
 * <p>항목이 많아도 앵커가 무한정 늘지 않도록 현재 페이지 주변만 남기고, 대신 첫/끝 페이지를
 * 항상 포함해 어느 페이지에서 시작해도 목록 전체를 훑을 수 있게 한다.
 */
export function buildSeoPagination(
  basePath: string,
  current: number,
  totalPages: number,
  window = 3,
): SeoPagination | null {
  if (!Number.isFinite(totalPages) || totalPages <= 1) return null
  const total = Math.floor(totalPages)
  const safeCurrent = Math.min(Math.max(Math.floor(current), 0), total - 1)

  const pages = new Set<number>([0, total - 1])
  for (let page = safeCurrent - window; page <= safeCurrent + window; page += 1) {
    if (page >= 0 && page < total) pages.add(page)
  }

  return {
    current: safeCurrent,
    total,
    prevHref: safeCurrent > 0 ? buildListPageHref(basePath, safeCurrent - 1) : null,
    nextHref: safeCurrent < total - 1 ? buildListPageHref(basePath, safeCurrent + 1) : null,
    links: [...pages].sort((a, b) => a - b).map((page) => ({
      page,
      href: buildListPageHref(basePath, page),
      current: page === safeCurrent,
    })),
  }
}


interface ReviewResponse {
  nickname: string | null
  totalScore: number | string | null
  comment: string | null
  noseNote: string | null
  tasteNote: string | null
  finishNote: string | null
  createdAt: string | null
}

interface PageResponse<T> {
  content: T[]
  page?: number
  size?: number
  totalElements?: number
  totalPages?: number
}

interface SpiritListSeoItemResponse {
  id: number
  nameKo: string
  nameEn?: string | null
  category?: string | null
  vintageYear?: number | null
  vintageStatus?: 'VINTAGE' | 'NON_VINTAGE' | 'UNKNOWN' | null
  producerNameKo?: string | null
  producerNameEn?: string | null
  canonicalPathKo?: string | null
  canonicalPathEn?: string | null
}

export function extractLeadingId(value: string | undefined | null): string | null {
  if (!value) return null
  const decoded = safeDecodeURIComponent(value)
  const match = decoded.match(/^(\d+)/)
  return match ? match[1] : null
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

async function getSpiritSeo(id: string): Promise<SpiritSeoResponse | null> {
  const numericId = extractLeadingId(id)
  if (!numericId) return null
  try {
    const res = await fetch(`${API_URL}/api/seo/spirits/${numericId}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const responseData = await res.json() as ApiResponse<SpiritSeoResponse>
    return responseData.data ?? null
  } catch {
    return null
  }
}

/**
 * SSR 기본 응답 대기 상한(ms).
 *
 * 이 값이 없으면 undici 기본값(300초)까지 기다린다. API 가 "죽은" 상태는 즉시 거절되어
 * 문제가 없지만, **살아 있는데 느린** 상태(배포 직후 Lucene 대량 색인 중 등)에서는 렌더가
 * 그만큼 붙들린다. 메타데이터가 빠진 페이지가 안 뜨는 페이지보다 낫다.
 */
const SSR_FETCH_TIMEOUT_MS = 10_000

async function fetchApiData<T>(
  path: string,
  revalidate = 3600,
  timeoutMs = SSR_FETCH_TIMEOUT_MS,
): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      next: { revalidate },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return null
    const responseData = await res.json() as ApiResponse<T>
    return responseData.data ?? null
  } catch {
    // 타임아웃(AbortError)도 여기로 온다 — 호출 측은 null 을 "데이터 없음"으로 처리한다.
    return null
  }
}

/**
 * 관리자가 숨긴 GNB 메뉴 키. RootLayout 이 `window.__GNB_HIDDEN__` 시드로 심는다.
 *
 * SPA 는 마운트 첫 프레임에 노출 설정을 모르기 때문에, 이 시드가 없으면 숨긴 메뉴가
 * 매 페이지 로드마다 잠깐 보였다가 사라진다. 실패하면 빈 배열 = 전 메뉴 노출이다
 * (메뉴가 통째로 사라지는 것보다 안전한 방향).
 *
 * revalidate 60초 — `useGnbHiddenKeys` 의 staleTime 과 맞춰 두 경로가 어긋나는 창을 줄인다.
 *
 * 대기 상한은 기본값보다 짧게 잡는다. RootLayout 이 **모든 페이지**에서 이 호출을 기다리므로,
 * 여기서 오래 붙들리면 데이터가 필요 없는 페이지까지 첫 바이트가 늦어진다.
 * 못 받아도 빈 배열(= 전 메뉴 노출)이라 화면은 정상 동작한다 — 기다릴 이유가 크지 않다.
 */
export async function getHiddenGnbMenuKeys(): Promise<string[]> {
  const keys = await fetchApiData<string[]>('/api/gnb-menus/hidden', 60, 3_000)
  return Array.isArray(keys) ? keys : []
}

function stripHtmlToText(htmlStr: string): string {
  if (!htmlStr) return ''
  return htmlStr
    .replace(/<[^>]*>/g, ' ') // HTML 태그 제거
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ') // 공백 단일화
    .trim()
}

// HTML 태그 제거 및 텍스트 요약 유틸리티
export function stripHtmlAndSummarize(htmlStr: string, maxLength = 150): string {
  const cleanText = stripHtmlToText(htmlStr)
  if (cleanText.length <= maxLength) return cleanText
  return cleanText.substring(0, maxLength) + '...'
}

function toKstIsoDateTime(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(value)) return value
  return value.includes('T') ? `${value}+09:00` : value
}

function normalizeLang(lang: 'ko' | 'en' | null): 'ko' | 'en' {
  return lang === 'en' ? 'en' : 'ko'
}

function getPostContentHtml(post: Pick<CommunityPostResponse, 'content' | 'contentSanitized'>): string {
  return post.contentSanitized || post.content || ''
}

function buildCommentJsonLd(
  comment: CommunityPostCommentResponse,
  canonical: string,
): object | null {
  if (comment.isDeleted || comment.isHidden || comment.isSecretMasked) return null

  const text = stripHtmlAndSummarize(comment.content || '', 500)
  if (!text || !comment.createdAt) return null

  const childComments = (comment.children || [])
    .map((child) => buildCommentJsonLd(child, canonical))
    .filter((child): child is object => child !== null)

  return {
    '@type': 'Comment',
    'url': `${canonical}#comment-${comment.id}`,
    'text': text,
    'datePublished': toKstIsoDateTime(comment.createdAt),
    'author': {
      '@type': 'Person',
      'name': comment.authorNickname || 'User',
      'url': comment.authorId ? `${SITE_URL}/ko/users/${comment.authorId}/reviews` : undefined,
    },
    'comment': childComments.length > 0 ? childComments : undefined,
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function plainTextToHtml(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('')
}

function toAbsoluteImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  return url.startsWith('http') ? url : `https://www.caskbycask.net${url}`
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formatDecimal(value: number | string | null | undefined, fractionDigits = 1): string | null {
  const numberValue = toNumber(value)
  if (numberValue == null) return null
  return Number.isInteger(numberValue) ? String(numberValue) : numberValue.toFixed(fractionDigits)
}

function formatCount(value: number | null | undefined, lang: 'ko' | 'en'): string | null {
  if (value == null) return null
  return value.toLocaleString(lang === 'en' ? 'en-US' : 'ko-KR')
}

function formatAbvValue(
  abv: number | string | null | undefined,
  min: number | string | null | undefined,
  max: number | string | null | undefined,
): string | null {
  const minValue = formatDecimal(min)
  const maxValue = formatDecimal(max)
  if (minValue && maxValue) return minValue === maxValue ? `${minValue}%` : `${minValue}%~${maxValue}%`
  if (minValue) return `${minValue}%+`
  if (maxValue) return `~${maxValue}%`
  const single = formatDecimal(abv)
  return single ? `${single}%` : null
}

function formatVolumeValue(
  volumeMl: number | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined,
): string | null {
  if (min != null && max != null) return min === max ? `${min}ml` : `${min}ml~${max}ml`
  if (min != null) return `${min}ml+`
  if (max != null) return `~${max}ml`
  return volumeMl != null ? `${volumeMl}ml` : null
}

function formatDateOnly(value: string | null | undefined): string | null {
  if (!value) return null
  return value.slice(0, 10)
}

function formatAgeParts(years: number | null | undefined, months: number | null | undefined, lang: 'ko' | 'en'): string | null {
  if (years == null && !months) return null
  const parts: string[] = []
  if (years != null) parts.push(lang === 'en' ? `${years} year${years === 1 ? '' : 's'}` : `${years}년`)
  if (months) parts.push(lang === 'en' ? `${months} month${months === 1 ? '' : 's'}` : `${months}개월`)
  return parts.join(' ')
}

function formatAgeStatement(detail: SpiritDetailResponse['commonDetail'], lang: 'ko' | 'en'): string | null {
  if (!detail) return null
  if (detail.isNas) return 'NAS'
  return formatAgeParts(detail.ageStatement, detail.ageStatementMonths, lang)
}

function compactDetails(items: Array<{ label: string; value: string | number | null | undefined }>): Array<{ label: string; value: string }> {
  return items
    .map((item) => ({ label: item.label, value: item.value == null ? '' : String(item.value).trim() }))
    .filter((item) => item.value.length > 0)
}

function categoryLabel(category: string | null | undefined, lang: 'ko' | 'en'): string {
  const labels: Record<string, { ko: string; en: string }> = {
    WHISKY: { ko: '위스키', en: 'Whisky' },
    COGNAC: { ko: '꼬냑', en: 'Cognac' },
    WINE: { ko: '와인', en: 'Wine' },
    OTHER: { ko: '기타 주류', en: 'Other Spirits' },
  }
  if (!category) return lang === 'en' ? 'Spirits' : '주류'
  return labels[category]?.[lang] ?? category
}

function boardLabel(boardType: string | null | undefined, lang: 'ko' | 'en'): string {
  const normalized = boardType?.toUpperCase()
  if (normalized === 'NOTICE') return lang === 'en' ? 'Community Notice' : '커뮤니티 공지'
  if (normalized === 'FREE') return lang === 'en' ? 'Free Board' : '자유게시판'
  if (normalized === 'PHOTO') return lang === 'en' ? 'Spirits Photos' : '주류 사진'
  return lang === 'en' ? 'Community' : '커뮤니티'
}

function localLabels(lang: 'ko' | 'en') {
  return lang === 'en'
    ? {
        home: 'Home',
        spirits: 'Browse spirits',
        community: 'Community',
        byob: 'BYOB gatherings',
        reviews: 'Reviews',
        score: 'Score',
        views: 'Views',
        likes: 'Likes',
        comments: 'Comments',
        abv: 'ABV',
        volume: 'Volume',
        category: 'Category',
        producer: 'Producer',
        country: 'Country',
        region: 'Region',
        age: 'Age statement',
        vintage: 'Vintage',
        bottleNo: 'Bottle No.',
        cask: 'Cask',
        whiskyStyle: 'Whisky style',
        wineType: 'Wine type',
        cognacGrade: 'Cognac grade',
        host: 'Host',
        location: 'Location',
        eventAt: 'Event date',
        recruitEndAt: 'Recruiting until',
        participants: 'Participants',
        hostBottles: 'Host bottles',
        status: 'Status',
      }
    : {
        home: '홈',
        spirits: '주류 탐색',
        community: '커뮤니티',
        byob: 'BYOB 모임',
        reviews: '리뷰',
        score: '평점',
        views: '조회',
        likes: '추천',
        comments: '댓글',
        abv: '도수',
        volume: '용량',
        category: '카테고리',
        producer: '생산자',
        country: '국가',
        region: '지역',
        age: '숙성 연수',
        vintage: '빈티지',
        bottleNo: '병 번호',
        cask: '캐스크',
        whiskyStyle: '위스키 스타일',
        wineType: '와인 타입',
        cognacGrade: '꼬냑 등급',
        host: '호스트',
        location: '장소',
        eventAt: '모임 일시',
        recruitEndAt: '모집 종료',
        participants: '참가 인원',
        hostBottles: '호스트 준비 Bottle',
        status: '상태',
      }
}

interface ParsedPath {
  type: 'home' | 'spirits-list' | 'spirit-detail' | 'community-list' | 'community-detail'
    | 'notices-list' | 'notice-detail' | 'byob-detail' | 'tier-list'
    | 'youtube-list' | 'youtube-detail' | 'youtube-channel' | 'review-detail'
    | 'noindex' | 'default' | 'not-found'
  lang: 'ko' | 'en' | null
  spiritId?: string
  /** 공개 리뷰 상세의 리뷰 id. 정본은 그 리뷰가 달린 주류 상세다. */
  reviewId?: string
  boardType?: string
  boardListType?: BoardListType
  postId?: string
  canonicalPath?: string
  tierListShareKey?: string
  /** 유튜브 영상 ID (11자). DB PK 가 아니라 유튜브 쪽 식별자다. */
  youtubeVideoKey?: string
  /** 채널 식별자 — 핸들(@ 제외) 또는 채널 ID. */
  youtubeChannelRef?: string
  /** Public API resource used only to distinguish a real 404 from restricted/unavailable content. */
  resourcePath?: string
}

function isKnownPrivatePath(segments: string[]): boolean {
  const path = segments.join('/')
  const exact = new Set([
    'login', 'signup', 'oauth/callback', 'oauth/signup', 'account-recovery', 'inquiry',
    'notifications', 'mypage', 'price-tracker/register',
    'taste-trees/new', 'taste-trees/mine', 'photo-card',
    'request/spirit', 'request/spirit/my', 'request/producer',
    'request/feedback', 'request/feedback/new',
  ])
  if (exact.has(path)) return true
  return [
    /^taste-trees\/\d+\/edit$/,
    /^spirits\/\d+\/review\/write$/,
    /^spirits\/\d+\/review\/\d+\/edit$/,
    /^community\/(?:all|notice|free|byob|photo)\/write$/,
    /^community\/(?:all|notice|free|byob|photo)\/\d+\/edit$/,
    /^request\/feedback\/\d+(?:\/edit)?$/,
  ].some((pattern) => pattern.test(path))
}

function isKnownAdminPath(segments: string[]): boolean {
  if (segments[0] !== 'admin') return false
  const path = segments.slice(1).join('/')
  const exact = new Set([
    '', 'users', 'users/nickname-bad-words', 'spirits', 'spirits/new',
    'spirits/requests', 'spirits/variant-requests', 'spirits/wine-crawler',
    'producers', 'producers/requests',
    'reports', 'notices', 'notices/new', 'popups', 'popups/new', 'banners',
    'banners/new', 'gnb-menus', 'events', 'community/post-reports', 'community/ai-news',
    'community/ai-news/new', 'community/bad-words', 'community/emojis',
    'community/prefixes', 'social', 'price-reports', 'stores', 'deals', 'score/points',
    'score/levels', 'legal', 'legal/new', 'emails/send', 'emails/history',
    'inquiries', 'logs', 'faq', 'faq/new', 'taste-trees', 'taste-trees/new',
    'photo-cards', 'youtube',
  ])
  if (exact.has(path)) return true
  return [
    /^users\/\d+$/,
    /^spirits\/(?:requests\/)?\d+$/,
    /^producers\/requests\/\d+$/,
    /^notices\/\d+(?:\/edit)?$/,
    /^(?:popups|banners)\/\d+\/edit$/,
    /^community\/ai-news\/\d+\/edit$/,
    /^(?:price-reports|deals)\/\d+$/,
    /^(?:legal|faq|taste-trees)\/\d+\/edit$/,
  ].some((pattern) => pattern.test(path))
}

/**
 * 경로 세그먼트를 분석하여 언어 코드와 타겟 페이지 정보를 분류합니다.
 * @param segments URL 경로 세그먼트 배열
 */
export function parsePath(segments: string[]): ParsedPath {
  if (segments.length === 0) {
    return { type: 'home', lang: null }
  }

  let lang: 'ko' | 'en' | null = null
  const remaining = [...segments]

  if (segments[0] === 'ko' || segments[0] === 'en') {
    lang = segments[0] as 'ko' | 'en'
    remaining.shift()
  }

  if (remaining.length === 0) {
    return { type: 'home', lang }
  }

  if (isKnownPrivatePath(remaining) || isKnownAdminPath(remaining)) {
    return { type: 'noindex', lang }
  }
  if (remaining[0] === 'admin') return { type: 'not-found', lang }

  // 1) /spirits
  if (remaining[0] === 'spirits') {
    if (remaining.length === 1) {
      return { type: 'spirits-list', lang }
    }
    if (remaining.length === 2 && extractLeadingId(remaining[1])) {
      return { type: 'spirit-detail', lang, spiritId: remaining[1] }
    }
    return { type: 'not-found', lang }
  }

  // 2) /notices
  if (remaining[0] === 'notices') {
    if (remaining.length === 1) {
      return { type: 'notices-list', lang, boardListType: 'notices' }
    }
    if (remaining.length === 2 && extractLeadingId(remaining[1])) {
      const postId = extractLeadingId(remaining[1])!
      return {
        type: 'notice-detail',
        lang,
        postId: remaining[1],
        resourcePath: `/api/notices/${postId}`,
      }
    }
    return { type: 'not-found', lang }
  }

  // 3) /community
  if (remaining[0] === 'community') {
    const board = remaining[1] as BoardListType | undefined
    if (!board || !['all', 'notice', 'free', 'byob', 'photo'].includes(board)) {
      return { type: 'not-found', lang }
    }
    if (remaining.length === 2) {
      return { type: 'community-list', lang, boardListType: board }
    }
    if (!extractLeadingId(remaining[2])) {
      return { type: 'not-found', lang }
    }
    if (remaining.length === 3 && board === 'byob') {
      const postId = extractLeadingId(remaining[2])!
      return {
        type: 'byob-detail',
        lang,
        postId: remaining[2],
        resourcePath: `/api/byob/${postId}`,
      }
    }
    if (remaining.length === 3 && board !== 'all') {
      const postId = extractLeadingId(remaining[2])!
      return {
        type: 'community-detail',
        lang,
        boardType: board,
        postId: remaining[2],
        resourcePath: `/api/posts/${postId}`,
      }
    }
    return { type: 'not-found', lang }
  }

  const knownPublicRoots = new Set([
    'ranking', 'terms', 'privacy', 'operation-policy', 'faq', 'calendar', 'social',
  ])
  if (remaining.length === 1 && knownPublicRoots.has(remaining[0])) {
    return { type: 'default', lang, canonicalPath: remaining.join('/') }
  }

  if (remaining[0] === 'youtube') {
    if (remaining.length === 1) {
      return { type: 'youtube-list', lang, canonicalPath: 'youtube' }
    }
    // 채널 페이지. 식별자는 핸들(@ 제외) 또는 채널 ID 다.
    if (remaining.length === 3 && remaining[1] === 'channels'
        && /^[A-Za-z0-9._-]{3,64}$/.test(remaining[2])) {
      return {
        type: 'youtube-channel',
        lang,
        canonicalPath: remaining.join('/'),
        youtubeChannelRef: remaining[2],
        resourcePath: `/api/youtube/channels/${encodeURIComponent(remaining[2])}`,
      }
    }
    // 영상 ID 는 11자 고정이다. 형식이 다르면 API 를 두드리기 전에 404 로 끊는다.
    if (remaining.length === 2 && /^[A-Za-z0-9_-]{11}$/.test(remaining[1])) {
      return {
        type: 'youtube-detail',
        lang,
        canonicalPath: remaining.join('/'),
        youtubeVideoKey: remaining[1],
        resourcePath: `/api/youtube/videos/${remaining[1]}`,
      }
    }
    return { type: 'not-found', lang }
  }

  if (remaining[0] === 'reviews') {
    if (remaining.length === 2 && /^\d+$/.test(remaining[1])) {
      return {
        type: 'review-detail',
        lang,
        reviewId: remaining[1],
        canonicalPath: remaining.join('/'),
        resourcePath: `/api/public/reviews/${remaining[1]}`,
      }
    }
    return { type: 'not-found', lang }
  }

  if (remaining[0] === 'tier-lists' && remaining.length <= 2) {
    return {
      type: 'tier-list',
      lang,
      canonicalPath: remaining.join('/'),
      tierListShareKey: remaining[1],
      resourcePath: remaining.length === 2
        ? `/api/tier-lists/share/${encodeURIComponent(remaining[1])}`
        : undefined,
    }
  }
  if (remaining[0] === 'taste-trees') {
    if (remaining.length === 1 || (remaining.length === 3 && remaining[1] === 't')) {
      return {
        type: 'default',
        lang,
        canonicalPath: remaining.join('/'),
        resourcePath: remaining.length === 3
          ? `/api/taste-trees/share/${encodeURIComponent(remaining[2])}`
          : undefined,
      }
    }
    return { type: 'not-found', lang }
  }
  if (remaining[0] === 'users' && remaining.length === 3
      && ['bottles', 'reviews'].includes(remaining[2]) && /^\d+$/.test(remaining[1])) {
    return {
      type: 'default',
      lang,
      canonicalPath: remaining.join('/'),
      // Both public profile routes use the bottle endpoint as a lightweight user-existence probe.
      resourcePath: `/api/users/${remaining[1]}/bottles?page=0&size=1`,
    }
  }
  if (remaining[0] === 'producers' && remaining.length === 2 && /^\d+$/.test(remaining[1])) {
    return {
      type: 'default',
      lang,
      canonicalPath: remaining.join('/'),
      resourcePath: `/api/producers/${remaining[1]}`,
    }
  }
  if (remaining[0] === 'price-tracker') {
    if (remaining.length === 1
        || (remaining.length === 3 && remaining[1] === 'spirits' && /^\d+$/.test(remaining[2]))) {
      return {
        type: 'default',
        lang,
        canonicalPath: remaining.join('/'),
        resourcePath: remaining.length === 3 ? `/api/seo/spirits/${remaining[2]}` : undefined,
      }
    }
    return { type: 'not-found', lang }
  }

  return { type: 'not-found', lang }
}

/**
 * Returns true only for an authoritative missing response. Restricted content (401/403)
 * and temporary upstream failures must not be converted into a permanent-looking 404.
 */
export async function isApiResourceNotFound(path: string, revalidate = 60): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}${path}`, { next: { revalidate } })
    return response.status === 404 || response.status === 410
  } catch {
    return false
  }
}

const BOARD_LIST_CONFIG: Record<BoardListType, {
  path: string
  eyebrow: { ko: string; en: string }
  title: { ko: string; en: string }
  description: { ko: string; en: string }
}> = {
  all: {
    path: '/community/all',
    eyebrow: { ko: '주류 커뮤니티', en: 'Spirits Community' },
    title: { ko: '커뮤니티 전체 게시판 — CaskByCask', en: 'Community Boards — CaskByCask' },
    description: {
      ko: '위스키·와인·꼬냑 등 주류 관련 소식과 자유로운 이야기, BYOB 모임을 한곳에서 확인하세요.',
      en: 'Browse spirits news, community discussions, and BYOB gatherings on CaskByCask.',
    },
  },
  notice: {
    path: '/community/notice',
    eyebrow: { ko: '커뮤니티 소식', en: 'Community News' },
    title: { ko: '주류 소식·이벤트 게시판 — CaskByCask', en: 'Spirits News and Events — CaskByCask' },
    description: {
      ko: '위스키·와인·꼬냑 신제품, 업계 동향, 증류소 소식과 커뮤니티 이벤트를 확인하세요.',
      en: 'Read product releases, industry updates, distillery news, and community events.',
    },
  },
  photo: {
    path: '/community/photo',
    eyebrow: { ko: '주류 사진', en: 'Spirits Photos' },
    title: { ko: '위스키·와인·꼬냑 사진 갤러리 — CaskByCask', en: 'Spirits Photo Gallery — CaskByCask' },
    description: {
      ko: '오늘의 한 잔, 바에서의 한 컷. 촬영 정보와 주류 정보를 함께 담은 회원들의 사진을 모았습니다.',
      en: "Today's dram, a shot at the bar. Member photos with shot data and spirit details.",
    },
  },
  free: {
    path: '/community/free',
    eyebrow: { ko: '주류 커뮤니티', en: 'Spirits Community' },
    title: { ko: '위스키·와인·꼬냑 자유게시판 — CaskByCask', en: 'Spirits Community Board — CaskByCask' },
    description: {
      ko: '위스키·와인·꼬냑 등 주류에 관한 테이스팅 경험, 질문과 정보를 자유롭게 나누는 게시판입니다.',
      en: 'Share tasting experiences, questions, and information about whisky, wine, cognac, and other spirits.',
    },
  },
  byob: {
    path: '/community/byob',
    eyebrow: { ko: 'BYOB 모임', en: 'BYOB Gatherings' },
    title: { ko: 'BYOB 주류 모임 모집 — CaskByCask', en: 'BYOB Spirits Gatherings — CaskByCask' },
    description: {
      ko: '각자 술을 가져와 함께 시음하는 BYOB 모임의 일정, 장소와 모집 현황을 확인하세요.',
      en: 'Find BYOB tasting gatherings, schedules, locations, and recruitment status.',
    },
  },
  notices: {
    path: '/notices',
    eyebrow: { ko: '서비스 안내', en: 'Service Updates' },
    title: { ko: 'CaskByCask 공지사항', en: 'CaskByCask Notices' },
    description: {
      ko: 'CaskByCask의 서비스 업데이트, 이벤트, 점검 일정과 주요 공지사항을 확인하세요.',
      en: 'Read CaskByCask service updates, events, maintenance schedules, and important notices.',
    },
  },
}

function buildRobots(index: boolean): Metadata['robots'] {
  return {
    index,
    follow: true,
    googleBot: {
      index,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  }
}

export function getNoindexMetadata(
  lang: 'ko' | 'en' | null,
  title?: string,
): Metadata {
  const resolvedLang = normalizeLang(lang)
  return {
    title: title || (resolvedLang === 'en' ? 'Page — CaskByCask' : '페이지 — CaskByCask'),
    robots: buildRobots(false),
  }
}

export async function getBoardListMetadata(
  board: BoardListType,
  lang: 'ko' | 'en' | null,
  noindex = false,
  pageNumber = 0,
): Promise<Metadata> {
  const resolvedLang = normalizeLang(lang)
  // 범위를 벗어난 페이지는 빈 목록이라 색인 가치가 없다. 링크 추적은 계속 허용한다.
  // (조회는 스냅샷 렌더링과 같은 요청·같은 캐시 키를 쓰므로 왕복이 늘지 않는다)
  const outOfRange = pageNumber > 0 && (await fetchBoardListPage(board, pageNumber)).outOfRange
  const config = BOARD_LIST_CONFIG[board]
  const brandedTitle = config.title[resolvedLang]
  const title = pageNumber > 0
    ? `${withPageSuffix(
        brandedTitle.replace(/\s+—\s+CaskByCask$/, ''), pageNumber, resolvedLang,
      )} — CaskByCask`
    : brandedTitle
  const description = config.description[resolvedLang]
  // 게시판 본문은 별도 영문 번역 데이터가 없으므로 검색 신호를 한국어 원문으로 통합한다.
  // 페이지네이션은 self-canonical 이다 — 뒤 페이지를 1페이지로 정규화하면 그 페이지에만
  // 실린 게시글이 색인 대상에서 통째로 사라진다.
  // 다만 실재하지 않는 페이지는 형식이 어긋난 page 값과 마찬가지로 기본 목록으로 모은다.
  const canonical = `${SITE_URL}${buildListPageHref(`/ko${config.path}`, outOfRange ? 0 : pageNumber)}`

  return {
    title,
    description,
    robots: buildRobots(!noindex && !outOfRange),
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      siteName: 'CaskByCask',
      locale: resolvedLang === 'en' ? 'en_US' : 'ko_KR',
      images: [{ url: DEFAULT_OG_IMAGE, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  }
}

interface BoardListPageData {
  items: SeoSnapshotItem[]
  totalElements?: number
  totalPages: number
  /** 존재하지 않는 페이지를 요청했는지. 빈 목록을 색인시키지 않으려고 본다. */
  outOfRange: boolean
}

/**
 * 게시판 목록 한 페이지를 읽는다.
 * <p>metadata 와 SSR 스냅샷이 같은 판단(범위·항목)을 내려야 하므로 조회를 한 곳으로 모은다.
 * 두 호출은 같은 요청 안에서 같은 URL·같은 revalidate 를 쓰므로 fetch 캐시가 합쳐 준다.
 */
async function fetchBoardListPage(
  board: BoardListType,
  pageNumber: number,
): Promise<BoardListPageData> {
  let items: SeoSnapshotItem[] = []
  let totalElements: number | undefined
  let totalPages = 0
  let loaded = false

  if (board === 'notices') {
    const page = await fetchApiData<PageResponse<NoticeListItemResponse>>(
      `/api/notices?page=${pageNumber}&size=20`, 300)
    loaded = page != null
    totalElements = page?.totalElements
    totalPages = page?.totalPages ?? 0
    items = (page?.content || []).map((notice) => ({
      title: notice.title,
      href: `/ko/notices/${notice.id}`,
      description: notice.category || null,
      meta: formatDateOnly(notice.createdAt),
    }))
  } else if (board === 'byob') {
    const page = await fetchApiData<PageResponse<ByobListItemResponse>>(
      `/api/byob?page=${pageNumber}&size=12`, 60)
    loaded = page != null
    totalElements = page?.totalElements
    totalPages = page?.totalPages ?? 0
    items = (page?.content || [])
      .filter((byob) => byob.status !== 'CANCELLED')
      .map((byob) => ({
        title: byob.title,
        href: `/ko/community/byob/${byob.id}`,
        description: byob.location || null,
        meta: formatDateOnly(byob.eventAt),
      }))
  } else {
    const boardType = board === 'notice' ? 'NOTICE'
      : board === 'free' ? 'FREE'
      : board === 'photo' ? 'PHOTO' : null
    const query = new URLSearchParams({ page: String(pageNumber), size: '20', sort: 'LATEST' })
    if (boardType) query.set('boardType', boardType)
    const page = await fetchApiData<PageResponse<CommunityPostListItemResponse>>(`/api/posts?${query.toString()}`, 60)
    loaded = page != null
    totalElements = page?.totalElements
    totalPages = page?.totalPages ?? 0
    items = (page?.content || [])
      .filter((post) => !isRestrictedPost(post))
      .map((post) => {
        const pathBoard = (post.boardType || 'FREE').toLowerCase()
        return {
          title: post.title,
          href: `/ko/community/${pathBoard}/${post.id}`,
          description: post.authorNickname || null,
          meta: formatDateOnly(post.createdAt),
        }
      })
  }

  // API 장애 중에는 범위를 판정하지 않는다. 일시 장애를 noindex 로 바꾸면 색인이 빠진다.
  const outOfRange = loaded && pageNumber > 0
    && (totalPages > 0 ? pageNumber >= totalPages : items.length === 0)
  return { items, totalElements, totalPages, outOfRange }
}

export async function getBoardListSeoSnapshot(
  board: BoardListType,
  lang: 'ko' | 'en' | null,
  searchParams: MetadataSearchParams = {},
): Promise<SeoSnapshotData> {
  const resolvedLang = normalizeLang(lang)
  const config = BOARD_LIST_CONFIG[board]
  const canonicalPath = `/ko${config.path}`
  const pageNumber = readPageParam(searchParams)
  const { items, totalElements, totalPages } = await fetchBoardListPage(board, pageNumber)

  const countLabel = resolvedLang === 'en' ? 'Public posts' : '공개 글'
  const itemsHeading = board === 'notices'
    ? (resolvedLang === 'en' ? 'Notices' : '공지사항 목록')
    : board === 'byob'
      ? (resolvedLang === 'en' ? 'BYOB gatherings' : 'BYOB 모임 목록')
      : (resolvedLang === 'en' ? 'Latest public posts' : '최신 공개 글')
  return {
    kind: 'board-list',
    lang: resolvedLang,
    eyebrow: config.eyebrow[resolvedLang],
    title: withPageSuffix(
      config.title[resolvedLang].replace(/\s+—\s+CaskByCask$/, ''),
      pageNumber,
      resolvedLang,
    ),
    description: config.description[resolvedLang],
    image: null,
    metrics: totalElements == null
      ? []
      : [{ label: countLabel, value: totalElements.toLocaleString(resolvedLang === 'en' ? 'en-US' : 'ko-KR') }],
    details: [],
    items,
    itemsHeading,
    pagination: buildSeoPagination(canonicalPath, pageNumber, totalPages),
    links: [
      { label: resolvedLang === 'en' ? 'Home' : '홈', href: '/ko' },
      { label: config.eyebrow[resolvedLang], href: canonicalPath },
    ],
  }
}

export function buildBoardListJsonLd(
  board: BoardListType,
  snapshot: SeoSnapshotData,
): object | null {
  if (snapshot.lang === 'en') return null
  // 커뮤니티는 2순위다. 뒤 페이지까지 CollectionPage·ItemList 를 반복해서 내보내면
  // 1순위인 주류 카탈로그의 구조화 데이터와 같은 무게로 경쟁하게 된다.
  // 게시글로 내려가는 크롤 경로는 SSR 앵커가 이미 맡고 있으므로 1페이지에만 붙인다.
  if ((snapshot.pagination?.current ?? 0) > 0) return null

  const config = BOARD_LIST_CONFIG[board]
  const canonical = `${SITE_URL}/ko${config.path}`
  const itemListId = `${canonical}#item-list`
  const breadcrumbId = `${canonical}#breadcrumb`
  const itemListElements = (snapshot.items || []).map((item, index) => ({
    '@type': 'ListItem',
    'position': index + 1,
    'url': `${SITE_URL}${item.href}`,
    'name': item.title,
  }))

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': canonical,
        'url': canonical,
        'name': config.title.ko,
        'description': config.description.ko,
        'inLanguage': 'ko-KR',
        'isPartOf': { '@id': `${SITE_URL}/ko#website` },
        'breadcrumb': { '@id': breadcrumbId },
        'mainEntity': itemListElements.length > 0 ? { '@id': itemListId } : undefined,
      },
      {
        '@type': 'BreadcrumbList',
        '@id': breadcrumbId,
        'itemListElement': [
          {
            '@type': 'ListItem',
            'position': 1,
            'name': '홈',
            'item': `${SITE_URL}/ko`,
          },
          {
            '@type': 'ListItem',
            'position': 2,
            'name': config.eyebrow.ko,
            'item': canonical,
          },
        ],
      },
      ...(itemListElements.length > 0 ? [{
        '@type': 'ItemList',
        '@id': itemListId,
        'numberOfItems': itemListElements.length,
        'itemListElement': itemListElements,
      }] : []),
    ],
  }
}

// ─── 유튜브 갤러리 ──────────────────────────────────────────
//
// 영상은 유튜브에 있고 우리는 임베드해 보여 준다. 그래서 구조화 데이터의 publisher 는
// 우리가 아니라 채널이고, contentUrl(호스팅 파일 주소)은 쓰지 않는다.
// 재생시간·조회수는 수집하지 않으므로 duration·interactionStatistic 도 넣지 않는다 —
// 모르는 값을 채우면 구조화 데이터에 거짓을 심게 된다.

interface YoutubeVideoSeoResponse {
  videoKey: string
  title: string
  description: string | null
  thumbnailUrl: string | null
  videoType: string
  publishedAt: string
  embedUrl: string
  channel: { title: string; handle: string | null; channelUrl: string }
  spiritTags: Array<{ spiritId: number; nameKo: string; nameEn: string | null }>
}

const YOUTUBE_SEO_TEXT = {
  ko: {
    eyebrow: '주류 유튜브',
    title: '위스키·와인·꼬냑 유튜브 갤러리 — CaskByCask',
    description: '허락을 받고 소개하는 국내 주류 유튜브 채널의 최신 영상과 숏츠를 한곳에서 모아 봅니다.',
    heading: '최신 영상',
  },
  en: {
    eyebrow: 'Spirits on YouTube',
    title: 'Whisky, Wine and Cognac YouTube Gallery — CaskByCask',
    description: 'Latest videos and shorts from Korean spirits YouTube channels, featured with their creators’ permission.',
    heading: 'Latest videos',
  },
} as const

/** 목록·상세가 공유하는 메타데이터 조립. 게시판 목록(getBoardListMetadata)과 같은 모양이다. */
function buildYoutubeMetadata(options: {
  title: string
  description: string
  canonical: string
  lang: 'ko' | 'en'
  index: boolean
  image?: string
  ogType?: 'website' | 'article'
}): Metadata {
  const image = options.image || DEFAULT_OG_IMAGE
  // 유튜브 갤러리는 ko/en 양쪽이 sitemap 에 등재된 다국어 경로다. hreflang 을 빼면 두 언어판이
  // 서로를 모르는 채 색인되고, SPA 는 이미 hreflang 을 내보내므로 렌더링 전후 신호도 어긋난다.
  const koCanonical = options.canonical.replace(`${SITE_URL}/en/`, `${SITE_URL}/ko/`)
  const enCanonical = options.canonical.replace(`${SITE_URL}/ko/`, `${SITE_URL}/en/`)
  return {
    title: options.title,
    description: options.description,
    robots: buildRobots(options.index),
    alternates: {
      canonical: options.canonical,
      languages: { ko: koCanonical, en: enCanonical, 'x-default': koCanonical },
    },
    openGraph: {
      title: options.title,
      description: options.description,
      url: options.canonical,
      type: options.ogType ?? 'website',
      siteName: 'CaskByCask',
      locale: options.lang === 'en' ? 'en_US' : 'ko_KR',
      images: [{ url: image, alt: options.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: options.title,
      description: options.description,
      images: [image],
    },
  }
}

export function getYoutubeListMetadata(lang: 'ko' | 'en' | null, noindex = false): Metadata {
  const resolvedLang = normalizeLang(lang)
  const text = YOUTUBE_SEO_TEXT[resolvedLang]
  return buildYoutubeMetadata({
    title: text.title,
    description: text.description,
    canonical: `${SITE_URL}/${resolvedLang}/youtube`,
    lang: resolvedLang,
    index: !noindex,
  })
}

async function getYoutubeVideo(videoKey: string): Promise<YoutubeVideoSeoResponse | null> {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoKey)) return null
  return fetchApiData<YoutubeVideoSeoResponse>(`/api/youtube/videos/${videoKey}`, 300)
}

export async function getYoutubeVideoMetadata(
  videoKey: string,
  lang: 'ko' | 'en' | null,
): Promise<Metadata> {
  const video = await getYoutubeVideo(videoKey)
  const resolvedLang = normalizeLang(lang)
  if (!video) {
    return getNoindexMetadata(lang, resolvedLang === 'en'
      ? 'Video not found — CaskByCask'
      : '존재하지 않는 영상 — CaskByCask')
  }
  return buildYoutubeMetadata({
    title: `${video.title} — ${video.channel.title} | CaskByCask`,
    description: video.description?.slice(0, 200) || YOUTUBE_SEO_TEXT[resolvedLang].description,
    canonical: `${SITE_URL}/${resolvedLang}/youtube/${video.videoKey}`,
    lang: resolvedLang,
    index: true,
    image: video.thumbnailUrl ?? undefined,
    ogType: 'article',
  })
}

export async function getYoutubeVideoJsonLd(videoKey: string): Promise<object | null> {
  const video = await getYoutubeVideo(videoKey)
  if (!video) return null

  const canonical = `${SITE_URL}/ko/youtube/${video.videoKey}`
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    'name': video.title,
    'description': video.description || video.title,
    'thumbnailUrl': [video.thumbnailUrl ?? `https://i.ytimg.com/vi/${video.videoKey}/hqdefault.jpg`],
    'uploadDate': video.publishedAt,
    'embedUrl': video.embedUrl,
    'url': canonical,
    'publisher': {
      '@type': 'Organization',
      'name': video.channel.title,
      'url': video.channel.channelUrl,
    },
    ...(video.spiritTags.length > 0 ? {
      'about': video.spiritTags.map((tag) => ({
        '@type': 'Product',
        'name': tag.nameKo,
        'url': `${SITE_URL}/ko/spirits/${tag.spiritId}`,
      })),
    } : {}),
  }
}

interface YoutubeChannelSeoResponse {
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

async function getYoutubeChannel(ref: string): Promise<YoutubeChannelSeoResponse | null> {
  if (!/^[A-Za-z0-9._-]{3,64}$/.test(ref)) return null
  return fetchApiData<YoutubeChannelSeoResponse>(
    `/api/youtube/channels/${encodeURIComponent(ref)}`, 300)
}

/** 채널 페이지의 정본 주소 조각. 핸들이 있으면 사람이 읽는 쪽을 쓴다. */
function youtubeChannelRef(channel: YoutubeChannelSeoResponse): string {
  return channel.handle ?? channel.channelKey
}

export async function getYoutubeChannelMetadata(
  ref: string,
  lang: 'ko' | 'en' | null,
): Promise<Metadata> {
  const channel = await getYoutubeChannel(ref)
  const resolvedLang = normalizeLang(lang)
  if (!channel) {
    return getNoindexMetadata(lang, resolvedLang === 'en'
      ? 'Channel not found — CaskByCask'
      : '존재하지 않는 채널 — CaskByCask')
  }

  const description = (resolvedLang === 'en' ? channel.descriptionEn : channel.description)
    || channel.description
  return buildYoutubeMetadata({
    title: resolvedLang === 'en'
      ? `Videos from ${channel.title} — CaskByCask`
      : `${channel.title} 영상 모음 — CaskByCask`,
    description: description
      || (resolvedLang === 'en'
        ? `The latest videos and shorts from ${channel.title}.`
        : `${channel.title} 채널의 최신 영상과 숏츠를 모았습니다.`),
    canonical: `${SITE_URL}/${resolvedLang}/youtube/channels/${youtubeChannelRef(channel)}`,
    lang: resolvedLang,
    index: true,
    image: channel.thumbnailUrl ?? undefined,
  })
}

/**
 * 채널 페이지 구조화 데이터.
 * <p>`about` 이 채널(Organization)이고 `sameAs` 로 유튜브 채널 홈을 가리킨다 —
 * 이 페이지가 <b>채널을 소개하는 페이지</b>임을 밝히고, 우리가 채널 본인인 척하지 않는다.
 */
export async function getYoutubeChannelJsonLd(ref: string): Promise<object | null> {
  const channel = await getYoutubeChannel(ref)
  if (!channel) return null

  const canonical = `${SITE_URL}/ko/youtube/channels/${youtubeChannelRef(channel)}`
  const videos = await fetchApiData<PageResponse<YoutubeVideoSeoResponse>>(
    `/api/youtube/videos?page=0&size=24&channelId=${channel.id}`, 300)

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    'name': channel.title,
    'description': channel.description || undefined,
    'url': canonical,
    'inLanguage': 'ko-KR',
    'about': {
      '@type': 'Organization',
      'name': channel.title,
      'url': channel.channelUrl,
      'sameAs': [channel.channelUrl],
      ...(channel.thumbnailUrl ? { logo: channel.thumbnailUrl } : {}),
    },
    ...(videos?.content?.length
      ? {
        'mainEntity': {
          '@type': 'ItemList',
          'numberOfItems': videos.content.length,
          'itemListElement': videos.content.map((video, index) => ({
            '@type': 'ListItem',
            'position': index + 1,
            'name': video.title,
            'url': `${SITE_URL}/ko/youtube/${video.videoKey}`,
          })),
        },
      }
      : {}),
  }
}

export async function getYoutubeChannelSeoSnapshot(
  ref: string,
  lang: 'ko' | 'en' | null,
): Promise<SeoSnapshotData | null> {
  const channel = await getYoutubeChannel(ref)
  if (!channel) return null
  const resolvedLang = normalizeLang(lang)

  const videos = await fetchApiData<PageResponse<YoutubeVideoSeoResponse>>(
    `/api/youtube/videos?page=0&size=20&channelId=${channel.id}`, 300)
  const items: SeoSnapshotItem[] = (videos?.content || []).map((video) => ({
    title: video.title,
    href: `/${resolvedLang}/youtube/${video.videoKey}`,
    description: video.channel.title,
    meta: formatDateOnly(video.publishedAt),
  }))

  return {
    kind: 'youtube',
    lang: resolvedLang,
    eyebrow: YOUTUBE_SEO_TEXT[resolvedLang].eyebrow,
    title: channel.title,
    subtitle: channel.handle ? `@${channel.handle}` : null,
    description: (resolvedLang === 'en' ? channel.descriptionEn : channel.description)
      || channel.description,
    image: channel.thumbnailUrl,
    metrics: [{
      label: resolvedLang === 'en' ? 'Videos' : '영상',
      value: channel.videoCount.toLocaleString(resolvedLang === 'en' ? 'en-US' : 'ko-KR'),
    }],
    details: [],
    items,
    itemsHeading: resolvedLang === 'en' ? 'Videos from this channel' : '이 채널의 영상',
    links: [
      { label: resolvedLang === 'en' ? 'Home' : '홈', href: `/${resolvedLang}` },
      { label: YOUTUBE_SEO_TEXT[resolvedLang].eyebrow, href: `/${resolvedLang}/youtube` },
    ],
  }
}

export async function getYoutubeListSeoSnapshot(lang: 'ko' | 'en' | null): Promise<SeoSnapshotData> {
  const resolvedLang = normalizeLang(lang)
  const text = YOUTUBE_SEO_TEXT[resolvedLang]
  const page = await fetchApiData<PageResponse<YoutubeVideoSeoResponse>>(
    '/api/youtube/videos?page=0&size=20', 300)

  const items: SeoSnapshotItem[] = (page?.content || []).map((video) => ({
    title: video.title,
    href: `/${resolvedLang}/youtube/${video.videoKey}`,
    description: video.channel.title,
    meta: formatDateOnly(video.publishedAt),
  }))

  return {
    kind: 'youtube',
    lang: resolvedLang,
    eyebrow: text.eyebrow,
    title: text.title.replace(/\s+—\s+CaskByCask$/, ''),
    description: text.description,
    image: null,
    metrics: page?.totalElements == null ? [] : [{
      label: resolvedLang === 'en' ? 'Videos' : '영상',
      value: page.totalElements.toLocaleString(resolvedLang === 'en' ? 'en-US' : 'ko-KR'),
    }],
    details: [],
    items,
    itemsHeading: text.heading,
    links: [
      { label: resolvedLang === 'en' ? 'Home' : '홈', href: `/${resolvedLang}` },
      { label: text.eyebrow, href: `/${resolvedLang}/youtube` },
    ],
  }
}

export async function getYoutubeVideoSeoSnapshot(
  videoKey: string,
  lang: 'ko' | 'en' | null,
): Promise<SeoSnapshotData | null> {
  const video = await getYoutubeVideo(videoKey)
  if (!video) return null
  const resolvedLang = normalizeLang(lang)

  return {
    kind: 'youtube',
    lang: resolvedLang,
    eyebrow: YOUTUBE_SEO_TEXT[resolvedLang].eyebrow,
    title: video.title,
    subtitle: video.channel.title,
    description: video.description,
    image: video.thumbnailUrl,
    metrics: [],
    details: [
      {
        label: resolvedLang === 'en' ? 'Channel' : '채널',
        value: video.channel.handle ? `@${video.channel.handle}` : video.channel.title,
      },
      {
        label: resolvedLang === 'en' ? 'Published' : '게시일',
        value: formatDateOnly(video.publishedAt) ?? '',
      },
    ],
    // 태그된 주류로 이어지는 내부 링크 — 갤러리와 카탈로그를 잇는 자리다.
    items: video.spiritTags.map((tag) => ({
      title: resolvedLang === 'en' ? tag.nameEn || tag.nameKo : tag.nameKo,
      href: `/${resolvedLang}/spirits/${tag.spiritId}`,
    })),
    itemsHeading: resolvedLang === 'en' ? 'Featured spirits' : '영상에 나온 주류',
    links: [
      { label: resolvedLang === 'en' ? 'Home' : '홈', href: `/${resolvedLang}` },
      { label: YOUTUBE_SEO_TEXT[resolvedLang].eyebrow, href: `/${resolvedLang}/youtube` },
    ],
  }
}

async function getNoticeDetail(id: string): Promise<NoticeDetailResponse | null> {
  const numericId = extractLeadingId(id)
  if (!numericId) return null
  return fetchApiData<NoticeDetailResponse>(`/api/notices/${numericId}`, 300)
}

export async function getNoticeDetailMetadata(
  id: string,
  lang: 'ko' | 'en' | null,
): Promise<Metadata> {
  const notice = await getNoticeDetail(id)
  if (!notice) return getNoindexMetadata(lang, '존재하지 않는 공지사항 — CaskByCask')

  const numericId = extractLeadingId(id)!
  const title = `${notice.title} — CaskByCask`
  const description = stripHtmlAndSummarize(notice.contentSanitized || '', 160)
    || `CaskByCask 공지사항 — ${notice.title}`
  const canonical = `${SITE_URL}/ko/notices/${numericId}`
  const ogImage = toAbsoluteImageUrl(notice.images?.[0]?.imageUrl) || DEFAULT_OG_IMAGE

  return {
    title,
    description,
    robots: buildRobots(true),
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
      siteName: 'CaskByCask',
      locale: 'ko_KR',
      publishedTime: toKstIsoDateTime(notice.createdAt),
      modifiedTime: toKstIsoDateTime(notice.updatedAt || notice.createdAt),
      images: [{ url: ogImage, alt: notice.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export async function getNoticeDetailSeoSnapshot(
  id: string,
  lang: 'ko' | 'en' | null,
): Promise<SeoSnapshotData | null> {
  const notice = await getNoticeDetail(id)
  if (!notice) return null

  const numericId = extractLeadingId(id)!
  const resolvedLang = normalizeLang(lang)
  const bodyHtml = notice.contentSanitized || ''
  const description = stripHtmlAndSummarize(bodyHtml, 220)
  // 공지도 같은 에디터를 쓰므로 본문에 주류 카드가 들어온다. 게시글과 같은 처리를 한다.
  const spiritLinks = await getSpiritLinksForPost(parseSpiritEmbeds(bodyHtml), resolvedLang)
  return {
    kind: 'notice',
    lang: resolvedLang,
    eyebrow: resolvedLang === 'en' ? 'Service Notice' : '공지사항',
    title: notice.title,
    description,
    image: toAbsoluteImageUrl(notice.images?.[0]?.imageUrl),
    metrics: compactDetails([
      { label: resolvedLang === 'en' ? 'Views' : '조회', value: formatCount(notice.viewCount, resolvedLang) },
      { label: resolvedLang === 'en' ? 'Recommendations' : '추천', value: formatCount(notice.recommendCount, resolvedLang) },
    ]),
    details: compactDetails([
      { label: resolvedLang === 'en' ? 'Category' : '카테고리', value: notice.category },
      { label: resolvedLang === 'en' ? 'Published' : '작성일', value: formatDateOnly(notice.createdAt) },
      { label: resolvedLang === 'en' ? 'Updated' : '수정일', value: formatDateOnly(notice.updatedAt) },
    ]),
    bodyHtml: linkSpiritEmbeds(bodyHtml, spiritLinks.hrefBySpiritId) || null,
    items: spiritLinks.items.length > 0 ? spiritLinks.items : undefined,
    itemsHeading: spiritLinks.items.length > 0
      ? (resolvedLang === 'en' ? 'Spirits mentioned in this notice' : '이 글에서 언급한 주류')
      : undefined,
    links: [
      { label: resolvedLang === 'en' ? 'Home' : '홈', href: '/ko' },
      { label: resolvedLang === 'en' ? 'Notices' : '공지사항', href: '/ko/notices' },
      { label: notice.title, href: `/ko/notices/${numericId}` },
    ],
  }
}

export async function getNoticeDetailJsonLd(
  id: string,
  lang: 'ko' | 'en' | null,
): Promise<object | null> {
  if (normalizeLang(lang) === 'en') return null
  const notice = await getNoticeDetail(id)
  if (!notice) return null

  const numericId = extractLeadingId(id)!
  const canonical = `${SITE_URL}/ko/notices/${numericId}`
  const image = toAbsoluteImageUrl(notice.images?.[0]?.imageUrl) || DEFAULT_OG_IMAGE
  const articleId = `${canonical}#article`
  const breadcrumbId = `${canonical}#breadcrumb`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': canonical,
        'url': canonical,
        'name': notice.title,
        'inLanguage': 'ko-KR',
        'breadcrumb': { '@id': breadcrumbId },
        'mainEntity': { '@id': articleId },
      },
      {
        '@type': 'Article',
        '@id': articleId,
        'mainEntityOfPage': { '@id': canonical },
        'headline': notice.title,
        'description': stripHtmlAndSummarize(notice.contentSanitized || '', 300),
        'articleBody': stripHtmlToText(notice.contentSanitized || ''),
        'image': [image],
        'datePublished': toKstIsoDateTime(notice.createdAt),
        'dateModified': toKstIsoDateTime(notice.updatedAt || notice.createdAt),
        'inLanguage': 'ko-KR',
        'isAccessibleForFree': true,
        'author': { '@type': 'Organization', 'name': 'CaskByCask', 'url': SITE_URL },
        'publisher': {
          '@type': 'Organization',
          'name': 'CaskByCask',
          'url': SITE_URL,
          'logo': { '@type': 'ImageObject', 'url': `${SITE_URL}/logo.png` },
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': breadcrumbId,
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': '홈', 'item': `${SITE_URL}/ko` },
          { '@type': 'ListItem', 'position': 2, 'name': '공지사항', 'item': `${SITE_URL}/ko/notices` },
          { '@type': 'ListItem', 'position': 3, 'name': notice.title, 'item': canonical },
        ],
      },
    ],
  }
}

/**
 * 기본/홈페이지 메타데이터를 반환합니다.
 */
const DEFAULT_ROUTE_METADATA: Record<string, {
  ko: { title: string; description: string }
  en: { title: string; description: string }
}> = {
  ranking: {
    ko: { title: '활동 점수 랭킹 — CaskByCask', description: '주간·월간·전체 기간별 CaskByCask 사용자 활동 점수와 레벨 순위를 확인하세요.' },
    en: { title: 'Community Rankings — CaskByCask', description: 'Explore weekly, monthly, and all-time CaskByCask community activity rankings.' },
  },
  terms: {
    ko: { title: '이용약관 — CaskByCask', description: 'CaskByCask 서비스 이용약관입니다.' },
    en: { title: 'Terms of Service — CaskByCask', description: 'Read the CaskByCask terms of service.' },
  },
  privacy: {
    ko: { title: '개인정보 처리방침 — CaskByCask', description: 'CaskByCask 개인정보 수집·이용·보관 정책입니다.' },
    en: { title: 'Privacy Policy — CaskByCask', description: 'Read the CaskByCask privacy policy.' },
  },
  'operation-policy': {
    ko: { title: '커뮤니티 운영정책 — CaskByCask', description: 'CaskByCask 커뮤니티 게시판 운영정책과 이용 가이드입니다.' },
    en: { title: 'Community Policy — CaskByCask', description: 'Read the CaskByCask community operation policy.' },
  },
  faq: {
    ko: { title: '주류·서비스 FAQ — CaskByCask', description: '위스키·와인·꼬냑 용어와 CaskByCask 이용 방법에 대한 자주 묻는 질문입니다.' },
    en: { title: 'Spirits and Service FAQ — CaskByCask', description: 'Frequently asked questions about spirits and using CaskByCask.' },
  },
  calendar: {
    ko: { title: '주류 행사 캘린더 — CaskByCask', description: '주류 관련 행사와 커뮤니티 일정을 캘린더에서 확인하세요.' },
    en: { title: 'Spirits Event Calendar — CaskByCask', description: 'Browse spirits events and community schedules.' },
  },
  'tier-lists': {
    ko: { title: '주류 티어리스트 — CaskByCask', description: '위스키·와인·꼬냑 등 주류와 생산자를 나만의 기준으로 분류하고 공유하는 티어리스트입니다.' },
    en: { title: 'Spirits Tier Lists — CaskByCask', description: 'Create and share custom tier lists for whisky, wine, cognac, other spirits, and producers.' },
  },
  'taste-trees': {
    ko: { title: '주류 취향 트리 — CaskByCask', description: '선택지를 따라가며 취향에 맞는 주류를 찾는 공개 취향 트리를 확인하세요.' },
    en: { title: 'Spirits Taste Trees — CaskByCask', description: 'Explore public decision trees that help people discover spirits by taste.' },
  },
  producers: {
    ko: { title: '주류 생산자 정보 — CaskByCask', description: '증류소·와이너리·꼬냑 하우스 정보와 생산 주류를 확인하세요.' },
    en: { title: 'Spirits Producer Information — CaskByCask', description: 'Explore distilleries, wineries, cognac houses, and their spirits.' },
  },
  'price-tracker': {
    ko: { title: '주류 가격 정보 — CaskByCask', description: '사용자가 확인한 과거 구매 가격과 승인된 특가 정보를 살펴보세요.' },
    en: { title: 'Spirits Price Information — CaskByCask', description: 'Browse user-reported historical purchase prices and approved deal information.' },
  },
  users: {
    ko: { title: '사용자 주류 기록 — CaskByCask', description: 'CaskByCask 사용자가 공개한 보틀과 주류 리뷰를 확인하세요.' },
    en: { title: 'Public Spirits Collection — CaskByCask', description: 'Browse public bottles and spirits reviews shared by a CaskByCask user.' },
  },
}

export function getDefaultMetadata(
  lang: 'ko' | 'en' | null,
  canonicalPath?: string,
): Metadata {
  const resolvedLang = normalizeLang(lang)
  const pathSuffix = canonicalPath ? `/${canonicalPath.replace(/^\/+|\/+$/g, '')}` : ''
  const canonical = `${SITE_URL}/${resolvedLang}${pathSuffix}`
  const canonicalKo = `${SITE_URL}/ko${pathSuffix}`
  const canonicalEn = `${SITE_URL}/en${pathSuffix}`
  const routeKey = canonicalPath?.split('/')[0] ?? ''
  const routeMeta = DEFAULT_ROUTE_METADATA[routeKey]?.[resolvedLang]
  const title = routeMeta?.title ?? (resolvedLang === 'en'
    ? 'CaskByCask — Spirits Information, Reviews and Community'
    : 'CaskByCask(캐바캐) — 주류 정보, 리뷰, 커뮤니티')
  const description = routeMeta?.description ?? (resolvedLang === 'en'
    ? 'Explore whisky, wine, cognac and other spirits with detailed information, ratings, reviews, and community discussions.'
    : '위스키, 와인, 꼬냑 등 주류 정보와 평점 리뷰 전문 플랫폼, CaskByCask(캐바캐)입니다.')
  return {
    title,
    description,
    robots: buildRobots(true),
    alternates: {
      canonical,
      languages: {
        ko: canonicalKo,
        en: canonicalEn,
        'x-default': canonicalKo,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      siteName: 'CaskByCask',
      locale: resolvedLang === 'en' ? 'en_US' : 'ko_KR',
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  }
}

/**
 * 라우트 키 단위 기본 metadata 대신, 엔티티 정보를 반영한 metadata 를 반환한다.
 *
 * `DEFAULT_ROUTE_METADATA` 는 라우트 키(`producers`, `users`, `price-tracker` 등) 단위이므로
 * 그대로 쓰면 생산자·리뷰·사용자 페이지 수백 개가 동일한 title/description 을 갖는다.
 * 검색엔진은 이를 중복으로 판단해 대표 1개만 남기고, 노출돼도 제목이 내용을 설명하지 못해
 * 클릭률이 떨어진다. 여기서 경로별로 엔티티 이름을 반영한다.
 *
 * 엔티티 조회가 일시적으로 실패하면 기존 라우트 기본값으로 되돌아간다.
 * (장애 중 색인 가능 상태를 유지하기 위한 안전한 기본값)
 */
export async function getPublicRouteMetadata(
  lang: 'ko' | 'en' | null,
  canonicalPath?: string,
): Promise<Metadata> {
  const segments = (canonicalPath ?? '').split('/').filter(Boolean)
  const fallback = () => getDefaultMetadata(lang, canonicalPath)

  if (segments[0] === 'reviews' && segments[1]) {
    return (await getPublicReviewMetadata(segments[1], lang)) ?? fallback()
  }
  if (segments[0] === 'producers' && segments[1]) {
    return (await getProducerMetadata(segments[1], lang)) ?? fallback()
  }
  if (segments[0] === 'price-tracker' && segments[1] === 'spirits' && segments[2]) {
    return (await getSpiritPriceMetadata(segments[2], lang)) ?? fallback()
  }
  if (segments[0] === 'users' && segments[1] && segments[2]) {
    // 이 경로는 정책상 색인 대상이 아니다. 조회가 실패해도 라우트 기본값(index)으로
    // 되돌아가면 정책이 뒤집히므로 noindex 를 유지한 채 폴백한다.
    return (await getUserPublicMetadata(segments[1], segments[2], lang))
      ?? getNoindexMetadata(lang, normalizeLang(lang) === 'en'
        ? 'Public spirits collection — CaskByCask'
        : '사용자 공개 목록 — CaskByCask')
  }
  if (segments[0] === 'taste-trees' && segments[1] === 't' && segments[2]) {
    return (await getSharedTasteTreeMetadata(segments[2], lang)) ?? fallback()
  }
  return fallback()
}

interface PublicReviewResponse {
  id: number
  spiritId: number
  displayNameKo: string
  displayNameEn: string | null
  canonicalPathKo: string | null
  canonicalPathEn: string | null
  imageUrl: string | null
  nickname: string | null
  totalScore: number | string | null
  noseNote: string | null
  tasteNote: string | null
  finishNote: string | null
  comment: string | null
  createdAt: string | null
}

/**
 * 표시용 이름을 안전하게 꺼낸다.
 *
 * 위 interface 들은 외부 API 응답에 대한 선언일 뿐 런타임 보장이 아니다. 이름이 비어 있는데
 * 그대로 title 을 만들면 `null 시음 후기 — CaskByCask` 같은 문자열이 색인되므로,
 * 값이 없으면 호출부가 라우트 기본 metadata 로 폴백하도록 null 을 반환한다.
 */
function firstNonBlank(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }
  return null
}

/**
 * 공개 리뷰 상세.
 *
 * 리뷰 본문은 사용자가 한국어로 작성하므로 게시글과 동일하게 한국어 원문으로 신호를 통합한다.
 * (영문 alternate 를 내보내면 같은 한국어 콘텐츠가 두 URL 로 색인되는 잘못된 신호가 된다)
 * SNS 짧은 링크(`/s/{code}`)의 착지 경로이므로 OG 태그도 함께 채운다.
 */
export async function getPublicReviewMetadata(
  id: string,
  lang: 'ko' | 'en' | null,
): Promise<Metadata | null> {
  const review = await fetchApiData<PublicReviewResponse>(`/api/public/reviews/${id}`, 300)
  if (!review) return null

  const isEn = normalizeLang(lang) === 'en'
  const spiritName = isEn
    ? firstNonBlank(review.displayNameEn, review.displayNameKo)
    : firstNonBlank(review.displayNameKo, review.displayNameEn)
  if (!spiritName) return null

  const nickname = review.nickname?.trim()
  const score = review.totalScore == null ? null : Number(review.totalScore)
  const scoreText = score == null || Number.isNaN(score)
    ? null
    : (Number.isInteger(score) ? String(score) : score.toFixed(1))

  const title = isEn
    ? `${spiritName} tasting note${nickname ? ` by ${nickname}` : ''} — CaskByCask`
    : `${spiritName} 시음 후기${nickname ? ` (${nickname})` : ''} — CaskByCask`

  const noteText = stripHtmlAndSummarize(
    [review.comment, review.noseNote, review.tasteNote, review.finishNote]
      .filter(Boolean)
      .join(' '),
    120,
  )
  const description = isEn
    ? [scoreText && `Rated ${scoreText}/100.`, noteText || `A tasting note for ${spiritName}.`]
      .filter(Boolean).join(' ')
    : [scoreText && `평점 ${scoreText}점.`, noteText || `${spiritName} 시음 노트입니다.`]
      .filter(Boolean).join(' ')

  // 리뷰 본문의 정본은 그 리뷰가 달린 주류 상세다. 리뷰마다 URL 을 따로 색인시키면 같은 내용이
  // 주류 페이지와 경쟁한다. SPA(PublicReviewPage)도 같은 판정을 내므로 여기서 어긋나면
  // 렌더링 전후로 색인 신호가 뒤집힌다.
  const spiritPath = normalizeLang(lang) === 'en' ? review.canonicalPathEn : review.canonicalPathKo
  const canonical = `${SITE_URL}${spiritPath ?? `/ko/reviews/${review.id}`}`
  // 공유 링크의 착지 화면이라 OG 는 그대로 채운다 — noindex 는 OG 미리보기에 영향을 주지 않는다.
  const shareUrl = `${SITE_URL}/ko/reviews/${review.id}`
  const ogImage = toAbsoluteImageUrl(review.imageUrl) || DEFAULT_OG_IMAGE

  return {
    title,
    description,
    robots: buildRobots(false),
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: shareUrl,
      type: 'article',
      siteName: 'CaskByCask',
      locale: 'ko_KR',
      images: [{ url: ogImage, alt: title }],
      publishedTime: toKstIsoDateTime(review.createdAt),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

interface ProducerResponse {
  id: number
  type: 'DISTILLERY' | 'WINERY' | 'COGNAC_HOUSE' | 'OTHER' | null
  nameKo: string
  nameEn: string | null
  country: string | null
  region: string | null
  foundedYear: number | null
  descriptionKo: string | null
  descriptionEn: string | null
}

const PRODUCER_TYPE_SEO_LABEL: Record<string, { ko: string; en: string }> = {
  DISTILLERY: { ko: '증류소', en: 'Distillery' },
  WINERY: { ko: '와이너리', en: 'Winery' },
  COGNAC_HOUSE: { ko: '꼬냑 하우스', en: 'Cognac House' },
  OTHER: { ko: '생산자', en: 'Producer' },
}

/**
 * 생산자(증류소·와이너리·꼬냑 하우스) 상세.
 *
 * 증류소명은 검색 수요가 크므로 이름을 title 앞에 둔다.
 * 이름·소개가 한/영 모두 존재하므로 언어별 self-canonical 과 hreflang 을 유지한다.
 */
async function getProducerMetadata(
  id: string,
  lang: 'ko' | 'en' | null,
): Promise<Metadata | null> {
  const producer = await fetchApiData<ProducerResponse>(`/api/producers/${id}`, 3600)
  if (!producer) return null

  const resolvedLang = normalizeLang(lang)
  const isEn = resolvedLang === 'en'
  const name = isEn
    ? firstNonBlank(producer.nameEn, producer.nameKo)
    : firstNonBlank(producer.nameKo, producer.nameEn)
  if (!name) return null

  const typeLabel = PRODUCER_TYPE_SEO_LABEL[producer.type ?? 'OTHER'] ?? PRODUCER_TYPE_SEO_LABEL.OTHER
  const title = isEn
    ? `${name} ${typeLabel.en} — CaskByCask`
    : `${name} ${typeLabel.ko} 정보 — CaskByCask`

  const place = [producer.country, producer.region].filter(Boolean).join(' ')
  const intro = stripHtmlAndSummarize(
    (isEn ? producer.descriptionEn || producer.descriptionKo : producer.descriptionKo) || '',
    140,
  )
  const description = intro || (isEn
    ? [
      `${name} is a ${typeLabel.en.toLowerCase()}${place ? ` in ${place}` : ''}`
      + `${producer.foundedYear ? `, founded in ${producer.foundedYear}` : ''}.`,
      'Explore its spirits, ratings, and reviews on CaskByCask.',
    ].join(' ')
    : [
      `${place ? `${place} ` : ''}${typeLabel.ko} ${name}${producer.foundedYear ? ` (${producer.foundedYear}년 설립)` : ''}의 정보와`,
      '생산 주류, 사용자 평점 리뷰를 CaskByCask에서 확인하세요.',
    ].join(' '))

  const canonicalKo = `${SITE_URL}/ko/producers/${producer.id}`
  const canonicalEn = `${SITE_URL}/en/producers/${producer.id}`
  const canonical = isEn ? canonicalEn : canonicalKo

  return {
    title,
    description,
    robots: buildRobots(true),
    alternates: {
      canonical,
      languages: { ko: canonicalKo, en: canonicalEn, 'x-default': canonicalKo },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      siteName: 'CaskByCask',
      locale: isEn ? 'en_US' : 'ko_KR',
      images: [{ url: DEFAULT_OG_IMAGE, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  }
}

/**
 * 주류별 가격 상세.
 *
 * 이 화면의 내용(가격 추이·매장)은 주류 상세 페이지의 가격 탭에 이미 포함되어 있어
 * 사실상 부분집합이다. 두 URL 이 같은 주류로 색인 경쟁하지 않도록 canonical 을
 * 주류 상세로 통합한다. 페이지 자체는 계속 200 으로 동작하므로 기능 영향은 없다.
 * (자체 색인이 필요해지면 canonical 을 self 로 되돌리면 된다)
 */
async function getSpiritPriceMetadata(
  id: string,
  lang: 'ko' | 'en' | null,
): Promise<Metadata | null> {
  const [seo, spirit] = await Promise.all([
    getSpiritSeo(id),
    fetchApiData<SpiritDetailResponse>(`/api/spirits/${id}`, 3600),
  ])
  if (!seo || !spirit) return null

  const isEn = normalizeLang(lang) === 'en'
  const { nameKo, nameEn } = formatSpiritDisplayNames(spirit)
  const name = isEn ? firstNonBlank(nameEn, nameKo) : firstNonBlank(nameKo, nameEn)
  // canonical 을 주류 상세로 통합하는 것이 이 함수의 핵심이므로, 대상 URL 이 없으면
  // 잘못된 canonical 을 내보내는 대신 라우트 기본 metadata 로 넘긴다.
  const canonical = firstNonBlank(isEn ? seo.canonicalUrlEn : seo.canonicalUrlKo)
  if (!name || !canonical) return null

  const title = isEn
    ? `${name} price history — CaskByCask`
    : `${name} 가격 정보 — CaskByCask`
  const description = isEn
    ? `Historical purchase prices and approved deals reported by users for ${name}.`
    : `${name}의 사용자 제보 구매 가격과 승인된 특가 정보를 확인하세요.`
  const ogImage = seo.primaryImageUrl || DEFAULT_OG_IMAGE

  return {
    title,
    description,
    robots: buildRobots(true),
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      siteName: 'CaskByCask',
      locale: isEn ? 'en_US' : 'ko_KR',
      images: [{ url: ogImage, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

interface UserBottleListResponse {
  totalElements: number | null
  ownerNickname: string | null
}

/**
 * 사용자 공개 보틀·리뷰 목록.
 *
 * 색인 대상에서 제외한다. 이 화면은 사용자가 보유·평가한 주류 목록이라 본문이 주류 상세·리뷰
 * 페이지와 중복되고, 사용자명 기반 검색 수요가 없어 색인 가치가 낮다. 사용자 수만큼 URL 이
 * 늘어나므로 그대로 두면 크롤 예산이 주류 페이지에서 빠져나간다.
 *
 * `follow` 는 유지한다. 이 목록의 링크를 따라 주류 상세로 들어가는 경로는 살려두어야 한다.
 * `noindex` 와 canonical 을 함께 선언하면 신호가 충돌하므로 canonical·hreflang 은 내보내지 않는다.
 * 페이지 자체는 계속 200 으로 동작하고 OG 태그도 유지하므로 링크 공유에는 영향이 없다.
 */
async function getUserPublicMetadata(
  userId: string,
  section: string,
  lang: 'ko' | 'en' | null,
): Promise<Metadata | null> {
  if (section !== 'bottles' && section !== 'reviews') return null
  const summary = await fetchApiData<UserBottleListResponse>(
    `/api/users/${userId}/bottles?page=0&size=1`,
    300,
  )
  const nickname = summary?.ownerNickname?.trim()
  if (!nickname) return null

  const isEn = normalizeLang(lang) === 'en'
  const isBottles = section === 'bottles'
  const title = isEn
    ? `${nickname}'s ${isBottles ? 'bottle collection' : 'spirit reviews'} — CaskByCask`
    : `${nickname}님의 ${isBottles ? '보틀 컬렉션' : '주류 리뷰'} — CaskByCask`
  const description = isEn
    ? `Browse the ${isBottles ? 'bottles' : 'spirit reviews'} shared publicly by ${nickname} on CaskByCask.`
    : `${nickname}님이 공개한 ${isBottles ? '보유 보틀' : '주류 리뷰'}를 확인하세요.`

  return {
    title,
    description,
    robots: buildRobots(false),
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${isEn ? 'en' : 'ko'}/users/${userId}/${section}`,
      type: 'profile',
      siteName: 'CaskByCask',
      locale: isEn ? 'en_US' : 'ko_KR',
      images: [{ url: DEFAULT_OG_IMAGE, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  }
}

interface TasteTreeViewResponse {
  shareKey: string | null
  ownerNickname: string | null
  title: string | null
  description: string | null
}

/** 공개 공유 취향 트리. 트리 제목을 반영해 공유 링크마다 title 을 구분한다. */
async function getSharedTasteTreeMetadata(
  shareKey: string,
  lang: 'ko' | 'en' | null,
): Promise<Metadata | null> {
  const tree = await fetchApiData<TasteTreeViewResponse>(
    `/api/taste-trees/share/${encodeURIComponent(shareKey)}`,
    300,
  )
  const treeTitle = tree?.title?.trim()
  if (!treeTitle) return null

  const resolvedLang = normalizeLang(lang)
  const isEn = resolvedLang === 'en'
  const title = isEn
    ? `${treeTitle} — Spirits taste tree | CaskByCask`
    : `${treeTitle} — 주류 취향 트리 | CaskByCask`
  const intro = stripHtmlAndSummarize(tree?.description || '', 140)
  const description = intro || (isEn
    ? `Follow the choices in "${treeTitle}" to discover spirits that match your taste.`
    : `"${treeTitle}" 취향 트리의 선택지를 따라가며 취향에 맞는 주류를 찾아보세요.`)

  const path = `/taste-trees/t/${encodeURIComponent(shareKey)}`
  const canonicalKo = `${SITE_URL}/ko${path}`
  const canonicalEn = `${SITE_URL}/en${path}`
  const canonical = isEn ? canonicalEn : canonicalKo

  return {
    title,
    description,
    robots: buildRobots(true),
    alternates: {
      canonical,
      languages: { ko: canonicalKo, en: canonicalEn, 'x-default': canonicalKo },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      siteName: 'CaskByCask',
      locale: isEn ? 'en_US' : 'ko_KR',
      images: [{ url: DEFAULT_OG_IMAGE, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  }
}

/**
 * 홈의 raw HTML 요약을 생성한다.
 *
 * 홈은 사이트에서 링크 권위가 가장 높지만 본문이 클라이언트에서만 렌더링되어,
 * JS를 실행하지 않는 크롤러에게는 H1도 내부 링크도 없는 빈 문서였다.
 * 카테고리·주요 경로·주류 canonical 링크를 서버 HTML로 제공해 주류 상세 페이지가
 * 홈에서 바로 발견되게 한다.
 * (SPA가 마운트되면 이 블록은 숨겨지고 동일한 내용을 클라이언트가 렌더링한다)
 */
export async function getHomeSeoSnapshot(lang: 'ko' | 'en' | null): Promise<SeoSnapshotData> {
  const resolvedLang = normalizeLang(lang)
  const isEn = resolvedLang === 'en'
  const page = await fetchApiData<PageResponse<SpiritListSeoItemResponse>>(
    '/api/spirits?page=0&size=12',
    300,
  )

  const items = (page?.content ?? []).map((spirit) => ({
    title: appendWineVintageDisplay(
      isEn ? (spirit.nameEn || spirit.nameKo) : spirit.nameKo,
      spirit,
    ),
    href: isEn
      ? (spirit.canonicalPathEn || `/en/spirits/${spirit.id}`)
      : (spirit.canonicalPathKo || `/ko/spirits/${spirit.id}`),
    meta: isEn
      ? (spirit.producerNameEn || spirit.producerNameKo)
      : spirit.producerNameKo,
  }))
  const totalElements = page?.totalElements

  const categoryLinks = SPIRIT_CATEGORIES.map((category) => ({
    label: isEn ? SPIRIT_CATEGORY_META[category].titleEn : SPIRIT_CATEGORY_META[category].titleKo,
    href: `/${resolvedLang}/spirits?category=${category}`,
  }))

  return {
    kind: 'home',
    lang: resolvedLang,
    eyebrow: isEn ? 'Spirits information and reviews' : '주류 정보와 리뷰',
    title: isEn
      ? 'CaskByCask — Whisky, Wine and Cognac Information and Reviews'
      : 'CaskByCask(캐바캐) — 위스키·와인·꼬냑 주류 정보와 리뷰',
    description: isEn
      ? 'Explore whisky, wine, cognac and other spirits with detailed specs, tasting notes, user ratings, and community discussions.'
      : '위스키·와인·꼬냑 등 주류의 상세 정보와 시음 노트, 사용자 평점 리뷰, 커뮤니티를 CaskByCask에서 확인하세요.',
    image: null,
    metrics: totalElements == null
      ? []
      : [{
        label: isEn ? 'Spirits' : '등록 주류',
        value: totalElements.toLocaleString(isEn ? 'en-US' : 'ko-KR'),
      }],
    details: [],
    items,
    itemsHeading: isEn ? 'Spirits in the catalog' : '등록된 주류',
    links: [
      { label: isEn ? 'All spirits' : '주류 전체', href: `/${resolvedLang}/spirits` },
      ...categoryLinks,
      { label: isEn ? 'Tier lists' : '티어리스트', href: `/${resolvedLang}/tier-lists` },
      { label: isEn ? 'Taste trees' : '취향 트리', href: `/${resolvedLang}/taste-trees` },
      { label: isEn ? 'Price information' : '가격 정보', href: `/${resolvedLang}/price-tracker` },
      { label: isEn ? 'Rankings' : '랭킹', href: `/${resolvedLang}/ranking` },
      { label: 'FAQ', href: `/${resolvedLang}/faq` },
      // 게시판과 공지는 한국어 원문으로 신호를 통합하므로 항상 /ko 경로를 가리킨다.
      { label: isEn ? 'Community' : '커뮤니티', href: '/ko/community/all' },
      { label: isEn ? 'Notices' : '공지사항', href: '/ko/notices' },
    ],
  }
}

/**
 * 주류 목록 페이지 메타데이터를 반환합니다.
 */
interface SpiritsListSeoState {
  lang: 'ko' | 'en'
  category: SpiritSeoCategory | null
  canonical: string
  canonicalKo: string
  canonicalEn: string
  /** 페이지 파라미터를 제외한 목록 경로. 페이지 앵커를 만드는 기준이 된다. */
  basePath: string
  /** 0-based 현재 페이지. */
  pageNumber: number
  totalPages: number
  indexable: boolean
  meta: typeof SPIRIT_CATEGORY_META[SpiritSeoCategory | '']
  pageData: PageResponse<SpiritListSeoItemResponse> | null
}

function hasTierListEditorId(searchParams: MetadataSearchParams): boolean {
  return Object.prototype.hasOwnProperty.call(searchParams, 'id')
}

/**
 * 공개 티어리스트와 소유자 편집 뷰의 색인 정책을 서버 렌더링 단계에서 분리한다.
 * share 경로는 공개 self-canonical, ?id 편집 뷰는 기본 목록 canonical + noindex다.
 */
export function getTierListMetadata(
  lang: 'ko' | 'en' | null,
  shareKey: string | undefined,
  searchParams: MetadataSearchParams,
): Metadata {
  const canonicalPath = shareKey ? `tier-lists/${shareKey}` : 'tier-lists'
  const metadata = getDefaultMetadata(lang, canonicalPath)
  if (shareKey || !hasTierListEditorId(searchParams)) return metadata
  return { ...metadata, robots: buildRobots(false) }
}

/** Raw HTML에서도 공개 티어리스트 기본 경로의 설명과 단일 H1을 제공한다. */
export function getTierListSeoSnapshot(lang: 'ko' | 'en' | null): SeoSnapshotData {
  const resolvedLang = normalizeLang(lang)
  const config = DEFAULT_ROUTE_METADATA['tier-lists'][resolvedLang]
  return {
    kind: 'tier-list',
    lang: resolvedLang,
    eyebrow: resolvedLang === 'en' ? 'Spirits Community' : '주류 커뮤니티',
    title: config.title.replace(/\s+—\s+CaskByCask$/, ''),
    description: config.description,
    image: null,
    metrics: [],
    details: [],
    links: [
      { label: resolvedLang === 'en' ? 'Home' : '홈', href: `/${resolvedLang}` },
      { label: config.title.replace(/\s+—\s+CaskByCask$/, ''), href: `/${resolvedLang}/tier-lists` },
    ],
  }
}

function singleSearchParam(value: string | string[] | undefined): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/** 주류 목록 SEO 스냅샷의 페이지 크기. canonical·totalPages 계산이 화면과 어긋나지 않게 한 곳에서 정한다. */
const SPIRITS_SEO_PAGE_SIZE = 20

/** 2페이지부터는 제목에 페이지 번호를 붙여 목록 페이지끼리 제목이 겹치지 않게 한다. */
function withPageSuffix(title: string, pageNumber: number, lang: 'ko' | 'en'): string {
  if (pageNumber <= 0) return title
  return lang === 'en'
    ? `${title} (Page ${pageNumber + 1})`
    : `${title} (${pageNumber + 1}페이지)`
}

async function resolveSpiritsListSeoState(
  lang: 'ko' | 'en' | null,
  searchParams: MetadataSearchParams = {},
  includeItems = false,
): Promise<SpiritsListSeoState> {
  const resolvedLang = normalizeLang(lang)
  const suppliedCategory = searchParams.category
  const singleCategory = singleSearchParam(suppliedCategory)
  const rawCategory = singleCategory?.toUpperCase() ?? null
  const category = isSpiritSeoCategory(rawCategory) ? rawCategory : null
  const suppliedKeys = Object.entries(searchParams)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key)
  // 카탈로그는 1순위 색인 대상이라 page 를 정식 facet 으로 받는다.
  // (뒤 페이지가 noindex 면 카탈로그 하위 주류로 내려가는 링크 신호가 오래 못 간다)
  const pageNumber = readPageParam(searchParams)
  const hasUnsupportedQuery = suppliedKeys.some((key) => key !== 'category' && key !== 'page')
    || hasUnsupportedPageParam(searchParams)
    || (suppliedCategory !== undefined && (
      Array.isArray(suppliedCategory)
      || singleCategory === null
      || category === null
      || singleCategory !== category
    ))
  const suffix = category ? `?category=${category}` : ''
  const basePathKo = `/ko/spirits${suffix}`
  const basePathEn = `/en/spirits${suffix}`

  let pageData: PageResponse<SpiritListSeoItemResponse> | null = null
  // 뒤 페이지를 요청받으면 항목 수와 무관하게 실제 페이지 크기로 조회해야 totalPages 가 의미를 갖는다.
  const needsFullPage = includeItems || pageNumber > 0
  if (category || needsFullPage) {
    const query = new URLSearchParams({
      page: String(pageNumber),
      size: needsFullPage ? String(SPIRITS_SEO_PAGE_SIZE) : '1',
    })
    if (category) query.set('category', category)
    pageData = await fetchApiData<PageResponse<SpiritListSeoItemResponse>>(`/api/spirits?${query.toString()}`, 300)
  }

  // API 일시 장애 시 기존 index 상태를 보존하고, 실제 0건이 확인된 카테고리만 noindex 한다.
  const categoryHasContent = !category || pageData == null
    || (pageData.totalElements ?? pageData.content.length) > 0
  const totalPages = pageData?.totalPages ?? 0
  // 범위를 벗어난 페이지는 빈 목록이라 색인 가치가 없다. 링크 추적은 계속 허용한다.
  const pageOutOfRange = pageNumber > 0 && pageData != null
    && (totalPages > 0 ? pageNumber >= totalPages : pageData.content.length === 0)

  // 실재하지 않는 페이지에는 self-canonical 을 걸지 않는다. 형식이 어긋난 page 값과 마찬가지로
  // 기본 목록으로 신호를 모은다 — 그러지 않으면 readPageParam 의 상한 때문에 canonical 이
  // 자기 자신도 기본 경로도 아닌 제3의 주소(예: page=10000)를 가리키게 된다.
  const canonicalPage = pageOutOfRange ? 0 : pageNumber
  const canonicalKo = `${SITE_URL}${buildListPageHref(basePathKo, canonicalPage)}`
  const canonicalEn = `${SITE_URL}${buildListPageHref(basePathEn, canonicalPage)}`

  return {
    lang: resolvedLang,
    category,
    canonical: resolvedLang === 'en' ? canonicalEn : canonicalKo,
    canonicalKo,
    canonicalEn,
    basePath: resolvedLang === 'en' ? basePathEn : basePathKo,
    pageNumber,
    totalPages,
    indexable: !hasUnsupportedQuery && categoryHasContent && !pageOutOfRange,
    meta: SPIRIT_CATEGORY_META[category ?? ''],
    pageData,
  }
}

export async function getSpiritsListMetadata(
  lang: 'ko' | 'en' | null,
  searchParams: MetadataSearchParams = {},
): Promise<Metadata> {
  const state = await resolveSpiritsListSeoState(lang, searchParams)
  const isEn = state.lang === 'en'
  const title = `${withPageSuffix(
    isEn ? state.meta.titleEn : state.meta.titleKo,
    state.pageNumber,
    state.lang,
  )} — CaskByCask`
  const description = isEn ? state.meta.descEn : state.meta.descKo

  return {
    title,
    description,
    keywords: isEn ? state.meta.keywordsEn : state.meta.keywordsKo,
    robots: { index: state.indexable, follow: true },
    alternates: {
      canonical: state.canonical,
      languages: {
        ko: state.canonicalKo,
        en: state.canonicalEn,
        'x-default': state.canonicalKo,
      },
    },
    openGraph: {
      title,
      description,
      url: state.canonical,
      type: 'website',
      siteName: 'CaskByCask',
      locale: isEn ? 'en_US' : 'ko_KR',
      images: [{ url: DEFAULT_OG_IMAGE, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  }
}

export async function getSpiritsListSeoSnapshot(
  lang: 'ko' | 'en' | null,
  searchParams: MetadataSearchParams = {},
): Promise<SeoSnapshotData> {
  const state = await resolveSpiritsListSeoState(lang, searchParams, true)
  const isEn = state.lang === 'en'
  const items = (state.pageData?.content ?? []).map((spirit) => ({
    title: appendWineVintageDisplay(
      isEn ? (spirit.nameEn || spirit.nameKo) : spirit.nameKo,
      spirit,
    ),
    href: isEn
      ? (spirit.canonicalPathEn || `/en/spirits/${spirit.id}`)
      : (spirit.canonicalPathKo || `/ko/spirits/${spirit.id}`),
    meta: isEn
      ? (spirit.producerNameEn || spirit.producerNameKo)
      : spirit.producerNameKo,
  }))
  const count = state.pageData?.totalElements

  return {
    kind: 'spirits-list',
    lang: state.lang,
    eyebrow: isEn ? 'CaskByCask catalog' : 'CaskByCask 주류 정보',
    title: withPageSuffix(
      isEn ? state.meta.titleEn : state.meta.titleKo,
      state.pageNumber,
      state.lang,
    ),
    description: isEn ? state.meta.descEn : state.meta.descKo,
    metrics: count == null ? [] : [{
      label: isEn ? 'Spirits' : '등록 주류',
      value: count.toLocaleString(isEn ? 'en-US' : 'ko-KR'),
    }],
    details: [],
    items,
    itemsHeading: isEn
      ? (state.category ? `${state.meta.titleEn} list` : 'Spirits in the catalog')
      : (state.category ? `${state.meta.titleKo} 목록` : '등록된 주류'),
    pagination: buildSeoPagination(state.basePath, state.pageNumber, state.totalPages),
    links: [
      { label: isEn ? 'Home' : '홈', href: `/${state.lang}` },
      ...(state.category
        ? [{ label: isEn ? 'All spirits' : '전체 주류', href: `/${state.lang}/spirits` }]
        : []),
    ],
  }
}

export async function getSpiritsListJsonLd(
  lang: 'ko' | 'en' | null,
  searchParams: MetadataSearchParams = {},
): Promise<object | null> {
  const state = await resolveSpiritsListSeoState(lang, searchParams, true)
  if (!state.indexable) return null

  const isEn = state.lang === 'en'
  const items = (state.pageData?.content ?? []).map((spirit, index) => ({
    '@type': 'ListItem',
    // 페이지를 넘어가도 위치가 이어지도록 전역 순번으로 매긴다.
    position: state.pageNumber * SPIRITS_SEO_PAGE_SIZE + index + 1,
    name: appendWineVintageDisplay(
      isEn ? (spirit.nameEn || spirit.nameKo) : spirit.nameKo,
      spirit,
    ),
    url: `${SITE_URL}${isEn
      ? (spirit.canonicalPathEn || `/en/spirits/${spirit.id}`)
      : (spirit.canonicalPathKo || `/ko/spirits/${spirit.id}`)}`,
  }))

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: isEn ? 'Home' : '홈', item: `${SITE_URL}/${state.lang}` },
          { '@type': 'ListItem', position: 2, name: isEn ? 'Spirits' : '주류 카탈로그', item: state.canonical },
        ],
      },
      {
        '@type': 'CollectionPage',
        name: withPageSuffix(
          isEn ? state.meta.titleEn : state.meta.titleKo,
          state.pageNumber,
          state.lang,
        ),
        description: isEn ? state.meta.descEn : state.meta.descKo,
        url: state.canonical,
        mainEntity: items.length > 0 ? { '@type': 'ItemList', itemListElement: items } : undefined,
      },
    ],
  }
}

/**
 * 주류 상세 페이지 메타데이터를 반환합니다.
 */
export async function getSpiritDetailMetadata(id: string, lang: 'ko' | 'en' | null): Promise<Metadata> {
  const seo = await getSpiritSeo(id)
  if (seo) {
    const isEn = lang === 'en'
    const title = isEn ? seo.titleEn : seo.titleKo
    const description = isEn ? seo.descriptionEn : seo.descriptionKo
    const canonical = isEn ? seo.canonicalUrlEn : seo.canonicalUrlKo
    const ogImage = seo.primaryImageUrl || 'https://www.caskbycask.net/og-image.png'

    return {
      title,
      description,
      robots: buildRobots(true),
      alternates: {
        canonical,
        languages: {
          ko: seo.canonicalUrlKo,
          en: seo.canonicalUrlEn,
          'x-default': seo.canonicalUrlKo,
        },
      },
      openGraph: {
        title,
        description,
        url: canonical,
        images: [
          {
            url: ogImage,
            alt: title,
          },
        ],
        type: 'website',
        siteName: 'CaskByCask',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      },
    }
  }

  const prefix = lang ? `/${lang}` : ''
  try {
    const res = await fetch(`${API_URL}/api/spirits/${id}`, {
      next: { revalidate: 3600 }, // 1시간 동안 캐싱 (ISR)
    })
    
    if (!res.ok) {
      return {
        title: '주류 상세 정보 및 리뷰 (Specs & Reviews) — CaskByCask',
        description: 'CaskByCask에서 각 주류의 상세 정보와 평점 리뷰를 확인해 보세요. Explore detailed specifications and ratings for various spirits.',
        robots: buildRobots(false),
      }
    }
    
    const responseData = await res.json()
    const spirit = responseData.data
    
    if (!spirit) {
      return {
        title: '존재하지 않는 주류 — CaskByCask',
        robots: buildRobots(false),
      }
    }

    const { nameKo, nameEn } = formatSpiritDisplayNames(spirit)

    const title = nameEn 
      ? `${nameKo} (${nameEn}) 주류 정보 & 리뷰 (Specs & Reviews) — CaskByCask` 
      : `${nameKo} 주류 정보 & 리뷰 (Specs & Reviews) — CaskByCask`
      
    const abv = spirit.abv ? `도수 ${spirit.abv}%` : ''
    const abvEn = spirit.abv ? `ABV ${spirit.abv}%` : ''
    const age = spirit.commonDetail?.ageStatement ? `${spirit.commonDetail.ageStatement}년 숙성` : ''
    const ageEn = spirit.commonDetail?.ageStatement ? `${spirit.commonDetail.ageStatement}yo` : ''
    const description = `${nameKo}의 원산지, ${abv}, ${age} 캐스크 정보 등 상세한 주류 정보와 함께 테이스팅 노트 및 평점(${spirit.avgScore ?? spirit.scoreAvg ?? 0}점) 리뷰를 만나보세요. Discover detailed specs (${abvEn}, ${ageEn}), tasting notes, and ratings for ${nameEn || nameKo} on CaskByCask.`
    
    // SEO API 를 쓸 수 없어 slug 를 알 수 없는 상태다.
    // 이 경로에서 만들 수 있는 URL(`/spirits/{id}`)은 sitemap 에 없고 정상 시 canonical 로 301 되는
    // 주소이므로, canonical 로 선언하면 "canonical 이 리다이렉트된다"는 잘못된 신호가 된다.
    // 따라서 canonical 을 생략하고 noindex 로 응답해 다음 정상 크롤에서 복구되게 한다.
    // og:url 은 색인 신호가 아니고 SNS 미리보기 대상이므로 유지한다.
    const shareUrl = `https://www.caskbycask.net${prefix}/spirits/${id}`
    const ogImage = spirit.imageUrl || 'https://www.caskbycask.net/og-image.png'

    return {
      title,
      description,
      robots: buildRobots(false),
      openGraph: {
        title,
        description,
        url: shareUrl,
        images: [
          {
            url: ogImage,
            alt: title,
          },
        ],
        type: 'website',
        siteName: 'CaskByCask',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      },
    }
  } catch (error) {
    return {
      title: '주류 상세 정보 및 리뷰 (Specs & Reviews) — CaskByCask',
      description: 'CaskByCask에서 각 주류의 상세 정보와 평점 리뷰를 확인해 보세요. Explore detailed specifications and ratings for various spirits.',
      robots: buildRobots(false),
    }
  }
}

export async function getSpiritDetailJsonLd(id: string, lang: 'ko' | 'en' | null): Promise<object | null> {
  const numericId = extractLeadingId(id)
  if (!numericId) return null

  const [seo, spirit, reviewsPage] = await Promise.all([
    getSpiritSeo(numericId),
    fetchApiData<SpiritDetailResponse>(`/api/spirits/${numericId}`),
    fetchApiData<PageResponse<ReviewResponse>>(`/api/spirits/${numericId}/reviews?page=0&size=5`),
  ])

  if (!spirit) return null

  const isEn = lang === 'en'
  const { nameKo, nameEn } = formatSpiritDisplayNames(spirit)
  const primaryName = isEn ? nameEn : nameKo
  const secondaryName = isEn ? nameKo : nameEn
  const primaryProducer = isEn
    ? (spirit.producerNameEn || spirit.producerNameKo)
    : spirit.producerNameKo
  const secondaryProducer = isEn
    ? spirit.producerNameKo
    : spirit.producerNameEn
  const canonical = seo
    ? (isEn ? seo.canonicalUrlEn : seo.canonicalUrlKo)
    : `https://www.caskbycask.net${lang ? `/${lang}` : ''}/spirits/${numericId}`
  const primaryImage = spirit.images?.find((image) => image.isPrimary)?.imageUrl
    || spirit.images?.find((image) => image.imageUrl)?.imageUrl
  const image = seo?.primaryImageUrl
    || (primaryImage
      ? (primaryImage.startsWith('http') ? primaryImage : `https://www.caskbycask.net${primaryImage}`)
      : 'https://www.caskbycask.net/og-image.png')
  const reviewCount = spirit.reviewCount ?? 0
  const avgScore = spirit.avgScore == null ? null : Number(spirit.avgScore)
  // aggregateRating 의 개수는 실제 평점 수여야 한다 — 점수 없는 리뷰까지 세면 구조화 데이터가 틀린다.
  const ratedCount = spirit.scoredReviewCount ?? reviewCount
  const labels = localLabels(isEn ? 'en' : 'ko')
  const additionalProperties = compactDetails([
    { label: labels.abv, value: formatAbvValue(spirit.abv, spirit.abvMin, spirit.abvMax) },
    { label: labels.volume, value: formatVolumeValue(spirit.volumeMl, spirit.volumeMlMin, spirit.volumeMlMax) },
    { label: labels.age, value: formatAgeStatement(spirit.commonDetail, isEn ? 'en' : 'ko') },
    { label: labels.vintage, value: spirit.vintageYear ?? (spirit.wineDetail?.vintageStatus === 'NON_VINTAGE' ? 'NV' : null) },
    { label: labels.whiskyStyle, value: spirit.whiskyDetail?.style },
    { label: labels.cask, value: spirit.whiskyDetail?.caskTypes?.filter(Boolean).join(', ') },
    { label: labels.wineType, value: spirit.wineDetail?.wineType },
    { label: labels.cognacGrade, value: spirit.cognacDetail?.grade },
  ]).map((property) => ({
    '@type': 'PropertyValue',
    name: property.label,
    value: property.value,
  }))
  const reviews = (reviewsPage?.content ?? [])
    .filter((review) => review.totalScore != null)
    .map((review) => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: review.nickname || 'CaskByCask user',
      },
      datePublished: review.createdAt || undefined,
      reviewBody: review.comment || review.tasteNote || review.noseNote || review.finishNote || undefined,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: Number(review.totalScore),
        bestRating: 100,
        worstRating: 0,
      },
    }))
  const hasProductSnippetData = (avgScore != null && ratedCount > 0) || reviews.length > 0

  if (!hasProductSnippetData) {
    return buildSpiritRouteGraph({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: primaryName,
      alternateName: secondaryName !== primaryName ? secondaryName : undefined,
      description: isEn
        ? `${primaryName} specs, tasting notes, and detailed liquor information on CaskByCask.`
        : `${primaryName} 상세 주류 정보와 시음 노트를 CaskByCask에서 확인하세요.`,
      url: canonical,
      image,
      about: {
        '@type': 'Thing',
        name: primaryName,
        alternateName: secondaryName !== primaryName ? secondaryName : undefined,
        additionalType: spirit.category || undefined,
      },
    }, canonical, primaryName, resolvedLanguage(lang))
  }

  return buildSpiritRouteGraph({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: primaryName,
    alternateName: secondaryName !== primaryName ? secondaryName : undefined,
    description: isEn
      ? `${primaryName} specs, tasting notes, ratings and reviews on CaskByCask.`
      : `${primaryName} 상세 주류 정보, 시음 노트, 평점과 리뷰를 CaskByCask에서 확인하세요.`,
    url: canonical,
    image,
    category: spirit.category || undefined,
    countryOfOrigin: spirit.country || undefined,
    brand: primaryProducer ? {
      '@type': 'Brand',
      name: primaryProducer,
      alternateName: secondaryProducer || undefined,
    } : undefined,
    additionalProperty: additionalProperties.length > 0 ? additionalProperties : undefined,
    aggregateRating: avgScore != null && ratedCount > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: avgScore,
      ratingCount: ratedCount,
      reviewCount: ratedCount,
      bestRating: 100,
      worstRating: 0,
    } : undefined,
    review: reviews.length > 0 ? reviews : undefined,
  }, canonical, primaryName, resolvedLanguage(lang))
}

function resolvedLanguage(lang: 'ko' | 'en' | null): 'ko' | 'en' {
  return lang === 'en' ? 'en' : 'ko'
}

function buildSpiritRouteGraph(
  primarySchema: Record<string, unknown>,
  canonical: string,
  spiritName: string,
  lang: 'ko' | 'en',
): object {
  const { '@context': _context, ...primary } = primarySchema
  const home = `${SITE_URL}/${lang}`
  const spirits = `${home}/spirits`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      primary,
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: lang === 'en' ? 'Home' : '홈', item: home },
          { '@type': 'ListItem', position: 2, name: lang === 'en' ? 'Spirits' : '주류', item: spirits },
          { '@type': 'ListItem', position: 3, name: spiritName, item: canonical },
        ],
      },
    ],
  }
}

function formatEditionDisplayName(
  name: string | null | undefined,
  seriesIdentifier: string | null | undefined,
  variantValue: string | null | undefined,
) {
  return [name, seriesIdentifier, variantValue]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
}

function formatSpiritDisplayNames(spirit: SpiritDetailResponse) {
  const hasEdition = spirit.variantType && spirit.variantType !== 'NONE'
  const baseNameKo = hasEdition
    ? formatEditionDisplayName(spirit.nameKo, spirit.seriesIdentifier, spirit.variantValue)
    : spirit.nameKo
  const baseNameEn = hasEdition
    ? formatEditionDisplayName(
        spirit.nameEn || spirit.nameKo,
        spirit.seriesIdentifierEn || spirit.seriesIdentifier,
        spirit.variantValueEn || spirit.variantValue,
      )
    : (spirit.nameEn || spirit.nameKo)
  const vintageSource = {
    category: spirit.category,
    vintageYear: spirit.vintageYear,
    vintageStatus: spirit.wineDetail?.vintageStatus,
  }
  return {
    nameKo: appendWineVintageDisplay(baseNameKo, vintageSource),
    nameEn: appendWineVintageDisplay(baseNameEn, vintageSource),
  }
}

function formatPriceObservation(
  observation: SpiritSeoPriceObservationResponse | null | undefined,
  lang: 'ko' | 'en',
) {
  if (!observation) return null
  const amount = Number(observation.amount)
  if (!Number.isFinite(amount) || amount <= 0) return null
  const currency = observation.currency?.toUpperCase() || 'KRW'
  let formattedAmount: string
  try {
    formattedAmount = new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ko-KR', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'KRW' ? 0 : 2,
    }).format(amount)
  } catch {
    formattedAmount = `${amount.toLocaleString(lang === 'en' ? 'en-US' : 'ko-KR')} ${currency}`
  }
  return [formattedAmount, observation.sourceName, observation.observedDate]
    .filter(Boolean)
    .join(' · ')
}

/**
 * 해당 주류가 태그된 커뮤니티 글.
 * <p>게시판 목록은 최신 글로 계속 밀려나므로, 주류 상세처럼 주소가 고정된 페이지에서
 * 링크를 걸어 주어야 오래된 글도 크롤 경로를 잃지 않는다.
 * 커뮤니티 본문은 한국어만 있으므로 영문 주류 페이지에서도 한국어 글을 가리킨다.
 * <p>일반 목록 API(`/api/posts`)를 쓰지 않는 이유: boardType 을 주지 않으면 서버가
 * NOTICE+FREE 로 좁히기 때문에 정작 주류 태그가 가장 많이 달린 이미지 갤러리 글이 통째로 빠진다.
 */
async function getPostsTaggedWithSpirit(spiritId: string): Promise<SeoSnapshotItem[]> {
  const page = await fetchApiData<PageResponse<CommunityPostListItemResponse>>(
    `/api/seo/spirits/${spiritId}/posts?page=0&size=10`, 300)
  return (page?.content || [])
    .filter((post) => !isRestrictedPost(post))
    .map((post) => ({
      title: post.title,
      href: `/ko/community/${(post.boardType || 'FREE').toLowerCase()}/${post.id}`,
      description: post.authorNickname || null,
      meta: formatDateOnly(post.createdAt),
    }))
}

export async function getSpiritSeoSnapshot(id: string, lang: 'ko' | 'en' | null): Promise<SeoSnapshotData | null> {
  const numericId = extractLeadingId(id)
  if (!numericId) return null

  const resolvedLang = normalizeLang(lang)
  const isEn = resolvedLang === 'en'
  const labels = localLabels(resolvedLang)
  const [seo, spirit, relatedPosts] = await Promise.all([
    getSpiritSeo(numericId),
    fetchApiData<SpiritDetailResponse>(`/api/spirits/${numericId}`),
    getPostsTaggedWithSpirit(numericId),
  ])
  if (!spirit) return null

  const { nameKo, nameEn } = formatSpiritDisplayNames(spirit)
  const title = isEn ? nameEn : nameKo
  const subtitle = isEn ? nameKo : (nameEn !== nameKo ? nameEn : null)
  const primaryProducer = isEn
    ? (spirit.producerNameEn || spirit.producerNameKo)
    : spirit.producerNameKo
  const secondaryProducer = isEn ? spirit.producerNameKo : spirit.producerNameEn
  const primaryImage = spirit.images?.find((image) => image.isPrimary)?.imageUrl
    || spirit.images?.find((image) => image.imageUrl)?.imageUrl
  const image = toAbsoluteImageUrl(seo?.primaryImageUrl)
    || toAbsoluteImageUrl(primaryImage)
    || 'https://www.caskbycask.net/og-image.png'
  const score = formatDecimal(spirit.avgScore)
  const reviewCount = formatCount(spirit.reviewCount, resolvedLang)
  const viewCount = formatCount(spirit.viewCount, resolvedLang)
  const abv = formatAbvValue(spirit.abv, spirit.abvMin, spirit.abvMax)
  const volume = formatVolumeValue(spirit.volumeMl, spirit.volumeMlMin, spirit.volumeMlMax)
  const age = formatAgeStatement(spirit.commonDetail, resolvedLang)
  const canonicalPath = seo
    ? (isEn ? seo.canonicalPathEn : seo.canonicalPathKo)
    : `/${resolvedLang}/spirits/${numericId}`
  const description = seo
    ? (isEn ? seo.descriptionEn : seo.descriptionKo)
    : [
        title,
        primaryProducer,
        spirit.country,
        abv ? `${labels.abv} ${abv}` : null,
        score ? `${labels.score} ${score}/100` : null,
      ].filter(Boolean).join(' · ')
  const caskTypes = spirit.whiskyDetail?.caskTypes?.filter(Boolean).join(', ')
  const caskFinishes = spirit.whiskyDetail?.caskFinishes?.filter(Boolean).join(', ')
  const grapes = spirit.wineDetail?.grapeVarieties
    ?.map((grape) => grape.name
      ? `${grape.name}${grape.percentage != null ? ` ${grape.percentage}%` : ''}`
      : null)
    .filter(Boolean)
    .join(', ')
  const relationLinks = [
    ...(seo?.parent ? [{
      label: `${isEn ? 'Regular product' : '정규 주류'}: ${isEn ? seo.parent.nameEn : seo.parent.nameKo}`,
      href: isEn ? seo.parent.canonicalPathEn : seo.parent.canonicalPathKo,
    }] : []),
    ...((seo?.editions ?? [])
      .filter((edition) => edition.id !== Number(numericId))
      .map((edition) => ({
        label: `${isEn ? 'Edition' : '에디션'}: ${isEn ? edition.nameEn : edition.nameKo}`,
        href: isEn ? edition.canonicalPathEn : edition.canonicalPathKo,
      }))),
  ]
  const recentPrice = formatPriceObservation(seo?.recentPrice, resolvedLang)
  const recentHotDeal = formatPriceObservation(seo?.recentHotDeal, resolvedLang)
  const hotDealSource = seo?.recentHotDeal?.sourceUrl?.match(/^https?:\/\//i)
    ? seo.recentHotDeal.sourceUrl
    : null

  return {
    kind: 'spirit',
    lang: resolvedLang,
    eyebrow: categoryLabel(spirit.category, resolvedLang),
    title,
    subtitle,
    description,
    image,
    metrics: compactDetails([
      { label: labels.score, value: score ? `${score}/100` : null },
      { label: labels.reviews, value: reviewCount },
      { label: labels.views, value: viewCount },
      { label: labels.abv, value: abv },
    ]),
    details: compactDetails([
      { label: labels.category, value: categoryLabel(spirit.category, resolvedLang) },
      { label: labels.producer, value: primaryProducer && secondaryProducer && secondaryProducer !== primaryProducer ? `${primaryProducer} (${secondaryProducer})` : primaryProducer },
      { label: labels.country, value: spirit.country },
      { label: labels.region, value: spirit.region },
      { label: labels.volume, value: volume },
      { label: labels.age, value: age },
      { label: labels.vintage, value: spirit.vintageYear ?? (spirit.wineDetail?.vintageStatus === 'NON_VINTAGE' ? 'NV' : null) },
      { label: labels.bottleNo, value: spirit.commonDetail?.bottleNo },
      { label: labels.whiskyStyle, value: spirit.whiskyDetail?.style },
      { label: labels.cask, value: caskFinishes ? `${caskTypes || ''} / Finish: ${caskFinishes}` : caskTypes },
      { label: labels.wineType, value: spirit.wineDetail?.wineType },
      { label: labels.wineType, value: grapes },
      { label: labels.cognacGrade, value: spirit.cognacDetail?.grade },
      { label: isEn ? 'Recently confirmed purchase price' : '최근 확인 가격', value: recentPrice },
      { label: isEn ? 'Recently approved special price' : '최근 승인 특가', value: recentHotDeal },
    ]),
    sourceUrls: hotDealSource ? [hotDealSource] : [],
    items: relatedPosts.length > 0 ? relatedPosts : undefined,
    itemsHeading: relatedPosts.length > 0
      ? (isEn ? 'Community posts about this bottle' : '이 주류를 언급한 글')
      : undefined,
    links: [
      { label: labels.home, href: `/${resolvedLang}` },
      { label: labels.spirits, href: `/${resolvedLang}/spirits` },
      { label: categoryLabel(spirit.category, resolvedLang), href: `/${resolvedLang}/spirits?category=${spirit.category || ''}` },
      { label: title, href: canonicalPath },
      ...(recentPrice ? [{
        label: isEn ? 'View price reports' : '가격 제보 확인',
        href: `/${resolvedLang}/price-tracker/spirits/${numericId}`,
      }] : []),
      ...relationLinks,
    ],
  }
}

function decodeHtmlAttr(value: string): string {
  return value
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
}

/** 임베드 앵커 하나에서 속성값을 읽는다. `data-spirit-name` 은 `-en` 변형과 겹치지 않는다. */
function embedAttr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\b${name}="([^"]*)"`))
  return match ? decodeHtmlAttr(match[1]) : null
}

/** 본문 리치텍스트에 삽입된 주류 카드 임베드. 태그 응답과 같은 모양으로 맞춰 함께 다룬다. */
function parseSpiritEmbeds(html: string): CommunityPostSpiritTagResponse[] {
  const refs = new Map<number, CommunityPostSpiritTagResponse>()
  for (const match of html.matchAll(/<a\b[^>]*\bdata-spirit-id="?(\d+)"?[^>]*>/g)) {
    const spiritId = Number(match[1])
    if (!Number.isFinite(spiritId) || refs.has(spiritId)) continue
    refs.set(spiritId, {
      spiritId,
      nameKo: embedAttr(match[0], 'data-spirit-name'),
      nameEn: embedAttr(match[0], 'data-spirit-name-en'),
      category: embedAttr(match[0], 'data-spirit-category'),
    })
  }
  return [...refs.values()]
}

/**
 * 주류 카드 임베드에 실제 href 를 채운다.
 * <p>에디터가 만드는 임베드 앵커에는 href 가 없고 이동은 JS 클릭 핸들러가 맡는다. 그래서
 * 크롤러에게는 막다른 길이 되고, 본문이 그 주류를 다루고 있다는 신호가 주류 상세로 가지 않는다.
 * 저장된 원문은 그대로 두고 SSR 로 내보내는 본문에서만 채운다.
 */
function linkSpiritEmbeds(html: string, hrefBySpiritId: Map<number, string>): string {
  return html.replace(
    /<a\b([^>]*\bdata-spirit-id="?(\d+)"?[^>]*)>/g,
    (tag, attrs: string, rawId: string) => {
      if (/\shref\s*=/.test(attrs)) return tag
      const href = hrefBySpiritId.get(Number(rawId))
      return href ? `<a href="${escapeHtml(href)}"${attrs}>` : tag
    },
  )
}

/**
 * 게시글이 가리키는 주류로 나가는 링크.
 * <p>커뮤니티에서 모인 링크 신호를 1순위 색인 대상인 주류 상세로 흘려보낸다.
 * 주류 태그(이미지 갤러리 전용)와 본문 임베드(모든 게시판)를 함께 본다 — 태그를 달 수 없는
 * 게시판의 글도 본문에서 주류를 지목하고 있으면 링크가 이어져야 한다.
 * 정본 주소는 SEO API 로 확인한다. `/spirits/{id}` 로 바로 걸면 매번 301 을 한 번 더 탄다.
 */
async function getSpiritLinksForPost(
  tags: CommunityPostSpiritTagResponse[] | null | undefined,
  lang: 'ko' | 'en',
): Promise<{ items: SeoSnapshotItem[]; hrefBySpiritId: Map<number, string> }> {
  const unique = [...new Map(
    (tags || [])
      .filter((tag) => tag?.spiritId != null)
      .map((tag) => [tag.spiritId, tag] as const),
  ).values()].slice(0, 8)
  const hrefBySpiritId = new Map<number, string>()
  if (unique.length === 0) return { items: [], hrefBySpiritId }

  const resolved = await Promise.all(unique.map(async (tag): Promise<SeoSnapshotItem | null> => {
    const seo = await getSpiritSeo(String(tag.spiritId))
    const name = lang === 'en' ? (tag.nameEn || tag.nameKo) : (tag.nameKo || tag.nameEn)
    const href = seo
      ? (lang === 'en' ? seo.canonicalPathEn : seo.canonicalPathKo)
      : `/${lang}/spirits/${tag.spiritId}`
    if (!name || !href) return null
    hrefBySpiritId.set(tag.spiritId, href)
    return { title: name, href, description: categoryLabel(tag.category, lang) }
  }))
  return {
    items: resolved.filter((item): item is SeoSnapshotItem => item !== null),
    hrefBySpiritId,
  }
}

export async function getCommunityPostSeoSnapshot(
  boardType: string,
  id: string,
  lang: 'ko' | 'en' | null,
): Promise<SeoSnapshotData | null> {
  const resolvedLang = normalizeLang(lang)
  const labels = localLabels(resolvedLang)
  const numericId = extractLeadingId(id)
  if (!numericId) return null
  const post = await fetchApiData<CommunityPostResponse>(`/api/posts/${numericId}`, 60)
  if (!post || isRestrictedPost(post)) return null

  const bodyHtml = getPostContentHtml(post)
  const boardName = boardLabel(post.boardType || boardType, resolvedLang)
  const canonicalBoard = post.boardType?.toUpperCase() === 'NOTICE' ? 'notice' : 'free'
  const description = stripHtmlAndSummarize(bodyHtml, 220)
  const image = toAbsoluteImageUrl(post.imageUrl || post.images?.[0]?.imageUrl)
  // 주류 태그는 이미지 갤러리에만 붙는다. 그 외 게시판은 본문 임베드가 유일한 연결 고리다.
  const spiritLinks = await getSpiritLinksForPost(
    [...(post.spiritTags || []), ...parseSpiritEmbeds(bodyHtml)],
    resolvedLang,
  )
  const linkedBodyHtml = linkSpiritEmbeds(bodyHtml, spiritLinks.hrefBySpiritId)

  return {
    kind: 'community',
    lang: resolvedLang,
    eyebrow: boardName,
    title: post.title,
    subtitle: post.prefix?.name || null,
    description,
    image,
    metrics: compactDetails([
      { label: labels.views, value: formatCount(post.viewCount, resolvedLang) },
      { label: labels.likes, value: formatCount(post.likeCount, resolvedLang) },
      { label: labels.comments, value: formatCount(post.commentCount, resolvedLang) },
    ]),
    details: compactDetails([
      { label: labels.category, value: boardName },
      { label: labels.host, value: post.authorNickname },
      { label: resolvedLang === 'en' ? 'Published' : '작성일', value: formatDateOnly(post.createdAt) },
      { label: resolvedLang === 'en' ? 'Updated' : '수정일', value: formatDateOnly(post.updatedAt) },
    ]),
    bodyHtml: linkedBodyHtml || null,
    sourceUrls: post.sourceUrls || [],
    hashtags: post.hashtags || [],
    items: spiritLinks.items.length > 0 ? spiritLinks.items : undefined,
    itemsHeading: spiritLinks.items.length > 0
      ? (resolvedLang === 'en' ? 'Spirits mentioned in this post' : '이 글에서 언급한 주류')
      : undefined,
    links: [
      { label: labels.home, href: '/ko' },
      { label: labels.community, href: '/ko/community/all' },
      { label: boardName, href: `/ko/community/${canonicalBoard}` },
      { label: post.title, href: `/ko/community/${canonicalBoard}/${numericId}` },
    ],
  }
}

export async function getByobPostSeoSnapshot(id: string, lang: 'ko' | 'en' | null): Promise<SeoSnapshotData | null> {
  const resolvedLang = normalizeLang(lang)
  const labels = localLabels(resolvedLang)
  const numericId = extractLeadingId(id)
  if (!numericId) return null
  const byob = await fetchApiData<ByobDetailResponse>(`/api/byob/${numericId}`, 60)
  if (!byob) return null

  const participantValue = byob.maxParticipants != null
    ? `${byob.approvedCount ?? 0}/${byob.maxParticipants}`
    : formatCount(byob.approvedCount, resolvedLang)
  const description = stripHtmlAndSummarize(byob.content || '', 220)

  return {
    kind: 'byob',
    lang: resolvedLang,
    eyebrow: labels.byob,
    title: byob.title,
    subtitle: byob.location || null,
    description,
    image: 'https://www.caskbycask.net/og-image.png',
    metrics: compactDetails([
      { label: labels.eventAt, value: formatDateOnly(byob.eventAt) },
      { label: labels.participants, value: participantValue },
      { label: labels.status, value: byob.status },
    ]),
    details: compactDetails([
      { label: labels.host, value: byob.hostNickname },
      { label: labels.location, value: [byob.location, byob.address].filter(Boolean).join(' ') },
      { label: labels.recruitEndAt, value: formatDateOnly(byob.recruitEndAt) },
      { label: labels.hostBottles, value: byob.hostBottles?.join(', ') },
    ]),
    bodyHtml: plainTextToHtml(byob.content),
    links: [
      { label: labels.home, href: '/ko' },
      { label: labels.community, href: '/ko/community/all' },
      { label: labels.byob, href: '/ko/community/byob' },
      { label: byob.title, href: `/ko/community/byob/${numericId}` },
    ],
  }
}

/**
 * 커뮤니티 게시글 상세 페이지 메타데이터를 반환합니다.
 */
export async function getCommunityPostMetadata(boardType: string, id: string, lang: 'ko' | 'en' | null): Promise<Metadata> {
  const numericId = extractLeadingId(id)
  const normalizedBoard = boardType === 'notice' || boardType === 'free' || boardType === 'photo'
    ? boardType : null
  if (!numericId || !normalizedBoard) return getNoindexMetadata(lang, '커뮤니티 게시글 — CaskByCask')

  const post = await fetchApiData<CommunityPostResponse>(`/api/posts/${numericId}`, 60)
  if (!post) return getNoindexMetadata(lang, '존재하지 않는 게시글 — CaskByCask')

  const canonicalBoard = (post.boardType || 'FREE').toLowerCase()
  const title = `${post.title} — CaskByCask`
  const description = stripHtmlAndSummarize(getPostContentHtml(post))
    || 'CaskByCask 커뮤니티 게시글 상세 페이지입니다.'
  const canonical = `${SITE_URL}/ko/community/${canonicalBoard}/${numericId}`
  const ogImage = toAbsoluteImageUrl(post.imageUrl || post.images?.[0]?.imageUrl) || DEFAULT_OG_IMAGE
  const restricted = isRestrictedPost(post)

  return {
    title,
    description,
    keywords: post.hashtags?.length ? post.hashtags : undefined,
    robots: buildRobots(!restricted),
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      images: [{ url: ogImage, alt: title }],
      type: 'article',
      siteName: 'CaskByCask',
      locale: 'ko_KR',
      publishedTime: toKstIsoDateTime(post.createdAt),
      modifiedTime: toKstIsoDateTime(post.updatedAt || post.createdAt),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

/**
 * 커뮤니티 게시글 JSON-LD 스키마 데이터를 생성해 반환합니다.
 */
export async function getCommunityPostJsonLd(boardType: string, id: string, lang: 'ko' | 'en' | null): Promise<object | null> {
  if (normalizeLang(lang) === 'en') return null
  const numericId = extractLeadingId(id)
  if (!numericId || (boardType !== 'notice' && boardType !== 'free' && boardType !== 'photo')) return null

  const post = await fetchApiData<CommunityPostResponse>(`/api/posts/${numericId}`, 60)
  if (!post || isRestrictedPost(post)) return null

  const body = getPostContentHtml(post)
  const text = stripHtmlToText(body)
  const image = toAbsoluteImageUrl(post.imageUrl || post.images?.[0]?.imageUrl)
  if ((!text && !image) || !post.createdAt) return null
  const canonicalBoard = (post.boardType || 'FREE').toLowerCase()
  const isNewsArticle = canonicalBoard === 'notice'
  const canonical = `${SITE_URL}/ko/community/${canonicalBoard}/${numericId}`
  const postingId = `${canonical}#posting`
  const breadcrumbId = `${canonical}#breadcrumb`
  const commentsPage = (post.commentCount || 0) > 0
    ? await fetchApiData<PageResponse<CommunityPostCommentResponse>>(`/api/posts/${numericId}/comments?page=0&size=30`, 60)
    : null
  const comments = (commentsPage?.content || [])
    .map((comment) => buildCommentJsonLd(comment, canonical))
    .filter((comment): comment is object => comment !== null)

  const mainEntity = isNewsArticle
    ? {
        '@type': 'NewsArticle',
        '@id': postingId,
        'mainEntityOfPage': { '@id': canonical },
        'headline': post.title,
        'text': text || undefined,
        'articleBody': text || undefined,
        'url': canonical,
        'datePublished': toKstIsoDateTime(post.createdAt),
        'dateModified': toKstIsoDateTime(post.updatedAt || post.createdAt),
        'articleSection': boardLabel(post.boardType || boardType, 'ko'),
        'inLanguage': 'ko-KR',
        'isAccessibleForFree': true,
        'image': image || undefined,
        'keywords': post.hashtags?.length ? post.hashtags.join(', ') : undefined,
        'citation': post.sourceUrls?.length ? post.sourceUrls : undefined,
        'publisher': {
          '@type': 'Organization',
          'name': 'CaskByCask',
          'url': SITE_URL,
          'logo': { '@type': 'ImageObject', 'url': `${SITE_URL}/logo.png` },
        },
        'author': {
          '@type': 'Organization',
          'name': '소식관리자',
          'url': SITE_URL,
        },
      }
    : {
        '@type': 'DiscussionForumPosting',
        '@id': postingId,
        'mainEntityOfPage': { '@id': canonical },
        'headline': post.title,
        'text': text || undefined,
        'articleBody': text || undefined,
        'url': canonical,
        'datePublished': toKstIsoDateTime(post.createdAt),
        'dateModified': toKstIsoDateTime(post.updatedAt || post.createdAt),
        'articleSection': boardLabel(post.boardType || boardType, 'ko'),
        'inLanguage': 'ko-KR',
        'isAccessibleForFree': true,
        'image': image || undefined,
        'comment': comments.length > 0 ? comments : undefined,
        'publisher': {
          '@type': 'Organization',
          'name': 'CaskByCask',
          'url': SITE_URL,
        },
        'author': {
          '@type': 'Person',
          'name': post.authorNickname || post.authorName || 'User',
          'url': post.authorId ? `${SITE_URL}/ko/users/${post.authorId}/reviews` : undefined,
        },
        'interactionStatistic': [
          {
            '@type': 'InteractionCounter',
            'interactionType': 'https://schema.org/LikeAction',
            'userInteractionCount': post.likeCount || 0,
          },
          {
            '@type': 'InteractionCounter',
            'interactionType': 'https://schema.org/CommentAction',
            'userInteractionCount': post.commentCount || 0,
          },
          {
            '@type': 'InteractionCounter',
            'interactionType': 'https://schema.org/ViewAction',
            'userInteractionCount': post.viewCount || 0,
          },
        ],
      }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': canonical,
        'url': canonical,
        'name': post.title,
        'inLanguage': 'ko-KR',
        'breadcrumb': { '@id': breadcrumbId },
        'mainEntity': { '@id': postingId },
      },
      mainEntity,
      {
        '@type': 'BreadcrumbList',
        '@id': breadcrumbId,
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': '홈', 'item': `${SITE_URL}/ko` },
          { '@type': 'ListItem', 'position': 2, 'name': canonicalBoard === 'notice' ? '소식' : '자유게시판', 'item': `${SITE_URL}/ko/community/${canonicalBoard}` },
          { '@type': 'ListItem', 'position': 3, 'name': post.title, 'item': canonical },
        ],
      },
    ],
  }
}

/**
 * BYOB 모임 상세 페이지 메타데이터를 반환합니다.
 */
export async function getByobPostMetadata(id: string, lang: 'ko' | 'en' | null): Promise<Metadata> {
  const numericId = extractLeadingId(id)
  if (!numericId) return getNoindexMetadata(lang, 'BYOB 모임 상세 — CaskByCask')

  const byob = await fetchApiData<ByobDetailResponse>(`/api/byob/${numericId}`, 60)
  if (!byob) return getNoindexMetadata(lang, '존재하지 않는 BYOB 모임 — CaskByCask')

  const title = `${byob.title} (BYOB 모임) — CaskByCask`
  const description = stripHtmlAndSummarize(byob.content || '')
    || 'CaskByCask BYOB 주류 공유 모임 모집글 상세 페이지입니다.'
  const canonical = `${SITE_URL}/ko/community/byob/${numericId}`

  return {
    title,
    description,
    robots: buildRobots(byob.status !== 'CANCELLED'),
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      images: [{ url: DEFAULT_OG_IMAGE, alt: title }],
      type: 'website',
      siteName: 'CaskByCask',
      locale: 'ko_KR',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  }
}

/**
 * BYOB 모임 JSON-LD 스키마 데이터를 생성해 반환합니다.
 */
export async function getByobPostJsonLd(id: string, lang: 'ko' | 'en' | null): Promise<object | null> {
  if (normalizeLang(lang) === 'en') return null
  const numericId = extractLeadingId(id)
  if (!numericId) return null
  const byob = await fetchApiData<ByobDetailResponse>(`/api/byob/${numericId}`, 60)
  if (!byob || !byob.eventAt || !byob.location || byob.status === 'CANCELLED') return null

  const canonical = `${SITE_URL}/ko/community/byob/${numericId}`
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': `${canonical}#event`,
    'mainEntityOfPage': canonical,
    'name': byob.title,
    'url': canonical,
    'description': stripHtmlAndSummarize(byob.content || '', 300),
    'startDate': toKstIsoDateTime(byob.eventAt),
    'eventStatus': 'https://schema.org/EventScheduled',
    'eventAttendanceMode': 'https://schema.org/OfflineEventAttendanceMode',
    'image': [DEFAULT_OG_IMAGE],
    'maximumAttendeeCapacity': byob.maxParticipants || undefined,
    'remainingAttendeeCapacity': byob.maxParticipants != null && byob.approvedCount != null
      ? Math.max(byob.maxParticipants - byob.approvedCount, 0)
      : undefined,
    'location': {
      '@type': 'Place',
      'name': byob.location,
      'address': {
        '@type': 'PostalAddress',
        'streetAddress': byob.address || byob.location,
        'addressLocality': byob.location,
        'addressCountry': 'KR',
      },
    },
    'organizer': {
      '@type': 'Person',
      'name': byob.hostNickname || 'CaskByCask member',
      'url': canonical,
    },
  }
}

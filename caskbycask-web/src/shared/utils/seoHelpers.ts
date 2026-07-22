import { Metadata } from 'next'
import {
  SPIRIT_CATEGORY_META,
  isSpiritSeoCategory,
  type SpiritSeoCategory,
} from '@/domain/spirit/config/spiritSeo'

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
  bottler?: string | null
  bottledYear?: number | null
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
  viewCount?: number | null
  updatedAt?: string | null
  commonDetail?: {
    isNas?: boolean | null
    ageStatement?: number | null
    ageStatementMonths?: number | null
    ageStatementMin?: number | null
    ageStatementMinMonths?: number | null
    ageStatementMax?: number | null
    ageStatementMaxMonths?: number | null
    distilledDate?: string | null
    bottledDate?: string | null
    releaseDate?: string | null
    batchNo?: string | null
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
    vintage?: number | null
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
    oakType?: string | null
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

interface CommunityPostResponse {
  id: number
  boardType?: string | null
  prefix?: { name?: string | null } | null
  title: string
  content?: string | null
  contentSanitized?: string | null
  authorNickname?: string | null
  authorName?: string | null
  viewCount?: number | null
  likeCount?: number | null
  commentCount?: number | null
  isLocked?: boolean | null
  isHidden?: boolean | null
  adultOnly?: boolean | null
  createdAt?: string | null
  updatedAt?: string | null
  imageUrl?: string | null
  images?: Array<{ imageUrl?: string | null }> | null
  sourceUrls?: string[] | null
  hashtags?: string[] | null
}

interface CommunityPostListItemResponse {
  id: number
  boardType?: string | null
  title: string
  isLocked?: boolean | null
  adultOnly?: boolean | null
  authorNickname?: string | null
  createdAt?: string | null
}

interface CommunityPostCommentResponse {
  id: number
  authorNickname?: string | null
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

export interface SeoSnapshotData {
  kind: 'spirit' | 'spirits-list' | 'community' | 'byob' | 'board-list' | 'notice'
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
  links: Array<{ label: string; href: string }>
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

async function fetchApiData<T>(path: string, revalidate = 3600): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      next: { revalidate },
    })
    if (!res.ok) return null
    const responseData = await res.json() as ApiResponse<T>
    return responseData.data ?? null
  } catch {
    return null
  }
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
  if (!text) return null

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
  const min = formatAgeParts(detail.ageStatementMin, detail.ageStatementMinMonths, lang)
  const max = formatAgeParts(detail.ageStatementMax, detail.ageStatementMaxMonths, lang)
  if (min && max) return min === max ? min : `${min} ~ ${max}`
  if (min) return lang === 'en' ? `${min} or older` : `${min} 이상`
  if (max) return lang === 'en' ? `up to ${max}` : `${max} 이하`
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
        bottler: 'Bottler',
        vintage: 'Vintage',
        bottledYear: 'Bottled year',
        releaseDate: 'Release date',
        batchNo: 'Batch No.',
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
        bottler: '병입자',
        vintage: '빈티지',
        bottledYear: '병입 연도',
        releaseDate: '출시일',
        batchNo: '배치 번호',
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

export type BoardListType = 'all' | 'notice' | 'free' | 'byob' | 'notices'
export type MetadataSearchParams = Record<string, string | string[] | undefined>

interface ParsedPath {
  type: 'home' | 'spirits-list' | 'spirit-detail' | 'community-list' | 'community-detail'
    | 'notices-list' | 'notice-detail' | 'byob-detail' | 'noindex' | 'default' | 'not-found'
  lang: 'ko' | 'en' | null
  spiritId?: string
  boardType?: string
  boardListType?: BoardListType
  postId?: string
  canonicalPath?: string
  /** Public API resource used only to distinguish a real 404 from restricted/unavailable content. */
  resourcePath?: string
}

function isKnownPrivatePath(segments: string[]): boolean {
  const path = segments.join('/')
  const exact = new Set([
    'login', 'signup', 'oauth/callback', 'oauth/signup', 'account-recovery', 'inquiry',
    'notifications', 'mypage', 'price-tracker/register',
    'taste-trees/new', 'taste-trees/mine',
    'request/spirit', 'request/spirit/my', 'request/producer',
    'request/feedback', 'request/feedback/new',
  ])
  if (exact.has(path)) return true
  return [
    /^taste-trees\/\d+\/edit$/,
    /^spirits\/\d+\/review\/write$/,
    /^spirits\/\d+\/review\/\d+\/edit$/,
    /^community\/(?:all|notice|free|byob)\/write$/,
    /^community\/(?:all|notice|free|byob)\/\d+\/edit$/,
    /^request\/feedback\/\d+(?:\/edit)?$/,
  ].some((pattern) => pattern.test(path))
}

function isKnownAdminPath(segments: string[]): boolean {
  if (segments[0] !== 'admin') return false
  const path = segments.slice(1).join('/')
  const exact = new Set([
    '', 'users', 'users/nickname-bad-words', 'spirits', 'spirits/new',
    'spirits/requests', 'spirits/variant-requests', 'producers', 'producers/requests',
    'reports', 'notices', 'notices/new', 'popups', 'popups/new', 'banners',
    'banners/new', 'events', 'community/post-reports', 'community/ai-news',
    'community/ai-news/new', 'community/bad-words', 'community/emojis',
    'community/prefixes', 'price-reports', 'stores', 'deals', 'score/points',
    'score/levels', 'legal', 'legal/new', 'emails/send', 'emails/history',
    'inquiries', 'logs', 'faq', 'faq/new', 'taste-trees', 'taste-trees/new',
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
    if (!board || !['all', 'notice', 'free', 'byob'].includes(board)) {
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
    'ranking', 'terms', 'privacy', 'operation-policy', 'faq', 'calendar',
  ])
  if (remaining.length === 1 && knownPublicRoots.has(remaining[0])) {
    return { type: 'default', lang, canonicalPath: remaining.join('/') }
  }

  if (remaining[0] === 'tier-lists' && remaining.length <= 2) {
    return {
      type: 'default',
      lang,
      canonicalPath: remaining.join('/'),
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

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function isBoardListNoindex(
  board: BoardListType,
  searchParams: MetadataSearchParams,
): boolean {
  const page = firstSearchParam(searchParams.page)
  if (page != null && page !== '' && page !== '0') return true

  if (board === 'notices') {
    return Boolean(firstSearchParam(searchParams.category))
  }
  if (board === 'byob') {
    const status = firstSearchParam(searchParams.status)
    return Boolean(status && status !== 'ALL')
  }

  const tab = firstSearchParam(searchParams.tab)
  const sort = firstSearchParam(searchParams.sort)
  if (tab && tab !== 'all') return true
  if (sort && sort !== 'LATEST') return true

  return ['keyword', 'prefix', 'authorId', 'commentAuthorId', 'authorNickname', 'distilleryTagId']
    .some((key) => Boolean(firstSearchParam(searchParams[key])))
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

export function getBoardListMetadata(
  board: BoardListType,
  lang: 'ko' | 'en' | null,
  noindex = false,
): Metadata {
  const resolvedLang = normalizeLang(lang)
  const config = BOARD_LIST_CONFIG[board]
  const title = config.title[resolvedLang]
  const description = config.description[resolvedLang]
  // 게시판 본문은 별도 영문 번역 데이터가 없으므로 검색 신호를 한국어 원문으로 통합한다.
  const canonical = `${SITE_URL}/ko${config.path}`

  return {
    title,
    description,
    robots: buildRobots(!noindex),
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

export async function getBoardListSeoSnapshot(
  board: BoardListType,
  lang: 'ko' | 'en' | null,
): Promise<SeoSnapshotData> {
  const resolvedLang = normalizeLang(lang)
  const config = BOARD_LIST_CONFIG[board]
  const canonicalPath = `/ko${config.path}`
  let totalElements: number | undefined
  let items: SeoSnapshotItem[] = []

  if (board === 'notices') {
    const page = await fetchApiData<PageResponse<NoticeListItemResponse>>('/api/notices?page=0&size=20', 300)
    totalElements = page?.totalElements
    items = (page?.content || []).map((notice) => ({
      title: notice.title,
      href: `/ko/notices/${notice.id}`,
      description: notice.category || null,
      meta: formatDateOnly(notice.createdAt),
    }))
  } else if (board === 'byob') {
    const page = await fetchApiData<PageResponse<ByobListItemResponse>>('/api/byob?page=0&size=12', 60)
    totalElements = page?.totalElements
    items = (page?.content || [])
      .filter((byob) => byob.status !== 'CANCELLED')
      .map((byob) => ({
        title: byob.title,
        href: `/ko/community/byob/${byob.id}`,
        description: byob.location || null,
        meta: formatDateOnly(byob.eventAt),
      }))
  } else {
    const boardType = board === 'notice' ? 'NOTICE' : board === 'free' ? 'FREE' : null
    const query = new URLSearchParams({ page: '0', size: '20', sort: 'LATEST' })
    if (boardType) query.set('boardType', boardType)
    const page = await fetchApiData<PageResponse<CommunityPostListItemResponse>>(`/api/posts?${query.toString()}`, 60)
    totalElements = page?.totalElements
    items = (page?.content || [])
      .filter((post) => !post.isLocked && !post.adultOnly)
      .map((post) => {
        const pathBoard = post.boardType?.toUpperCase() === 'NOTICE' ? 'notice' : 'free'
        return {
          title: post.title,
          href: `/ko/community/${pathBoard}/${post.id}`,
          description: post.authorNickname || null,
          meta: formatDateOnly(post.createdAt),
        }
      })
  }

  const countLabel = resolvedLang === 'en' ? 'Public posts' : '공개 글'
  return {
    kind: 'board-list',
    lang: resolvedLang,
    eyebrow: config.eyebrow[resolvedLang],
    title: config.title[resolvedLang].replace(/\s+—\s+CaskByCask$/, ''),
    description: config.description[resolvedLang],
    image: null,
    metrics: totalElements == null
      ? []
      : [{ label: countLabel, value: totalElements.toLocaleString(resolvedLang === 'en' ? 'en-US' : 'ko-KR') }],
    details: [],
    items,
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
  const description = stripHtmlAndSummarize(notice.contentSanitized || '', 220)
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
    bodyHtml: notice.contentSanitized || null,
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
    ko: { title: '주류 티어리스트 — CaskByCask', description: '위스키·와인·꼬냑을 나만의 기준으로 분류한 공개 티어리스트를 확인하세요.' },
    en: { title: 'Spirits Tier Lists — CaskByCask', description: 'Explore community tier lists for whisky, wine, cognac, and other spirits.' },
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
    ko: { title: '주류 가격 정보 — CaskByCask', description: '사용자가 확인한 과거 구매 가격과 승인된 핫딜 정보를 살펴보세요.' },
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
 * 주류 목록 페이지 메타데이터를 반환합니다.
 */
interface SpiritsListSeoState {
  lang: 'ko' | 'en'
  category: SpiritSeoCategory | null
  canonical: string
  canonicalKo: string
  canonicalEn: string
  indexable: boolean
  meta: typeof SPIRIT_CATEGORY_META[SpiritSeoCategory | '']
  page: PageResponse<SpiritListSeoItemResponse> | null
}

function singleSearchParam(value: string | string[] | undefined): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
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
  const hasUnsupportedQuery = suppliedKeys.some((key) => key !== 'category')
    || (suppliedCategory !== undefined && (
      Array.isArray(suppliedCategory)
      || singleCategory === null
      || category === null
      || singleCategory !== category
    ))
  const suffix = category ? `?category=${category}` : ''
  const canonicalKo = `${SITE_URL}/ko/spirits${suffix}`
  const canonicalEn = `${SITE_URL}/en/spirits${suffix}`

  let page: PageResponse<SpiritListSeoItemResponse> | null = null
  if (category || includeItems) {
    const query = new URLSearchParams({ page: '0', size: includeItems ? '20' : '1' })
    if (category) query.set('category', category)
    page = await fetchApiData<PageResponse<SpiritListSeoItemResponse>>(`/api/spirits?${query.toString()}`, 300)
  }

  // API 일시 장애 시 기존 index 상태를 보존하고, 실제 0건이 확인된 카테고리만 noindex 한다.
  const categoryHasContent = !category || page == null || (page.totalElements ?? page.content.length) > 0
  return {
    lang: resolvedLang,
    category,
    canonical: resolvedLang === 'en' ? canonicalEn : canonicalKo,
    canonicalKo,
    canonicalEn,
    indexable: !hasUnsupportedQuery && categoryHasContent,
    meta: SPIRIT_CATEGORY_META[category ?? ''],
    page,
  }
}

export async function getSpiritsListMetadata(
  lang: 'ko' | 'en' | null,
  searchParams: MetadataSearchParams = {},
): Promise<Metadata> {
  const state = await resolveSpiritsListSeoState(lang, searchParams)
  const isEn = state.lang === 'en'
  const title = `${isEn ? state.meta.titleEn : state.meta.titleKo} — CaskByCask`
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
  const items = (state.page?.content ?? []).map((spirit) => ({
    title: isEn ? (spirit.nameEn || spirit.nameKo) : spirit.nameKo,
    href: isEn
      ? (spirit.canonicalPathEn || `/en/spirits/${spirit.id}`)
      : (spirit.canonicalPathKo || `/ko/spirits/${spirit.id}`),
    meta: isEn
      ? (spirit.producerNameEn || spirit.producerNameKo)
      : spirit.producerNameKo,
  }))
  const count = state.page?.totalElements

  return {
    kind: 'spirits-list',
    lang: state.lang,
    eyebrow: isEn ? 'CaskByCask catalog' : 'CaskByCask 주류 정보',
    title: isEn ? state.meta.titleEn : state.meta.titleKo,
    description: isEn ? state.meta.descEn : state.meta.descKo,
    metrics: count == null ? [] : [{
      label: isEn ? 'Spirits' : '등록 주류',
      value: count.toLocaleString(isEn ? 'en-US' : 'ko-KR'),
    }],
    details: [],
    items,
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
  const items = (state.page?.content ?? []).map((spirit, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: isEn ? (spirit.nameEn || spirit.nameKo) : spirit.nameKo,
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
        name: isEn ? state.meta.titleEn : state.meta.titleKo,
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
      }
    }
    
    const responseData = await res.json()
    const spirit = responseData.data
    
    if (!spirit) {
      return {
        title: '존재하지 않는 주류 — CaskByCask',
      }
    }

    const hasEdition = spirit.variantType && spirit.variantType !== 'NONE'
    let nameKo = spirit.nameKo
    let nameEn = spirit.nameEn
    if (hasEdition) {
      nameKo = formatEditionDisplayName(
        spirit.nameKo,
        spirit.seriesIdentifier,
        spirit.variantValue,
      )
      nameEn = formatEditionDisplayName(
        spirit.nameEn || spirit.nameKo,
        spirit.seriesIdentifierEn || spirit.seriesIdentifier,
        spirit.variantValueEn || spirit.variantValue,
      )
    }

    const title = nameEn 
      ? `${nameKo} (${nameEn}) 주류 정보 & 리뷰 (Specs & Reviews) — CaskByCask` 
      : `${nameKo} 주류 정보 & 리뷰 (Specs & Reviews) — CaskByCask`
      
    const abv = spirit.abv ? `도수 ${spirit.abv}%` : ''
    const abvEn = spirit.abv ? `ABV ${spirit.abv}%` : ''
    const age = spirit.commonDetail?.ageStatement ? `${spirit.commonDetail.ageStatement}년 숙성` : ''
    const ageEn = spirit.commonDetail?.ageStatement ? `${spirit.commonDetail.ageStatement}yo` : ''
    const description = `${nameKo}의 원산지, ${abv}, ${age} 캐스크 정보 등 상세한 주류 정보와 함께 테이스팅 노트 및 평점(${spirit.avgScore ?? spirit.scoreAvg ?? 0}점) 리뷰를 만나보세요. Discover detailed specs (${abvEn}, ${ageEn}), tasting notes, and ratings for ${nameEn || nameKo} on CaskByCask.`
    
    const canonical = `https://www.caskbycask.net${prefix}/spirits/${id}`
    const ogImage = spirit.imageUrl || 'https://www.caskbycask.net/og-image.png'

    return {
      title,
      description,
      alternates: {
        canonical,
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
  } catch (error) {
    return {
      title: '주류 상세 정보 및 리뷰 (Specs & Reviews) — CaskByCask',
      description: 'CaskByCask에서 각 주류의 상세 정보와 평점 리뷰를 확인해 보세요. Explore detailed specifications and ratings for various spirits.',
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
  const hasEdition = spirit.variantType && spirit.variantType !== 'NONE'
  const nameKo = hasEdition
    ? formatEditionDisplayName(spirit.nameKo, spirit.seriesIdentifier, spirit.variantValue)
    : spirit.nameKo
  const nameEn = hasEdition
    ? formatEditionDisplayName(
        spirit.nameEn || spirit.nameKo,
        spirit.seriesIdentifierEn || spirit.seriesIdentifier,
        spirit.variantValueEn || spirit.variantValue,
      )
    : (spirit.nameEn || spirit.nameKo)
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
  const labels = localLabels(isEn ? 'en' : 'ko')
  const additionalProperties = compactDetails([
    { label: labels.abv, value: formatAbvValue(spirit.abv, spirit.abvMin, spirit.abvMax) },
    { label: labels.volume, value: formatVolumeValue(spirit.volumeMl, spirit.volumeMlMin, spirit.volumeMlMax) },
    { label: labels.age, value: formatAgeStatement(spirit.commonDetail, isEn ? 'en' : 'ko') },
    { label: labels.bottler, value: spirit.bottler },
    { label: labels.vintage, value: spirit.vintageYear },
    { label: labels.bottledYear, value: spirit.bottledYear },
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
  const hasProductSnippetData = (avgScore != null && reviewCount > 0) || reviews.length > 0

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
    aggregateRating: avgScore != null && reviewCount > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: avgScore,
      ratingCount: reviewCount,
      reviewCount,
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

export async function getSpiritSeoSnapshot(id: string, lang: 'ko' | 'en' | null): Promise<SeoSnapshotData | null> {
  const numericId = extractLeadingId(id)
  if (!numericId) return null

  const resolvedLang = normalizeLang(lang)
  const isEn = resolvedLang === 'en'
  const labels = localLabels(resolvedLang)
  const [seo, spirit] = await Promise.all([
    getSpiritSeo(numericId),
    fetchApiData<SpiritDetailResponse>(`/api/spirits/${numericId}`),
  ])
  if (!spirit) return null

  const hasEdition = spirit.variantType && spirit.variantType !== 'NONE'
  const nameKo = hasEdition
    ? formatEditionDisplayName(spirit.nameKo, spirit.seriesIdentifier, spirit.variantValue)
    : spirit.nameKo
  const nameEn = hasEdition
    ? formatEditionDisplayName(
        spirit.nameEn || spirit.nameKo,
        spirit.seriesIdentifierEn || spirit.seriesIdentifier,
        spirit.variantValueEn || spirit.variantValue,
      )
    : (spirit.nameEn || spirit.nameKo)
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
      { label: labels.bottler, value: spirit.bottler },
      { label: labels.vintage, value: spirit.vintageYear },
      { label: labels.bottledYear, value: spirit.bottledYear },
      { label: labels.releaseDate, value: formatDateOnly(spirit.commonDetail?.releaseDate) },
      { label: labels.batchNo, value: spirit.commonDetail?.batchNo },
      { label: labels.bottleNo, value: spirit.commonDetail?.bottleNo },
      { label: labels.whiskyStyle, value: spirit.whiskyDetail?.style },
      { label: labels.cask, value: caskFinishes ? `${caskTypes || ''} / Finish: ${caskFinishes}` : caskTypes },
      { label: labels.wineType, value: spirit.wineDetail?.wineType },
      { label: labels.wineType, value: grapes },
      { label: labels.cognacGrade, value: spirit.cognacDetail?.grade },
      { label: isEn ? 'Recently confirmed purchase price' : '최근 확인 가격', value: recentPrice },
      { label: isEn ? 'Recently approved hot deal' : '최근 승인 핫딜', value: recentHotDeal },
    ]),
    sourceUrls: hotDealSource ? [hotDealSource] : [],
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
  if (!post || post.adultOnly || post.isLocked || post.isHidden) return null

  const bodyHtml = getPostContentHtml(post)
  const boardName = boardLabel(post.boardType || boardType, resolvedLang)
  const canonicalBoard = post.boardType?.toUpperCase() === 'NOTICE' ? 'notice' : 'free'
  const description = stripHtmlAndSummarize(bodyHtml, 220)
  const image = toAbsoluteImageUrl(post.imageUrl || post.images?.[0]?.imageUrl)

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
    bodyHtml: bodyHtml || null,
    sourceUrls: post.sourceUrls || [],
    hashtags: post.hashtags || [],
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
  const normalizedBoard = boardType === 'notice' || boardType === 'free' ? boardType : null
  if (!numericId || !normalizedBoard) return getNoindexMetadata(lang, '커뮤니티 게시글 — CaskByCask')

  const post = await fetchApiData<CommunityPostResponse>(`/api/posts/${numericId}`, 60)
  if (!post) return getNoindexMetadata(lang, '존재하지 않는 게시글 — CaskByCask')

  const canonicalBoard = post.boardType?.toUpperCase() === 'NOTICE' ? 'notice' : 'free'
  const title = `${post.title} — CaskByCask`
  const description = stripHtmlAndSummarize(getPostContentHtml(post))
    || 'CaskByCask 커뮤니티 게시글 상세 페이지입니다.'
  const canonical = `${SITE_URL}/ko/community/${canonicalBoard}/${numericId}`
  const ogImage = toAbsoluteImageUrl(post.imageUrl || post.images?.[0]?.imageUrl) || DEFAULT_OG_IMAGE
  const restricted = Boolean(post.adultOnly || post.isLocked || post.isHidden)

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
  if (!numericId || (boardType !== 'notice' && boardType !== 'free')) return null

  const post = await fetchApiData<CommunityPostResponse>(`/api/posts/${numericId}`, 60)
  if (!post || post.adultOnly || post.isLocked || post.isHidden) return null

  const body = getPostContentHtml(post)
  const text = stripHtmlToText(body)
  const image = toAbsoluteImageUrl(post.imageUrl || post.images?.[0]?.imageUrl)
  if (!text && !image) return null
  const canonicalBoard = post.boardType?.toUpperCase() === 'NOTICE' ? 'notice' : 'free'
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

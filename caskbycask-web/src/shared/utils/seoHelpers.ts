import { Metadata } from 'next'

const API_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

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
  adultOnly?: boolean | null
  createdAt?: string | null
  updatedAt?: string | null
  imageUrl?: string | null
  images?: Array<{ imageUrl?: string | null }> | null
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

export interface SeoSnapshotData {
  kind: 'spirit' | 'community' | 'byob'
  lang: 'ko' | 'en'
  eyebrow: string
  title: string
  subtitle?: string | null
  description?: string | null
  image?: string | null
  metrics: Array<{ label: string; value: string }>
  details: Array<{ label: string; value: string }>
  bodyHtml?: string | null
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

// HTML 태그 제거 및 텍스트 요약 유틸리티
export function stripHtmlAndSummarize(htmlStr: string, maxLength = 150): string {
  if (!htmlStr) return ''
  const cleanText = htmlStr
    .replace(/<[^>]*>/g, ' ') // HTML 태그 제거
    .replace(/\s+/g, ' ') // 공백 단일화
    .trim()
  if (cleanText.length <= maxLength) return cleanText
  return cleanText.substring(0, maxLength) + '...'
}

function normalizeLang(lang: 'ko' | 'en' | null): 'ko' | 'en' {
  return lang === 'en' ? 'en' : 'ko'
}

function getPostContentHtml(post: Pick<CommunityPostResponse, 'content' | 'contentSanitized'>): string {
  return post.contentSanitized || post.content || ''
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
  return url.startsWith('http') ? url : `https://caskbycask.net${url}`
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

interface ParsedPath {
  type: 'home' | 'spirits-list' | 'spirit-detail' | 'community-detail' | 'byob-detail' | 'default'
  lang: 'ko' | 'en' | null
  spiritId?: string
  boardType?: string
  postId?: string
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

  // 1) /spirits
  if (remaining[0] === 'spirits') {
    if (remaining.length === 1) {
      return { type: 'spirits-list', lang }
    }
    if (remaining.length >= 2) {
      return { type: 'spirit-detail', lang, spiritId: remaining[1] }
    }
  }

  // 2) /community
  if (remaining[0] === 'community') {
    if (remaining.length >= 2) {
      if (remaining[1] === 'byob') {
        if (remaining.length >= 3) {
          return { type: 'byob-detail', lang, postId: remaining[2] }
        }
      } else {
        if (remaining.length >= 3) {
          return { type: 'community-detail', lang, boardType: remaining[1], postId: remaining[2] }
        }
      }
    }
  }

  return { type: 'default', lang }
}

/**
 * 기본/홈페이지 메타데이터를 반환합니다.
 */
export function getDefaultMetadata(lang: 'ko' | 'en' | null): Metadata {
  const prefix = lang ? `/${lang}` : ''
  const canonical = `https://caskbycask.net${prefix}`
  return {
    title: 'CaskByCask(캐바캐) — 주류 정보, 리뷰, 커뮤니티',
    description: '위스키, 와인, 꼬냑 등 주류 정보와 평점 리뷰 전문 플랫폼, CaskByCask(캐바캐)입니다.',
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical,
    },
    openGraph: {
      title: 'CaskByCask(캐바캐) — 주류 정보, 리뷰, 커뮤니티',
      description: '위스키, 와인, 꼬냑 등 주류 정보와 평점 리뷰 전문 플랫폼, CaskByCask(캐바캐)입니다.',
      url: canonical,
      type: 'website',
      siteName: 'CaskByCask',
      images: [
        {
          url: 'https://caskbycask.net/og-image.png',
          alt: 'CaskByCask 주류 정보 탐색 (Specs & Reviews)',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'CaskByCask(캐바캐) — 주류 정보, 리뷰, 커뮤니티',
      description: '위스키, 와인, 꼬냑 등 주류 정보와 평점 리뷰 전문 플랫폼, CaskByCask(캐바캐)입니다.',
      images: ['https://caskbycask.net/og-image.png'],
    },
  }
}

/**
 * 주류 목록 페이지 메타데이터를 반환합니다.
 */
export function getSpiritsListMetadata(lang: 'ko' | 'en' | null): Metadata {
  const prefix = lang ? `/${lang}` : ''
  const canonical = `https://caskbycask.net${prefix}/spirits`
  
  return {
    title: '주류 정보 탐색 및 상세 검색 (Search Liquor Specs & Reviews) — CaskByCask',
    description: '위스키, 와인, 꼬냑 등 전 세계 모든 주류의 상세 정보와 평점 리뷰를 탐색해 보세요. Explore detailed specifications, user ratings, and reviews of global spirits.',
    alternates: {
      canonical,
    },
    openGraph: {
      title: '주류 정보 탐색 및 상세 검색 (Search Liquor Specs & Reviews) — CaskByCask',
      description: '위스키, 와인, 꼬냑 등 전 세계의 다양한 주류 상세 정보와 테이스팅 노트 및 평점 리뷰를 간편하게 검색하세요. Search detailed specifications, tasting notes, and ratings of various spirits.',
      url: canonical,
      type: 'website',
      images: [
        {
          url: 'https://caskbycask.net/og-image.png',
          alt: 'CaskByCask 주류 정보 탐색 (Specs & Reviews)',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: '주류 정보 탐색 및 상세 검색 (Search Liquor Specs & Reviews) — CaskByCask',
      description: '전 세계의 다양한 주류 상세 정보와 리뷰 평점을 쉽고 빠르게 탐색해 보세요. Easily discover detailed specifications, tasting notes and ratings of global spirits.',
      images: ['https://caskbycask.net/og-image.png'],
    },
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
    const ogImage = seo.primaryImageUrl || 'https://caskbycask.net/og-image.png'

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
    
    const canonical = `https://caskbycask.net${prefix}/spirits/${id}`
    const ogImage = spirit.imageUrl || 'https://caskbycask.net/og-image.png'

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
    : `https://caskbycask.net${lang ? `/${lang}` : ''}/spirits/${numericId}`
  const primaryImage = spirit.images?.find((image) => image.isPrimary)?.imageUrl
    || spirit.images?.find((image) => image.imageUrl)?.imageUrl
  const image = seo?.primaryImageUrl
    || (primaryImage
      ? (primaryImage.startsWith('http') ? primaryImage : `https://caskbycask.net${primaryImage}`)
      : 'https://caskbycask.net/og-image.png')
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

  return {
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
    || 'https://caskbycask.net/og-image.png'
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
    ]),
    links: [
      { label: labels.home, href: `/${resolvedLang}/` },
      { label: labels.spirits, href: `/${resolvedLang}/spirits` },
      { label: categoryLabel(spirit.category, resolvedLang), href: `/${resolvedLang}/spirits?category=${spirit.category || ''}` },
      { label: title, href: canonicalPath },
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
  const post = await fetchApiData<CommunityPostResponse>(`/api/posts/${id}`, 60)
  if (!post) return null

  const bodyHtml = getPostContentHtml(post)
  const boardName = boardLabel(post.boardType || boardType, resolvedLang)
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
    links: [
      { label: labels.home, href: `/${resolvedLang}/` },
      { label: labels.community, href: `/${resolvedLang}/community/all` },
      { label: boardName, href: `/${resolvedLang}/community/${boardType}` },
      { label: post.title, href: `/${resolvedLang}/community/${boardType}/${id}` },
    ],
  }
}

export async function getByobPostSeoSnapshot(id: string, lang: 'ko' | 'en' | null): Promise<SeoSnapshotData | null> {
  const resolvedLang = normalizeLang(lang)
  const labels = localLabels(resolvedLang)
  const byob = await fetchApiData<ByobDetailResponse>(`/api/byob/${id}`, 60)
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
    image: 'https://caskbycask.net/og-image.png',
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
      { label: labels.home, href: `/${resolvedLang}/` },
      { label: labels.community, href: `/${resolvedLang}/community/all` },
      { label: labels.byob, href: `/${resolvedLang}/community/byob` },
      { label: byob.title, href: `/${resolvedLang}/community/byob/${id}` },
    ],
  }
}

/**
 * 커뮤니티 게시글 상세 페이지 메타데이터를 반환합니다.
 */
export async function getCommunityPostMetadata(boardType: string, id: string, lang: 'ko' | 'en' | null): Promise<Metadata> {
  const prefix = lang ? `/${lang}` : ''
  try {
    const res = await fetch(`${API_URL}/api/posts/${id}`, {
      next: { revalidate: 60 }, // 커뮤니티 글은 60초 캐싱 (실시간성 반영)
    })
    
    if (!res.ok) {
      return {
        title: '커뮤니티 게시글 — CaskByCask',
        description: 'CaskByCask 커뮤니티에서 유익한 주류 이야기를 만나보세요.',
      }
    }
    
    const responseData = await res.json()
    const post = responseData.data as CommunityPostResponse | null
    
    if (!post) {
      return {
        title: '존재하지 않는 게시글 — CaskByCask',
      }
    }

    const title = `${post.title} — CaskByCask`
    const description = stripHtmlAndSummarize(getPostContentHtml(post)) || 'CaskByCask 커뮤니티 게시글 상세 페이지입니다.'
    const canonical = `https://caskbycask.net${prefix}/community/${boardType}/${id}`
    const ogImage = toAbsoluteImageUrl(post.imageUrl || post.images?.[0]?.imageUrl) || 'https://caskbycask.net/og-image.png'

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
        type: 'article',
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
      title: '커뮤니티 게시글 — CaskByCask',
      description: 'CaskByCask 커뮤니티에서 다양한 정보를 확인해 보세요.',
    }
  }
}

/**
 * 커뮤니티 게시글 JSON-LD 스키마 데이터를 생성해 반환합니다.
 */
export async function getCommunityPostJsonLd(boardType: string, id: string, lang: 'ko' | 'en' | null): Promise<object | null> {
  const prefix = lang ? `/${lang}` : ''
  try {
    const res = await fetch(`${API_URL}/api/posts/${id}`, {
      next: { revalidate: 60 },
    })
    if (res.ok) {
      const responseData = await res.json()
      const post = responseData.data as CommunityPostResponse | null
      if (post) {
        const body = getPostContentHtml(post)
        const image = toAbsoluteImageUrl(post.imageUrl || post.images?.[0]?.imageUrl)
        return {
          '@context': 'https://schema.org',
          '@type': 'DiscussionForumPosting',
          'headline': post.title,
          'articleBody': stripHtmlAndSummarize(body, 500),
          'url': `https://caskbycask.net${prefix}/community/${boardType}/${id}`,
          'datePublished': post.createdAt,
          'dateModified': post.updatedAt || post.createdAt,
          'articleSection': boardLabel(post.boardType || boardType, normalizeLang(lang)),
          'isAccessibleForFree': !post.adultOnly,
          'image': image || undefined,
          'publisher': {
            '@type': 'Organization',
            'name': 'CaskByCask',
            'url': 'https://caskbycask.net',
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
      }
    }
  } catch (e) {
    // Graceful error
  }
  return null
}

/**
 * BYOB 모임 상세 페이지 메타데이터를 반환합니다.
 */
export async function getByobPostMetadata(id: string, lang: 'ko' | 'en' | null): Promise<Metadata> {
  const prefix = lang ? `/${lang}` : ''
  try {
    const res = await fetch(`${API_URL}/api/byob/${id}`, {
      next: { revalidate: 60 },
    })
    
    if (!res.ok) {
      return {
        title: 'BYOB 모임 상세 — CaskByCask',
        description: 'CaskByCask BYOB(Bring Your Own Bottle) 모임에서 함께 주류를 나누어 즐겨 보세요.',
      }
    }
    
    const responseData = await res.json()
    const byob = responseData.data as ByobDetailResponse | null
    
    if (!byob) {
      return {
        title: '존재하지 않는 BYOB 모임 — CaskByCask',
      }
    }

    const title = `${byob.title} (BYOB 모임) — CaskByCask`
    const description = stripHtmlAndSummarize(byob.content || '') || 'CaskByCask BYOB 주류 공유 모임 모집글 상세 페이지입니다.'
    const canonical = `https://caskbycask.net${prefix}/community/byob/${id}`
    const ogImage = 'https://caskbycask.net/og-image.png'

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
      title: 'BYOB 모임 상세 — CaskByCask',
      description: 'CaskByCask BYOB 주류 공유 모임 정보를 확인해 보세요.',
    }
  }
}

/**
 * BYOB 모임 JSON-LD 스키마 데이터를 생성해 반환합니다.
 */
export async function getByobPostJsonLd(id: string, lang: 'ko' | 'en' | null): Promise<object | null> {
  const prefix = lang ? `/${lang}` : ''
  try {
    const res = await fetch(`${API_URL}/api/byob/${id}`, {
      next: { revalidate: 60 },
    })
    if (res.ok) {
      const responseData = await res.json()
      const byob = responseData.data as ByobDetailResponse | null
      if (byob) {
        const eventStatus = byob.status === 'CANCELLED'
          ? 'https://schema.org/EventCancelled'
          : 'https://schema.org/EventScheduled'
        return {
          '@context': 'https://schema.org',
          '@type': 'Event',
          'name': byob.title,
          'url': `https://caskbycask.net${prefix}/community/byob/${id}`,
          'description': stripHtmlAndSummarize(byob.content || '', 300),
          'startDate': byob.eventAt || byob.createdAt,
          'eventStatus': eventStatus,
          'eventAttendanceMode': 'https://schema.org/OfflineEventAttendanceMode',
          'maximumAttendeeCapacity': byob.maxParticipants || undefined,
          'remainingAttendeeCapacity': byob.maxParticipants != null && byob.approvedCount != null
            ? Math.max(byob.maxParticipants - byob.approvedCount, 0)
            : undefined,
          'location': {
            '@type': 'Place',
            'name': byob.location || '상세 주소는 본문 참조',
            'address': {
              '@type': 'PostalAddress',
              'streetAddress': byob.address || '상세 장소',
              'addressLocality': byob.location || '지역',
              'addressCountry': 'KR',
            },
          },
          'organizer': {
            '@type': 'Person',
            'name': byob.hostNickname || 'Host',
          },
        }
      }
    }
  } catch (e) {
    // Graceful error
  }
  return null
}

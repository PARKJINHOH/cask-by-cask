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
  producerNameKo: string | null
  producerNameEn: string | null
  country: string | null
  avgScore: number | string | null
  reviewCount: number | null
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
    title: 'CaskByCask — 주류 정보, 리뷰, 커뮤니티',
    description: '위스키, 와인, 꼬냑 등 주류 정보와 평점 리뷰 전문 플랫폼, CaskByCask(캐스크바이캐스크)입니다.',
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical,
    },
    openGraph: {
      title: 'CaskByCask — 주류 정보, 리뷰, 커뮤니티',
      description: '위스키, 와인, 꼬냑 등 주류 정보와 평점 리뷰 전문 플랫폼, CaskByCask(캐스크바이캐스크)입니다.',
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
      title: 'CaskByCask — 주류 정보, 리뷰, 커뮤니티',
      description: '위스키, 와인, 꼬냑 등 주류 정보와 평점 리뷰 전문 플랫폼, CaskByCask(캐스크바이캐스크)입니다.',
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

    const hasEdition = spirit.variantType && spirit.variantType !== 'NONE' && spirit.variantValue
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
    const description = `${nameKo}의 원산지, ${abv}, ${age} 캐스크 정보 등 상세한 주류 정보와 함께 테이스팅 노트 및 평점(${spirit.scoreAvg ?? 0}점) 리뷰를 만나보세요. Discover detailed specs (${abvEn}, ${ageEn}), tasting notes, and ratings for ${nameEn || nameKo} on CaskByCask.`
    
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
  const hasEdition = spirit.variantType && spirit.variantType !== 'NONE' && spirit.variantValue
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
    const post = responseData.data
    
    if (!post) {
      return {
        title: '존재하지 않는 게시글 — CaskByCask',
      }
    }

    const title = `${post.title} — CaskByCask`
    const description = stripHtmlAndSummarize(post.content) || 'CaskByCask 커뮤니티 게시글 상세 페이지입니다.'
    const canonical = `https://caskbycask.net${prefix}/community/${boardType}/${id}`
    const ogImage = post.imageUrl || 'https://caskbycask.net/og-image.png'

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
      const post = responseData.data
      if (post) {
        return {
          '@context': 'https://schema.org',
          '@type': 'DiscussionForumPosting',
          'headline': post.title,
          'articleBody': stripHtmlAndSummarize(post.content, 500),
          'url': `https://caskbycask.net${prefix}/community/${boardType}/${id}`,
          'datePublished': post.createdAt,
          'dateModified': post.updatedAt || post.createdAt,
          'author': {
            '@type': 'Person',
            'name': post.authorNickname || post.authorName || 'User',
          },
          'interactionStatistic': {
            '@type': 'InteractionCounter',
            'interactionType': 'https://schema.org/LikeAction',
            'userInteractionCount': post.likeCount || 0,
          },
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
    const byob = responseData.data
    
    if (!byob) {
      return {
        title: '존재하지 않는 BYOB 모임 — CaskByCask',
      }
    }

    const title = `${byob.title} (BYOB 모임) — CaskByCask`
    const description = stripHtmlAndSummarize(byob.content) || 'CaskByCask BYOB 주류 공유 모임 모집글 상세 페이지입니다.'
    const canonical = `https://caskbycask.net${prefix}/community/byob/${id}`
    const ogImage = byob.imageUrl || 'https://caskbycask.net/og-image.png'

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
      const byob = responseData.data
      if (byob) {
        return {
          '@context': 'https://schema.org',
          '@type': 'Event',
          'name': byob.title,
          'url': `https://caskbycask.net${prefix}/community/byob/${id}`,
          'description': stripHtmlAndSummarize(byob.content, 300),
          'startDate': byob.meetingDate || byob.createdAt,
          'eventStatus': 'https://schema.org/EventScheduled',
          'eventAttendanceMode': 'https://schema.org/OfflineEventAttendanceMode',
          'location': {
            '@type': 'Place',
            'name': byob.locationName || '상세 주소는 본문 참조',
            'address': {
              '@type': 'PostalAddress',
              'streetAddress': byob.address || '상세 장소',
              'addressLocality': byob.region || '지역',
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

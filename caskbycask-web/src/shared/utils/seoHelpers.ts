import { Metadata } from 'next'

const API_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

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
    title: 'CaskByCask — 주류 정보, 리뷰, 커뮤니티 (Whisky & Wine Specs, Reviews)',
    description: '전 세계 위스키, 와인, 꼬냑 등의 상세한 주류 정보와 평점 리뷰를 제공하는 전문 플랫폼입니다. Explore detailed specifications, tasting notes, and ratings for whisky, wine, cognac, rum, and tequila.',
    alternates: {
      canonical,
    },
    openGraph: {
      title: 'CaskByCask — 주류 정보, 리뷰, 커뮤니티 (Whisky & Wine Specs, Reviews)',
      description: '전 세계 위스키, 와인, 꼬냑 등의 상세한 주류 정보와 평점 리뷰를 제공하는 전문 플랫폼입니다. Explore detailed specifications, tasting notes, and ratings for whisky, wine, cognac, rum, and tequila.',
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
      title: 'CaskByCask — 주류 정보, 리뷰, 커뮤니티 (Whisky & Wine Specs, Reviews)',
      description: '전 세계 위스키, 와인, 꼬냑 등의 상세한 주류 정보와 평점 리뷰를 제공하는 전문 플랫폼입니다. Explore detailed specifications, tasting notes, and ratings for whisky, wine, cognac, rum, and tequila.',
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

    const title = spirit.nameEn 
      ? `${spirit.nameKo} (${spirit.nameEn}) 주류 정보 & 리뷰 (Specs & Reviews) — CaskByCask` 
      : `${spirit.nameKo} 주류 정보 & 리뷰 (Specs & Reviews) — CaskByCask`
      
    const abv = spirit.abv ? `도수 ${spirit.abv}%` : ''
    const abvEn = spirit.abv ? `ABV ${spirit.abv}%` : ''
    const age = spirit.commonDetail?.ageStatement ? `${spirit.commonDetail.ageStatement}년 숙성` : ''
    const ageEn = spirit.commonDetail?.ageStatement ? `${spirit.commonDetail.ageStatement}yo` : ''
    const description = `${spirit.nameKo}의 원산지, ${abv}, ${age} 캐스크 정보 등 상세한 주류 정보와 함께 테이스팅 노트 및 평점(${spirit.scoreAvg ?? 0}점) 리뷰를 만나보세요. Discover detailed specs (${abvEn}, ${ageEn}), tasting notes, and ratings for ${spirit.nameEn || spirit.nameKo} on CaskByCask.`
    
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

import {
  buildCanonical,
  DEFAULT_OG_IMAGE,
  SITE_ALTERNATE_NAMES,
  SITE_LOGO,
  SITE_LOGO_SIZE,
  SITE_NAME,
  SITE_SEARCH_PARAM,
  SITE_SOCIAL_PROFILES,
  SITE_URL,
} from '@/shared/config/site'

/**
 * Schema.org JSON-LD 빌더 헬퍼 모음.
 *
 * SeoMeta 의 `jsonLd` prop 에 그대로 전달 가능한 객체를 반환.
 * @context 는 SeoMeta 내부에서 자동 주입되므로 여기서는 @type 부터 시작.
 */

export interface BreadcrumbItem {
  /** 사용자에게 보이는 라벨 */
  name: string
  /** 사이트 내부 경로 ('/spirits/123') — 절대 URL 로 자동 변환 */
  path: string
}

/**
 * BreadcrumbList 스키마 생성.
 *
 * 사용 예:
 *   buildBreadcrumbSchema([
 *     { name: '홈', path: '/' },
 *     { name: '주류 카탈로그', path: '/spirits' },
 *     { name: '라프로익 10년', path: `/spirits/${id}` },
 *   ])
 */
export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: buildCanonical(item.path),
    })),
  }
}

/**
 * Review 스키마 (Product 안에 nested 되거나 단독으로 사용).
 *
 * Google rich result 가이드: reviewRating 필수, author 권장.
 * 본문(reviewBody) 은 200자 정도로 자르는 게 일반적.
 */
export interface ReviewSchemaInput {
  authorName: string
  ratingValue: number
  bestRating?: number
  worstRating?: number
  datePublished: string
  reviewBody?: string | null
}

export function buildReviewSchema(r: ReviewSchemaInput) {
  return {
    '@type': 'Review',
    author: { '@type': 'Person', name: r.authorName },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: r.ratingValue,
      bestRating: r.bestRating ?? 100,
      worstRating: r.worstRating ?? 0,
    },
    datePublished: r.datePublished,
    ...(r.reviewBody ? { reviewBody: r.reviewBody.slice(0, 280) } : {}),
  }
}

/**
 * ItemList 스키마 — 컬렉션/리스트 페이지에서 노출.
 *
 * 카탈로그 페이지에서 사용. URL 만 갖는 단순한 ListItem 배열.
 */
export interface ItemListInput {
  name: string
  path: string
}

export function buildItemListSchema(items: ItemListInput[]) {
  return {
    '@type': 'ItemList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      url: buildCanonical(item.path),
    })),
  }
}

// ── 사이트 엔티티 (Organization / WebSite) ─────────────────────────
//
// 'caskbycask' 는 동일 업종의 다른 도메인이 먼저 쓰고 있는 이름이라, 검색엔진이 브랜드
// 질의를 이 도메인이 아니라 인스타그램·스레드 계정으로 해석하고 있었다. Organization 을
// 홈에 심고 sameAs 로 그 계정들을 되묶어, 브랜드 엔티티의 중심을 도메인으로 옮긴다.
//
// Google 가이드상 Organization 은 사이트에서 한 페이지(홈)에만 넣는다. 여러 페이지에
// 흩어 놓으면 어느 쪽이 대표인지 모호해진다.

/** 그래프 노드 상호 참조용 고정 @id. 페이지 URL 과 겹치지 않도록 프래그먼트를 쓴다. */
export const ORGANIZATION_ID = `${SITE_URL}/#organization`
export const WEBSITE_ID = `${SITE_URL}/#website`

/**
 * 홈(및 개별 메타가 없는 경로)의 기본 title/description.
 *
 * SSR 메타태그, 하이드레이션 뒤 SeoMeta 가 다시 쓰는 값, JSON-LD 의 WebPage 노드가
 * 모두 이걸 쓴다. 예전에는 세 자리가 제각각이라 크롤러가 최종적으로 보는 DOM 과
 * 서버 HTML 의 제목·설명이 서로 달랐다.
 */
export const DEFAULT_SEO_TEXT = {
  ko: {
    title: 'CaskByCask(캐바캐) — 주류 정보, 리뷰, 커뮤니티',
    description: '전 세계 위스키, 와인, 꼬냑 등의 상세한 주류 정보와 평점 리뷰를 제공하고 소통하는 주류 전문 정보 커뮤니티 플랫폼입니다.',
  },
  en: {
    title: 'CaskByCask — Detailed Liquor Info, Reviews & Community',
    description: 'Explore detailed specifications, user ratings, and reviews of global spirits (whisky, wine, cognac, rum, tequila) and join our community.',
  },
} as const

const ORGANIZATION_DESCRIPTION = {
  ko: '위스키·와인·꼬냑을 비롯한 주류의 상세 정보와 시음 노트, 사용자 평점 리뷰를 모으는 한국의 주류 정보 커뮤니티입니다.',
  en: 'A Korean spirits information community collecting detailed specs, tasting notes, and user ratings for whisky, wine, cognac, and other spirits.',
} as const

/**
 * Organization 스키마 — 브랜드 엔티티 그 자체.
 *
 * sameAs 에는 이 사이트가 소유한 계정만 넣는다(`SITE_SOCIAL_PROFILES` 주석 참고).
 */
export function buildOrganizationSchema(lang: 'ko' | 'en' = 'ko') {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    alternateName: [...SITE_ALTERNATE_NAMES],
    url: `${SITE_URL}/`,
    logo: {
      '@type': 'ImageObject',
      url: SITE_LOGO,
      width: SITE_LOGO_SIZE,
      height: SITE_LOGO_SIZE,
    },
    image: DEFAULT_OG_IMAGE,
    description: ORGANIZATION_DESCRIPTION[lang],
    sameAs: [...SITE_SOCIAL_PROFILES],
  }
}

/**
 * WebSite 스키마 — 도메인을 Organization 에 묶고 사이트 검색 진입점을 알린다.
 *
 * Google 은 sitelinks 검색창 리치 결과를 걷어냈지만 potentialAction 자체는 여전히
 * 유효한 마크업이고 다른 엔진이 쓴다. 타깃은 화면 검색과 같은 파라미터를 가리킨다.
 */
export function buildWebSiteSchema(lang: 'ko' | 'en' = 'ko') {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    alternateName: [...SITE_ALTERNATE_NAMES],
    url: `${SITE_URL}/${lang}`,
    inLanguage: lang === 'en' ? 'en' : 'ko',
    publisher: { '@id': ORGANIZATION_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/${lang}/spirits?${SITE_SEARCH_PARAM}={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/**
 * 홈의 JSON-LD 그래프.
 *
 * SSR(page.tsx)과 하이드레이션 뒤(SeoMeta)가 **같은 배열**을 쓴다. SeoMeta 는 자기가 받은
 * jsonLd 로 `data-cbc-route-jsonld` 스크립트를 덮어쓰므로, 클라이언트에 같은 값을 넘기지
 * 않으면 JS 를 실행하는 크롤러가 보는 최종 DOM 에서 이 그래프가 사라진다.
 */
export function buildHomeJsonLdGraph(lang: 'ko' | 'en' = 'ko') {
  const canonical = `${SITE_URL}/${lang}`
  const text = DEFAULT_SEO_TEXT[lang]

  return [
    buildOrganizationSchema(lang),
    buildWebSiteSchema(lang),
    {
      '@type': 'WebPage',
      '@id': canonical,
      url: canonical,
      name: text.title,
      description: text.description,
      inLanguage: lang === 'en' ? 'en' : 'ko',
      isPartOf: { '@id': WEBSITE_ID },
      about: { '@id': ORGANIZATION_ID },
      primaryImageOfPage: { '@type': 'ImageObject', url: DEFAULT_OG_IMAGE },
    },
  ]
}

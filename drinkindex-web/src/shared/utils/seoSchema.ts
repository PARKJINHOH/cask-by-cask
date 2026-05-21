import { buildCanonical } from '@/shared/config/site'

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

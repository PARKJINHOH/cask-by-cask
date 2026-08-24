/**
 * 사이트 전역 상수 — SEO/OG/canonical 생성 단일 출처.
 *
 * 운영 도메인이 바뀌거나 OG 이미지 경로가 바뀌면 여기만 수정.
 */

export const SITE_URL = 'https://www.caskbycask.net'
export const SITE_NAME = 'CaskByCask'
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`

/**
 * Organization 로고. schema.org 로고는 정사각형 112px 이상을 요구하므로
 * 100x100 인 `/logo.png` 대신 파비콘 세트의 512px 판을 쓴다.
 */
export const SITE_LOGO = `${SITE_URL}/android-chrome-512x512.png`
export const SITE_LOGO_SIZE = 512

/**
 * 브랜드 별칭. 'caskbycask' 는 동일 업종의 다른 도메인(caskbycask.com/.no)과 겹치므로,
 * 검색엔진이 이 사이트를 구분할 근거는 한국어 별칭 쪽에 있다.
 * 공백을 넣은 'Cask By Cask' 는 타사 브랜드 표기와 같아 의도적으로 넣지 않는다.
 */
export const SITE_ALTERNATE_NAMES = ['캐바캐', '캐스크바이캐스크'] as const

/**
 * 브랜드 공식 계정 — 푸터 링크와 Organization.sameAs 가 같은 목록을 쓴다.
 *
 * URL 은 각 플랫폼이 선언한 canonical 과 문자 단위로 같아야 한다(인스타그램은 끝 슬래시 포함).
 * 화면 링크와 sameAs 가 다른 형태면 검색엔진이 같은 계정으로 묶어 주리라는 보장이 없다.
 *
 * 여기 넣는 URL 은 반드시 이 사이트가 소유한 계정이어야 한다. 남의 계정을 넣으면
 * 엔티티가 엉뚱한 곳으로 연결되므로, 계정을 늘리거나 없앨 때 실제 소유 여부를 먼저 확인한다.
 * 각 계정 프로필에서 이 사이트로 돌아오는 링크도 함께 걸어야 상호 확인이 성립한다.
 */
export const SITE_SOCIAL_LINKS = [
  { name: 'Instagram', url: 'https://www.instagram.com/caskbycask/' },
  { name: 'Threads', url: 'https://www.threads.com/@caskbycask' },
] as const

/** `Organization.sameAs` 용 URL 목록. */
export const SITE_SOCIAL_PROFILES: readonly string[] = SITE_SOCIAL_LINKS.map((link) => link.url)

/** 주류 카탈로그 검색이 쓰는 쿼리 파라미터. SearchAction 타깃과 화면이 같은 값을 쓴다. */
export const SITE_SEARCH_PARAM = 'keyword'

/**
 * 절대 canonical URL 생성.
 *
 * @param path '/spirits/123' 같은 절대 경로 (앞에 / 있음)
 * @returns 'https://www.caskbycask.net/spirits/123'
 */
export function buildCanonical(path: string): string {
  if (!path) return SITE_URL + '/'
  if (path.startsWith('http')) return path
  const normalized = path.startsWith('/') ? path : '/' + path
  return SITE_URL + normalized
}

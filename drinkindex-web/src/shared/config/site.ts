/**
 * 사이트 전역 상수 — SEO/OG/canonical 생성 단일 출처.
 *
 * 운영 도메인이 바뀌거나 OG 이미지 경로가 바뀌면 여기만 수정.
 */

export const SITE_URL = 'https://drinkindex.pinner.dev'
export const SITE_NAME = 'DrinkIndex'
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`

/**
 * 절대 canonical URL 생성.
 *
 * @param path '/spirits/123' 같은 절대 경로 (앞에 / 있음)
 * @returns 'https://drinkindex.pinner.dev/spirits/123'
 */
export function buildCanonical(path: string): string {
  if (!path) return SITE_URL + '/'
  if (path.startsWith('http')) return path
  const normalized = path.startsWith('/') ? path : '/' + path
  return SITE_URL + normalized
}

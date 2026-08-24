import { buildCanonical } from '@/shared/config/site'

type SpiritCanonicalPathSource = {
  id: number
  canonicalPathKo?: string | null
  canonicalPathEn?: string | null
  spiritCanonicalPathKo?: string | null
  spiritCanonicalPathEn?: string | null
}

export function stripLocalePrefix(path: string): string {
  const stripped = path.replace(/^\/(ko|en)(?=\/|$)/, '')
  return stripped || '/'
}

export function getSpiritCanonicalPath(
  spirit: SpiritCanonicalPathSource,
  language: string,
  options: { includeLocale?: boolean } = {},
): string {
  const lang = language === 'en' ? 'en' : 'ko'
  const canonicalPath = lang === 'en'
    ? (spirit.canonicalPathEn ?? spirit.spiritCanonicalPathEn)
    : (spirit.canonicalPathKo ?? spirit.spiritCanonicalPathKo)
  if (canonicalPath) {
    return options.includeLocale ? canonicalPath : stripLocalePrefix(canonicalPath)
  }

  const fallbackPath = `/spirits/${spirit.id}`
  return options.includeLocale ? `/${lang}${fallbackPath}` : fallbackPath
}

export function getSpiritDetailPath(spirit: SpiritCanonicalPathSource, language: string): string {
  return getSpiritCanonicalPath(spirit, language)
}

/**
 * 복사·공유용 짧은 절대 URL — slug 를 뺀 ID 경로.
 *
 * 주류 상세 경로는 선행 숫자 ID 만으로 해석되므로(proxy.ts, seoHelpers, SpiritDetailPage)
 * slug 를 빼도 같은 페이지가 열리고, 열릴 때 proxy 가 정규 canonical 로 301 확장한다.
 * 한글 slug 는 percent-encoding 으로 3배 길어져 복사본이 200자를 넘기 때문에 짧은 형태를 쓴다.
 *
 * 화면에 거는 링크는 getSpiritCanonicalPath() 를, 사용자가 들고 나가는 값은 이 함수를 쓴다.
 */
export function getSpiritShareUrl(spiritId: number, language: string): string {
  const lang = language === 'en' ? 'en' : 'ko'
  return buildCanonical(`/${lang}/spirits/${spiritId}`)
}

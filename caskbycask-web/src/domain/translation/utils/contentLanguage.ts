export type DetectedContentLanguage = 'ko' | 'en'

const DOMINANT_TOKEN_SHARE = 0.6
const WORD_PATTERN = /[\p{L}\p{M}]+/gu
const HANGUL_PATTERN = /\p{Script=Hangul}/u
const LATIN_PATTERN = /\p{Script=Latin}/u

interface LanguageAnalysis {
  language: DetectedContentLanguage | null
  tokenCount: number
}

function analyzeContentLanguage(values: ReadonlyArray<string | null | undefined>): LanguageAnalysis {
  const tokens = values.flatMap((value) => value?.match(WORD_PATTERN) ?? [])
  if (tokens.length === 0) return { language: null, tokenCount: 0 }

  let koreanTokens = 0
  let englishTokens = 0
  for (const token of tokens) {
    // 영문 제품명에 한국어 조사가 붙은 단어는 한국어 문맥으로 본다.
    if (HANGUL_PATTERN.test(token)) koreanTokens += 1
    else if (LATIN_PATTERN.test(token)) englishTokens += 1
  }

  if (koreanTokens / tokens.length >= DOMINANT_TOKEN_SHARE) {
    return { language: 'ko', tokenCount: tokens.length }
  }
  if (englishTokens / tokens.length >= DOMINANT_TOKEN_SHARE) {
    return { language: 'en', tokenCount: tokens.length }
  }
  return { language: null, tokenCount: tokens.length }
}

export function detectDominantContentLanguage(
  values: ReadonlyArray<string | null | undefined>,
): DetectedContentLanguage | null {
  return analyzeContentLanguage(values).language
}

export function shouldOfferContentTranslation(
  values: ReadonlyArray<string | null | undefined>,
  targetLanguage: DetectedContentLanguage,
): boolean {
  const analysis = analyzeContentLanguage(values)
  if (analysis.tokenCount === 0) return false
  return analysis.language == null || analysis.language !== targetLanguage
}

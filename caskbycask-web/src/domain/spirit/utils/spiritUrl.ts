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

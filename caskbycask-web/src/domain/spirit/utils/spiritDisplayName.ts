type SpiritSeriesNameSource = {
  nameKo: string
  nameEn?: string | null
  category?: string | null
  vintageYear?: number | null
  vintageStatus?: 'VINTAGE' | 'NON_VINTAGE' | 'UNKNOWN' | null
  seriesIdentifier?: string | null
  seriesIdentifierEn?: string | null
  parentId?: number | null
  variantValue?: string | null
  variantValueEn?: string | null
}

function appendSeriesIdentifier(name: string | null | undefined, seriesIdentifier: string | null | undefined) {
  const baseName = name?.trim() ?? ''
  const suffix = seriesIdentifier?.trim()
  if (!suffix) return baseName
  return baseName ? `${baseName} ${suffix}` : suffix
}

function hasTrailingToken(value: string, token: string) {
  const normalized = value.trim().toLocaleLowerCase()
  const expected = token.toLocaleLowerCase()
  if (normalized.endsWith(expected)) {
    const start = normalized.length - expected.length
    return start === 0 || !/[\p{L}\p{N}]/u.test(normalized[start - 1])
  }
  return normalized.endsWith(`${expected})`)
}

export function appendWineVintageDisplay(
  name: string | null | undefined,
  source: Pick<SpiritSeriesNameSource, 'category' | 'vintageYear' | 'vintageStatus'>,
) {
  const baseName = name?.trim() ?? ''
  if (source.category !== 'WINE') return baseName
  const suffix = source.vintageYear != null
    ? String(source.vintageYear)
    : source.vintageStatus === 'NON_VINTAGE' ? 'NV' : ''
  if (!suffix || hasTrailingToken(baseName, suffix)) return baseName
  return baseName ? `${baseName} ${suffix}` : suffix
}

export function getSpiritListDisplayNames<T extends SpiritSeriesNameSource>(spirit: T) {
  const nameKo = appendSeriesIdentifier(spirit.nameKo, spirit.seriesIdentifier)
  const nameEn = appendSeriesIdentifier(
    spirit.nameEn,
    spirit.seriesIdentifierEn || spirit.seriesIdentifier,
  )
  return {
    nameKo: appendWineVintageDisplay(
      spirit.parentId ? appendSeriesIdentifier(nameKo, spirit.variantValue) : nameKo,
      spirit,
    ),
    nameEn: appendWineVintageDisplay(
      spirit.parentId
        ? appendSeriesIdentifier(nameEn, spirit.variantValueEn || spirit.variantValue)
        : nameEn,
      spirit,
    ),
  }
}

export function getLocalizedSpiritListNames<T extends SpiritSeriesNameSource>(
  spirit: T,
  language: string,
) {
  const { nameKo, nameEn } = getSpiritListDisplayNames(spirit)
  const isEn = language === 'en'

  return {
    primaryName: isEn ? (nameEn || nameKo) : nameKo,
    secondaryName: isEn ? nameKo : nameEn,
  }
}

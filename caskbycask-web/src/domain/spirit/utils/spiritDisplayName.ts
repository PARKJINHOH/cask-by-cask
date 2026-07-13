type SpiritSeriesNameSource = {
  nameKo: string
  nameEn?: string | null
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

export function getSpiritListDisplayNames<T extends SpiritSeriesNameSource>(spirit: T) {
  const nameKo = appendSeriesIdentifier(spirit.nameKo, spirit.seriesIdentifier)
  const nameEn = appendSeriesIdentifier(spirit.nameEn, spirit.seriesIdentifierEn || spirit.seriesIdentifier)
  return {
    nameKo: spirit.parentId ? appendSeriesIdentifier(nameKo, spirit.variantValue) : nameKo,
    nameEn: spirit.parentId
      ? appendSeriesIdentifier(nameEn, spirit.variantValueEn || spirit.variantValue)
      : nameEn,
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

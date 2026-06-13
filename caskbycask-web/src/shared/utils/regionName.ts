import { REGION_SUGGESTIONS } from '@/domain/location/data/regionSuggestions'

const KO_TO_EN: Record<string, string> = {}
const EN_TO_KO: Record<string, string> = {}

for (const suggestions of Object.values(REGION_SUGGESTIONS)) {
  for (const { nameKo, nameEn } of suggestions) {
    KO_TO_EN[nameKo] = nameEn
    EN_TO_KO[nameEn] = nameKo
  }
}

export function localizeRegion(region: string | null | undefined, lang: string): string {
  if (!region) return ''
  if (lang === 'en') return KO_TO_EN[region] ?? region
  return EN_TO_KO[region] ?? region
}

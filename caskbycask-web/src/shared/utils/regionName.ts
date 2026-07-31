import { REGION_SUGGESTIONS } from '@/domain/location/data/regionSuggestions'
import type { SpiritWineRegion } from '@/domain/spirit/types/spirit.types'

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

/**
 * 주류 상세의 지역 라벨을 만든다.
 *
 * 와인 산지 코드가 지정돼 있으면 **백엔드가 내려준 ko/en 산지명**을 쓴다 —
 * `spirit.region` 텍스트는 L1 한글명으로 동기화되어 있어 위 텍스트 사전에 없는 산지
 * (샹파뉴·보졸레·쉬드우에스트 등)는 영어 모드에서 번역되지 않기 때문이다.
 * 산지 코드가 없으면 기존 텍스트 사전으로 폴백한다.
 *
 * L2 까지 선택된 경우 `L1 · L2` 형태로 더 구체적으로 보여준다.
 */
export function localizeSpiritRegion(
  wineRegion: SpiritWineRegion | null | undefined,
  regionText: string | null | undefined,
  lang: string,
): string {
  if (!wineRegion) return localizeRegion(regionText, lang)

  const isEn = lang === 'en'
  const l1 = wineRegion.parentCode
    ? (isEn ? wineRegion.parentNameEn : wineRegion.parentNameKo) ?? ''
    : (isEn ? wineRegion.nameEn : wineRegion.nameKo)
  const l2 = wineRegion.parentCode ? (isEn ? wineRegion.nameEn : wineRegion.nameKo) : null
  return l2 ? `${l1} · ${l2}` : l1
}

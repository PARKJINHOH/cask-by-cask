import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import { useWineRegionCatalog, REGION_CATALOG_CATEGORIES } from '@/domain/location/hooks/useWineRegionCatalog'
import { localizeRegion } from '@/shared/utils/regionName'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'

export interface RegionChipsProps {
  category: SpiritCategory | ''
  country:  string
  value:    string
  onChange: (v: string) => void
}

export default function RegionChips({ category, country, value, onChange }: RegionChipsProps) {
  const { t, i18n } = useTranslation()

  const enabled = (category === 'WHISKY' || category === 'WINE') && !!country
  const { data: regions } = useQuery({
    queryKey: ['region-stats', category, country],
    queryFn: () => spiritApi.getRegions(category as SpiritCategory, country).then((r) => r.data.data ?? []),
    enabled,
    staleTime: 60_000,
  })

  // 산지 이름은 백엔드 카탈로그가 ko/en 의 단일 소스다.
  // region 통계는 한글 L1 산지명으로 집계되므로, 영어 모드에서는 카탈로그로 번역한다.
  // 위스키 산지(스페이사이드·이란·라우스 등)도 텍스트 사전에는 없으므로 반드시 카탈로그가 필요하다.
  const catalogCategory = REGION_CATALOG_CATEGORIES.includes(category as SpiritCategory)
    ? (category as SpiritCategory)
    : null
  const needsCatalog = enabled && !!catalogCategory && i18n.language === 'en'
  const { countries: wineCountries } = useWineRegionCatalog(
    needsCatalog,
    catalogCategory ?? 'WINE',
  )
  const wineNameKoToEn = new Map<string, string>()
  for (const c of wineCountries) {
    for (const l1 of c.regions) wineNameKoToEn.set(l1.nameKo, l1.nameEn)
  }

  const label = (regionName: string) => {
    if (i18n.language !== 'en') return regionName
    return wineNameKoToEn.get(regionName) ?? localizeRegion(regionName, 'en')
  }

  if (!enabled || !regions || regions.length === 0) return null

  return (
    <div>
      <h3 className="text-sm font-bold text-neutral-900 mb-2">
        {t('spirit.filter.region')}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {regions.map((r) => {
          const active = value === r.region
          return (
            <button
              key={r.region}
              type="button"
              onClick={() => onChange(active ? '' : r.region)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors
                inline-flex items-center gap-1
                ${active
                  ? 'bg-primary-800 text-white border-primary-800'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300'}`}
            >
              <span>{label(r.region)}</span>
              <span className={active ? 'text-primary-100' : 'text-neutral-400'}>
                {r.count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

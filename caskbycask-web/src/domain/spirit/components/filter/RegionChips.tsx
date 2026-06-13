import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'

export interface RegionChipsProps {
  category: SpiritCategory | ''
  country:  string
  value:    string
  onChange: (v: string) => void
}

export default function RegionChips({ category, country, value, onChange }: RegionChipsProps) {
  const { t } = useTranslation()

  const enabled = (category === 'WHISKY' || category === 'WINE') && !!country
  const { data: regions } = useQuery({
    queryKey: ['region-stats', category, country],
    queryFn: () => spiritApi.getRegions(category as SpiritCategory, country).then((r) => r.data.data ?? []),
    enabled,
    staleTime: 60_000,
  })

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
              <span>{r.region}</span>
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

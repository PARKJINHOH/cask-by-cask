import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import { localizeCountry } from '@/shared/utils/countryName'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'

const QUICK_PICKS = ['스코틀랜드', '일본', '미국', '프랑스', '아일랜드']
const COLLAPSED_COUNT = 8

export interface CountryComboboxProps {
  category: SpiritCategory | ''
  value:    string
  onChange: (v: string) => void
}

export default function CountryCombobox({ category, value, onChange }: CountryComboboxProps) {
  const { t, i18n } = useTranslation()
  const [keyword, setKeyword] = useState('')
  const [expanded, setExpanded] = useState(false)

  const { data: stats, isLoading } = useQuery({
    queryKey: ['country-stats', category || null],
    queryFn: () => spiritApi.getCountries(category || undefined).then((r) => r.data.data ?? []),
    staleTime: 60_000,
  })

  const filtered = useMemo(() => {
    if (!stats) return []
    const kw = keyword.trim().toLowerCase()
    if (!kw) return stats
    return stats.filter((s) => {
      const ko = s.country.toLowerCase()
      const en = localizeCountry(s.country, 'en').toLowerCase()
      return ko.includes(kw) || en.includes(kw)
    })
  }, [stats, keyword])

  const visible = expanded || keyword ? filtered : filtered.slice(0, COLLAPSED_COUNT)
  const hasMore = !keyword && filtered.length > COLLAPSED_COUNT

  return (
    <div>
      <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
        {t('spirit.filter.country')}
      </h3>

      {/* 빠른 칩 */}
      <div className="flex flex-wrap gap-1 mb-2">
        {QUICK_PICKS.map((c) => {
          const active = value === c
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(active ? '' : c)}
              className={`px-2 py-0.5 text-xs rounded-full border transition-colors
                ${active
                  ? 'bg-primary-800 text-white border-primary-800'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'}`}
            >
              {localizeCountry(c, i18n.language)}
            </button>
          )
        })}
      </div>

      {/* 검색 입력 */}
      <div className="relative mb-2">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={t('spirit.filter.countrySearch')}
          className="w-full pl-8 pr-2 py-1.5 text-xs border border-neutral-300 rounded-md
            focus:outline-none focus:ring-1 focus:ring-primary-400 bg-white"
        />
      </div>

      {/* "모든 국가" 옵션 */}
      <button
        type="button"
        onClick={() => onChange('')}
        className={`w-full text-left text-sm px-2 py-1 rounded-md transition-colors
          ${value === ''
            ? 'bg-primary-50 text-primary-900 font-medium'
            : 'text-neutral-600 hover:bg-neutral-50'}`}
      >
        {t('spirit.filter.countryAll')}
      </button>

      {/* 국가 목록 */}
      <ul className="space-y-0.5 mt-1 max-h-72 overflow-y-auto">
        {isLoading && (
          <li className="text-xs text-neutral-400 px-2 py-1">…</li>
        )}
        {!isLoading && visible.length === 0 && (
          <li className="text-xs text-neutral-400 px-2 py-1">—</li>
        )}
        {visible.map((s) => {
          const active = value === s.country
          return (
            <li key={s.country}>
              <button
                type="button"
                onClick={() => onChange(active ? '' : s.country)}
                className={`w-full flex items-center justify-between gap-2 px-2 py-1 rounded-md
                  text-sm transition-colors
                  ${active
                    ? 'bg-primary-50 text-primary-900 font-medium'
                    : 'text-neutral-700 hover:bg-neutral-50'}`}
              >
                <span className="truncate">{localizeCountry(s.country, i18n.language)}</span>
                <span className={`text-xs flex-shrink-0
                  ${active ? 'text-primary-800' : 'text-neutral-400'}`}>
                  {s.count}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 text-xs text-neutral-500 hover:text-primary-800 transition-colors"
        >
          {expanded ? t('spirit.filter.showLess') : t('spirit.filter.showMore')}
        </button>
      )}
    </div>
  )
}

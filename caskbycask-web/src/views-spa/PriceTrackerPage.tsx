import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import PriceSparkline from '@/domain/pricetracker/components/PriceSparkline'
import PriceAlertBanner from '@/domain/pricetracker/components/PriceAlertBanner'
import type { SpiritListItem } from '@/domain/spirit/types/spirit.types'
import type { StoreType } from '@/domain/pricetracker/types/pricetracker.types'
import { usePriceChart } from '@/domain/pricetracker/hooks/usePriceChart'

const fmt = new Intl.NumberFormat('ko-KR')

interface SpiritCardProps {
  spirit: SpiritListItem
  storeType: StoreType
}

function SpiritCard({ spirit, storeType }: SpiritCardProps) {
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const { data: chartData } = usePriceChart(spirit.id, storeType, '3M')

  const minPrice = chartData?.points
    .map((p) => p.minFinalPrice)
    .filter((v): v is number => v != null)
    .reduce((a, b) => Math.min(a, b), Infinity)

  const primaryName = isEn ? (spirit.nameEn || spirit.nameKo) : spirit.nameKo
  const subName = isEn ? spirit.nameKo : (spirit.nameEn || undefined)

  return (
    <button
      onClick={() => navigate(`/price-tracker/spirits/${spirit.id}`)}
      className="bg-white rounded-2xl border border-neutral-200 p-4 hover:border-primary-700 hover:shadow-md transition-all text-left group"
    >
      <div className="flex gap-3">
        {spirit.primaryImageUrl ? (
          <img
            src={spirit.primaryImageUrl}
            alt={primaryName ?? ''}
            className="w-12 h-12 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-neutral-100 shrink-0 flex items-center justify-center text-2xl">
            🥃
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-neutral-900 truncate group-hover:text-primary-700 transition-colors">
            {primaryName}
          </p>
          {subName && <p className="text-xs text-neutral-400 truncate">{subName}</p>}
          {minPrice != null && minPrice !== Infinity ? (
            <p className="text-sm font-bold text-primary-700 mt-1">
              {fmt.format(minPrice)}
              <span className="text-xs font-normal ml-0.5">원~</span>
            </p>
          ) : (
            <p className="text-xs text-neutral-300 mt-1">가격 정보 없음</p>
          )}
        </div>
      </div>
      <div className="mt-2 -mx-1">
        <PriceSparkline spiritId={spirit.id} storeType={storeType} />
      </div>
    </button>
  )
}

export default function PriceTrackerPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [keyword, setKeyword] = useState('')
  const [storeType, setStoreType] = useState<StoreType>('DOMESTIC')
  const [inputVal, setInputVal] = useState('')

  const { data: spiritPage, isLoading } = useQuery({
    queryKey: ['spiritSearch', keyword, storeType],
    queryFn: () => spiritApi.search({ keyword: keyword || undefined, page: 0, size: 20 }),
    select: (res) => res.data.data,
    enabled: true,
    staleTime: 60 * 1000,
  })

  const spirits = spiritPage?.content ?? []

  const handleSearch = useCallback(() => {
    setKeyword(inputVal.trim())
  }, [inputVal])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* PRICE_ALERT 발동 배너 */}
      <PriceAlertBanner />

      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">{t('price.tracker')}</h1>
        <p className="text-neutral-500 text-sm mt-1">{t('price.trackerDesc')}</p>
      </div>

      {/* 툴바 */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-4 mb-6 space-y-3">
        {/* 국내/면세 탭 */}
        <div className="flex rounded-lg border border-neutral-200 overflow-hidden w-fit text-sm">
          {(['DOMESTIC', 'OVERSEAS', 'DUTYFREE'] as const).map((t_) => (
            <button
              key={t_}
              onClick={() => setStoreType(t_)}
              className={`px-5 py-2 font-medium transition-colors ${
                storeType === t_
                  ? 'bg-primary-700 text-white'
                  : 'text-neutral-500 hover:bg-neutral-50'
              }`}
            >
              {t_ === 'DOMESTIC'
                ? t('price.chart.domestic')
                : t_ === 'OVERSEAS'
                ? t('price.chart.overseas', '해외')
                : t('price.chart.dutyfree')}
            </button>
          ))}
        </div>

        {/* 검색 */}
        <div className="flex gap-2">
          <input
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={t('price.register.spiritPlaceholder')}
            className="flex-1 border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-primary-700 text-white rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors"
          >
            {t('nav.search', '검색')}
          </button>
          <button
            onClick={() => navigate('/price-tracker/register')}
            className="px-4 py-2 border border-primary-700 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-50 transition-colors"
          >
            + {t('price.registerBtn')}
          </button>
        </div>
      </div>

      {/* 술 목록 */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 bg-neutral-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : spirits.length === 0 ? (
        <div className="text-center py-16 text-neutral-400">
          <p className="text-4xl mb-3">🥃</p>
          <p className="text-sm">{t('spirit.search.noResults', '검색 결과가 없습니다')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {spirits.map((spirit) => (
            <SpiritCard key={spirit.id} spirit={spirit} storeType={storeType} />
          ))}
        </div>
      )}
    </div>
  )
}

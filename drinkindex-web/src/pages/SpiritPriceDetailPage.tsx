import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSpiritDetail } from '@/domain/spirit/hooks/useSpiritDetail'
import Spinner from '@/shared/components/Spinner'
import { usePriceChart, usePriceChartDetail } from '@/domain/pricetracker/hooks/usePriceChart'
import PriceRangeChart from '@/domain/pricetracker/components/PriceRangeChart'
import StoreDetailPanel from '@/domain/pricetracker/components/StoreDetailPanel'
import PriceAlertInline from '@/domain/pricetracker/components/PriceAlertInline'
import PriceAlertBanner from '@/domain/pricetracker/components/PriceAlertBanner'
import type { StoreType } from '@/domain/pricetracker/types/pricetracker.types'

export default function SpiritPriceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const spiritId = Number(id)

  const [storeType, setStoreType] = useState<StoreType>('DOMESTIC')
  const [period, setPeriod] = useState('3M')
  const [region] = useState('')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false) // mobile

  const { data: spirit, isLoading: spiritLoading } = useSpiritDetail(spiritId)
  const { data: chartData, isLoading: chartLoading } = usePriceChart(spiritId, storeType, period, region || undefined)
  const { data: pointDetails, isLoading: detailLoading } = usePriceChartDetail(spiritId, selectedDate, storeType)

  const handlePointClick = (date: string) => {
    setSelectedDate(date)
    setPanelOpen(true)
  }

  if (spiritLoading) return <Spinner fullscreen />

  const primaryName = isEn ? (spirit?.nameEn ?? spirit?.nameKo) : spirit?.nameKo
  const subName = isEn ? spirit?.nameKo : (spirit?.nameEn || undefined)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* PRICE_ALERT 발동 배너 */}
      <PriceAlertBanner spiritId={spiritId} />

      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-neutral-400 hover:text-neutral-600 mb-2 block"
          >
            ← {t('spirit.detail.backToList', '목록으로')}
          </button>
          <h1 className="text-xl font-bold text-neutral-900">{primaryName}</h1>
          {subName && <p className="text-sm text-neutral-400 mt-0.5">{subName}</p>}
        </div>
        <Link
          to={`/price-tracker/register?spiritId=${spiritId}`}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-primary-700 text-white text-xs font-medium hover:bg-primary-800 transition-colors"
        >
          + {t('price.registerBtn')}
        </Link>
      </div>

      {/* 목표가 알림 인라인 */}
      <div className="mb-6">
        <PriceAlertInline spiritId={spiritId} />
      </div>

      {/* PC: 차트(좌) + 패널(우) */}
      <div className="flex gap-6">
        {/* 차트 영역 */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl border border-neutral-200 p-5">
          <PriceRangeChart
            data={chartData ?? undefined}
            isLoading={chartLoading}
            period={period}
            onPeriodChange={setPeriod}
            storeType={storeType}
            onStoreTypeChange={setStoreType}
            onPointClick={(date) => handlePointClick(date)}
            selectedDate={selectedDate}
          />
        </div>

        {/* 패널 (PC: 우측 고정) */}
        <div className="hidden lg:block w-80 xl:w-96 bg-white rounded-2xl border border-neutral-200 min-h-[380px]">
          <StoreDetailPanel
            details={pointDetails ?? undefined}
            isLoading={detailLoading}
            selectedDate={selectedDate}
          />
        </div>
      </div>

      {/* 모바일: 하단 슬라이드업 패널 */}
      {panelOpen && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl border-t border-neutral-200 shadow-2xl max-h-[60vh] overflow-y-auto">
          <StoreDetailPanel
            details={pointDetails ?? undefined}
            isLoading={detailLoading}
            selectedDate={selectedDate}
            onClose={() => setPanelOpen(false)}
          />
        </div>
      )}
      {panelOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/20"
          onClick={() => setPanelOpen(false)}
        />
      )}

      {/* 알림 면세 안내 */}
      <p className="mt-4 text-center text-xs text-neutral-400">{t('price.alert.dutyfreeNote')}</p>
    </div>
  )
}

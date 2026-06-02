import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSpiritDetail } from '@/domain/spirit/hooks/useSpiritDetail'
import Spinner from '@/shared/components/Spinner'
import { usePriceChart, usePriceChartDetail, useUpsertPriceAlert, useMyPriceAlerts, useDeletePriceAlert } from '@/domain/pricetracker/hooks/usePriceChart'
import PriceRangeChart from '@/domain/pricetracker/components/PriceRangeChart'
import StoreDetailPanel from '@/domain/pricetracker/components/StoreDetailPanel'
import { useAuthStore } from '@/domain/auth/store/authStore'
import type { StoreType } from '@/domain/pricetracker/types/pricetracker.types'

export default function SpiritPriceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const spiritId = Number(id)
  const { isLoggedIn } = useAuthStore()

  const [storeType, setStoreType] = useState<StoreType>('DOMESTIC')
  const [period, setPeriod] = useState('3M')
  const [region] = useState('')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [alertPrice, setAlertPrice] = useState('')
  const [showAlertForm, setShowAlertForm] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false) // mobile

  const { data: spirit, isLoading: spiritLoading } = useSpiritDetail(spiritId)
  const { data: chartData, isLoading: chartLoading } = usePriceChart(spiritId, storeType, period, region || undefined)
  const { data: pointDetails, isLoading: detailLoading } = usePriceChartDetail(spiritId, selectedDate, storeType)
  const { data: myAlerts } = useMyPriceAlerts()
  const upsertAlert = useUpsertPriceAlert()
  const deleteAlert = useDeletePriceAlert()

  const existingAlert = myAlerts?.find((a) => a.spiritId === spiritId)

  const handlePointClick = (date: string) => {
    setSelectedDate(date)
    setPanelOpen(true)
  }

  const handleAlertSubmit = () => {
    const price = Number(alertPrice.replace(/,/g, ''))
    if (!price || price <= 0) return
    upsertAlert.mutate({ spiritId, targetPrice: price })
    setShowAlertForm(false)
    setAlertPrice('')
  }

  if (spiritLoading) return <Spinner fullscreen />

  const primaryName = isEn ? (spirit?.nameEn ?? spirit?.nameKo) : spirit?.nameKo
  const subName = isEn ? spirit?.nameKo : (spirit?.nameEn || undefined)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4 mb-6">
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
        <div className="flex gap-2 shrink-0">
          {isLoggedIn && (
            <div className="space-y-2">
              {existingAlert ? (
                <div className="text-right">
                  <p className="text-xs text-neutral-500 mb-1">
                    {t('price.alert.title')}: {existingAlert.targetPriceKrw.toLocaleString()}원
                  </p>
                  <button
                    onClick={() => deleteAlert.mutate(existingAlert.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    {t('price.alert.delete')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAlertForm((v) => !v)}
                  className="px-3 py-1.5 rounded-lg border border-[#185FA5] text-[#185FA5] text-xs font-medium hover:bg-blue-50 transition-colors"
                >
                  🔔 {t('price.alert.set')}
                </button>
              )}
              {showAlertForm && (
                <div className="flex gap-2 items-center">
                  <input
                    value={alertPrice}
                    onChange={(e) => setAlertPrice(e.target.value)}
                    placeholder={t('price.alert.targetPrice')}
                    className="w-28 border border-neutral-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                  />
                  <button
                    onClick={handleAlertSubmit}
                    className="px-2 py-1 bg-[#185FA5] text-white rounded text-xs"
                  >
                    {t('common.save', '저장')}
                  </button>
                </div>
              )}
            </div>
          )}
          <Link
            to="/price-tracker/register"
            className="px-3 py-1.5 rounded-lg bg-[#185FA5] text-white text-xs font-medium hover:bg-[#1552a0] transition-colors"
          >
            + {t('price.registerBtn')}
          </Link>
        </div>
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

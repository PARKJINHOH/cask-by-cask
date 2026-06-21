import { useTranslation } from 'react-i18next'
import Spinner from '@/shared/components/Spinner'
import PriceReportCard from './PriceReportCard'
import type { PriceReportChartDetail } from '../types/pricetracker.types'

interface Props {
  details: PriceReportChartDetail[] | undefined
  isLoading: boolean
  selectedDate: string | null
  onClose?: () => void
}

export default function StoreDetailPanel({ details, isLoading, selectedDate, onClose }: Props) {
  const { t } = useTranslation()

  if (!selectedDate) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-neutral-400 gap-2 p-8">
        <span className="text-4xl">🏪</span>
        <p className="text-sm text-center">{t('price.panel.emptyHint', '차트에서 날짜를 클릭하면\n매장별 가격을 볼 수 있어요')}</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
        <h3 className="text-sm font-semibold text-neutral-800">
          {t('price.panel.title')}
          {selectedDate && (
            <span className="ml-2 text-xs font-normal text-neutral-400">{selectedDate}</span>
          )}
        </h3>
        {onClose && (
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 text-lg leading-none">
            ×
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center pt-8">
            <Spinner />
          </div>
        ) : !details?.length ? (
          <div className="text-center text-neutral-400 text-sm pt-8">
            {t('price.chart.noData')}
          </div>
        ) : (
          details.map((detail, i) => (
            <PriceReportCard
              key={`${detail.isHotDeal ? 'deal' : 'report'}-${detail.reportId}`}
              detail={detail}
              isBest={i === 0}
            />
          ))
        )}
      </div>
    </div>
  )
}

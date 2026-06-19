import {
  ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import type { BucketType, ChartResponse, StoreType } from '../types/pricetracker.types'

const PERIODS = ['1M', '3M', '6M', '1Y', 'ALL'] as const

interface Props {
  data: ChartResponse | undefined
  isLoading: boolean
  period: string
  onPeriodChange: (p: string) => void
  storeType: StoreType
  onStoreTypeChange: (t: StoreType) => void
  onPointClick: (date: string, reportIds: number[], bucketType: BucketType) => void
  selectedDate: string | null
}

const fmt = new Intl.NumberFormat('ko-KR')
const fmtPrice = (v: number) =>
  v >= 10000 ? `${Math.round(v / 1000)}천` : fmt.format(v)

function CustomTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  const { t } = useTranslation()
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-3 shadow-xl text-xs min-w-[160px]">
      <p className="font-semibold text-neutral-700 mb-2">{d.date}</p>
      <div className="space-y-1.5">
        {d.storeCount > 0 && (
          <Row label={t('price.chart.storeCount')} value={`${d.storeCount}개`} />
        )}
        {d.maxPrice != null && (
          <Row label={t('price.chart.maxPrice')} value={`${fmt.format(d.maxPrice)}원`} />
        )}
        {d.avgSalePrice != null && (
          <Row label={t('price.chart.avgSale')} value={`${fmt.format(d.avgSalePrice)}원`} />
        )}
        {d.minFinalPrice != null && (
          <Row
            label={t('price.chart.minPrice')}
            value={`${fmt.format(d.minFinalPrice)}원`}
            highlight
          />
        )}
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className={`flex justify-between gap-4 ${highlight ? 'text-primary-700 font-bold' : 'text-neutral-600'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

export default function PriceRangeChart({
  data,
  isLoading,
  period,
  onPeriodChange,
  storeType,
  onStoreTypeChange,
  onPointClick,
  selectedDate,
}: Props) {
  const { t } = useTranslation()

  const chartData =
    data?.points.map((p) => ({
      date: p.date,
      minFinalPrice: p.minFinalPrice,
      bandSize:
        p.maxPrice != null && p.minFinalPrice != null
          ? p.maxPrice - p.minFinalPrice
          : null,
      maxPrice: p.maxPrice,
      avgSalePrice: p.avgSalePrice,
      storeCount: p.storeCount,
      reportIds: p.reportIds,
    })) ?? []

  const isEmpty = !isLoading && chartData.length === 0

  return (
    <div className="space-y-3">
      {/* 탭 + 기간 툴바 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* 국내/면세 탭 */}
        <div className="flex rounded-lg border border-neutral-200 overflow-hidden text-sm">
          {(['DOMESTIC', 'OVERSEAS', 'DUTYFREE'] as const).map((t_) => (
            <button
              key={t_}
              onClick={() => onStoreTypeChange(t_)}
              className={`px-4 py-1.5 font-medium transition-colors ${
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

        {/* 기간 토글 */}
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                period === p
                  ? 'bg-primary-700 text-white'
                  : 'text-neutral-500 hover:bg-neutral-100'
              }`}
            >
              {t(`price.chart.period.${p}`)}
            </button>
          ))}
        </div>
      </div>

      {/* 차트 영역 */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <span className="text-neutral-400 text-sm animate-pulse">{t('common.loading', '로딩 중...')}</span>
        </div>
      ) : isEmpty ? (
        <div className="h-64 flex flex-col items-center justify-center text-neutral-400 gap-2">
          <span className="text-3xl">📊</span>
          <p className="text-sm">{t('price.chart.noData')}</p>
        </div>
      ) : (
        <div>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              onClick={(payload: any) => {
                if (payload?.activePayload?.[0]) {
                  const pt = payload.activePayload[0].payload
                  onPointClick(pt.date, pt.reportIds, data?.bucketType ?? 'INDIVIDUAL')
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => {
                  const parts = v.split('-')
                  return parts.length >= 2 ? `${parts[1]}/${parts[2] ?? ''}` : v
                }}
              />
              <YAxis
                tickFormatter={fmtPrice}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* 밴드 하단 베이스 (투명) */}
              <Area
                dataKey="minFinalPrice"
                fill="transparent"
                stroke="none"
                stackId="band"
                connectNulls
              />
              {/* 밴드 상단 fill (minFinalPrice ~ maxPrice) */}
              <Area
                dataKey="bandSize"
                fill="#f59e0b"
                fillOpacity={0.15}
                stroke="none"
                stackId="band"
                connectNulls
              />
              {/* 최저 실구매가 라인 */}
              <Line
                dataKey="minFinalPrice"
                stroke="#b45309"
                strokeWidth={2}
                dot={(props: any) => {
                  const isSelected = props.payload.date === selectedDate
                  return (
                    <circle
                      key={props.key}
                      cx={props.cx}
                      cy={props.cy}
                      r={isSelected ? 6 : 4}
                      fill={isSelected ? '#fff' : '#b45309'}
                      stroke="#b45309"
                      strokeWidth={isSelected ? 2 : 0}
                    />
                  )
                }}
                activeDot={{ r: 6, fill: '#b45309', strokeWidth: 2, stroke: '#fff' }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-center text-xs text-neutral-400 mt-1">
            {t('price.chart.clickHint')}
          </p>
        </div>
      )}
    </div>
  )
}

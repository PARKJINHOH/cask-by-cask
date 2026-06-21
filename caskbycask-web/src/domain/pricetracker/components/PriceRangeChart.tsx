import {
  ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, LabelList,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import type { BucketType, ChartResponse, StoreType } from '../types/pricetracker.types'

const PERIODS = ['1M', '3M', '6M', '1Y', 'ALL'] as const
const SERIES_COLORS = ['#b45309', '#2563eb', '#059669', '#dc2626', '#7c3aed', '#0891b2', '#ea580c', '#4f46e5']

type SeriesMeta = {
  key: string
  label: string
  color: string
}

interface Props {
  data: ChartResponse | undefined
  isLoading: boolean
  period: string
  onPeriodChange: (p: string) => void
  storeType: StoreType
  onStoreTypeChange: (t: StoreType) => void
  onPointClick: (date: string, reportIds: number[], bucketType: BucketType) => void
  selectedDate: string | null
  seriesLabels?: Record<number, string>
}

const fmt = new Intl.NumberFormat('ko-KR')
const fmtPrice = (v: number) => {
  if (v >= 10000) return `${Math.round(v / 10000)}만`
  if (v >= 1000) return `${Math.round(v / 1000)}천`
  return fmt.format(v)
}

function CustomTooltip({
  active,
  payload,
  seriesMeta,
}: {
  active?: boolean
  payload?: any[]
  seriesMeta?: SeriesMeta[]
}) {
  const { t } = useTranslation()
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  if (seriesMeta?.length) {
    const rows = seriesMeta
      .map((meta) => ({ ...meta, value: d[meta.key] as number | null | undefined }))
      .filter((row) => row.value != null)
    if (rows.length === 0) return null
    return (
      <div className="bg-white border border-neutral-200 rounded-xl p-3 shadow-xl text-xs min-w-[190px]">
        <p className="font-semibold text-neutral-700 mb-2">{d.date}</p>
        <div className="space-y-1.5">
          {rows.map((row) => (
            <div key={row.key} className="flex justify-between gap-4 text-neutral-600">
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                <span className="truncate">{row.label}</span>
              </span>
              <span className="font-semibold text-neutral-800">{fmt.format(row.value!)}원</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
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
  seriesLabels,
}: Props) {
  const { t } = useTranslation()

  const chartSeries = (data?.series ?? []).filter((series) => series.points.length > 0)
  const isMultiSeries = chartSeries.length > 1
  const seriesMeta = chartSeries.map((series, index) => ({
    key: `series_${series.spiritId}`,
    label: seriesLabels?.[series.spiritId] ?? `#${series.spiritId}`,
    color: SERIES_COLORS[index % SERIES_COLORS.length],
  }))

  const singleChartData =
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

  const multiChartData = (() => {
    if (!isMultiSeries) return []
    const byDate = new Map<string, Record<string, any>>()
    chartSeries.forEach((series, index) => {
      const meta = seriesMeta[index]
      series.points.forEach((point) => {
        const row = byDate.get(point.date) ?? { date: point.date, reportIds: [] as number[] }
        row[meta.key] = point.minFinalPrice
        row[`${meta.key}ReportIds`] = point.reportIds
        row[`${meta.key}StoreCount`] = point.storeCount
        row.reportIds = Array.from(new Set([...(row.reportIds as number[]), ...point.reportIds]))
        byDate.set(point.date, row)
      })
    })
    return Array.from(byDate.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)))
  })()

  const chartData = isMultiSeries ? multiChartData : singleChartData
  const isEmpty = !isLoading && chartData.length === 0
  const handlePointClick = (point: any) => {
    if (!point?.date) return
    onPointClick(point.date, point.reportIds ?? [], data?.bucketType ?? 'INDIVIDUAL')
  }

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
              margin={{ top: 20, right: 8, left: 0, bottom: 0 }}
              onClick={(payload: any) => {
                if (payload?.activePayload?.[0]) {
                  handlePointClick(payload.activePayload[0].payload)
                } else if (payload?.activeTooltipIndex != null && chartData[payload.activeTooltipIndex]) {
                  handlePointClick(chartData[payload.activeTooltipIndex])
                } else if (chartData.length === 1) {
                  handlePointClick(chartData[0])
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
                domain={[
                  (dataMin: number) => Math.floor(dataMin * 0.95),
                  (dataMax: number) => Math.ceil(dataMax * 1.08),
                ]}
              />
              <Tooltip content={<CustomTooltip seriesMeta={isMultiSeries ? seriesMeta : undefined} />} />

              {!isMultiSeries && (
                <>
                  <Area
                    dataKey="minFinalPrice"
                    fill="transparent"
                    stroke="none"
                    stackId="band"
                    connectNulls
                  />
                  <Area
                    dataKey="bandSize"
                    fill="#f59e0b"
                    fillOpacity={0.15}
                    stroke="none"
                    stackId="band"
                    connectNulls
                  />
                  <Line
                    dataKey="minFinalPrice"
                    stroke="#b45309"
                    strokeWidth={2}
                    onClick={(props: any) => {
                      if (props?.payload) {
                        handlePointClick(props.payload)
                      }
                    }}
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
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => { e.stopPropagation(); handlePointClick(props.payload) }}
                        />
                      )
                    }}
                    activeDot={(props: any) => (
                      <circle
                        key={props.key}
                        cx={props.cx}
                        cy={props.cy}
                        r={6}
                        fill="#b45309"
                        strokeWidth={2}
                        stroke="#fff"
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePointClick(props.payload)
                        }}
                      />
                    )}
                    connectNulls
                  >
                    {chartData.length <= 3 && (
                      <LabelList
                        dataKey="minFinalPrice"
                        position="top"
                        formatter={(value) => {
                          if (typeof value === 'number') return `${fmt.format(value)}원`
                          if (typeof value === 'string' && value.trim() !== '') {
                            const numericValue = Number(value)
                            return Number.isFinite(numericValue) ? `${fmt.format(numericValue)}원` : ''
                          }
                          return ''
                        }}
                        style={{ fontSize: 11, fill: '#92400e', fontWeight: 700 }}
                      />
                    )}
                  </Line>
                </>
              )}
              {isMultiSeries && seriesMeta.map((meta) => (
                <Line
                  key={meta.key}
                  dataKey={meta.key}
                  stroke={meta.color}
                  strokeWidth={2}
                  onClick={(props: any) => {
                    if (props?.payload) {
                      handlePointClick(props.payload)
                    }
                  }}
                  dot={(props: any) => {
                    if (props.value == null) return <g key={props.key} />
                    const isSelected = props.payload.date === selectedDate
                    return (
                      <circle
                        key={props.key}
                        cx={props.cx}
                        cy={props.cy}
                        r={isSelected ? 6 : 4}
                        fill={isSelected ? '#fff' : meta.color}
                        stroke={meta.color}
                        strokeWidth={isSelected ? 2 : 0}
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => { e.stopPropagation(); handlePointClick(props.payload) }}
                      />
                    )
                  }}
                  activeDot={(props: any) => (
                    <circle
                      key={props.key}
                      cx={props.cx}
                      cy={props.cy}
                      r={6}
                      fill={meta.color}
                      strokeWidth={2}
                      stroke="#fff"
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePointClick(props.payload)
                      }}
                    />
                  )}
                  connectNulls
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
          {isMultiSeries && (
            <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-neutral-500">
              {seriesMeta.map((meta) => (
                <span key={meta.key} className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                  {meta.label}
                </span>
              ))}
            </div>
          )}
          <p className="text-center text-xs text-neutral-400 mt-1">
            {t('price.chart.clickHint')}
          </p>
        </div>
      )}
    </div>
  )
}

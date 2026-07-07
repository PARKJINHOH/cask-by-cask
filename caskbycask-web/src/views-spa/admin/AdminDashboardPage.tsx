import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ComposedChart,
} from 'recharts'
import { adminDashboardApi } from '@/domain/admin/api/adminDashboardApi'

const PERIOD_OPTIONS = [
  { label: '7일', value: 7 },
  { label: '30일', value: 30 },
  { label: '90일', value: 90 },
]

const CATEGORY_COLORS: Record<string, string> = {
  WHISKY: '#f59e0b',
  WINE: '#ef4444',
  COGNAC: '#8b5cf6',
  OTHER: '#6b7280',
}

const REPORT_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  RESOLVED: '#10b981',
  DISMISSED: '#6b7280',
}

const CATEGORY_LABELS: Record<string, string> = {
  WHISKY: '위스키',
  WINE: '와인',
  COGNAC: '꼬냑',
  OTHER: '기타',
}

const REPORT_LABELS: Record<string, string> = {
  PENDING: '처리 대기',
  RESOLVED: '처리 완료',
  DISMISSED: '기각',
}

function KpiCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="text-3xl font-bold text-neutral-800 mt-1">{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-neutral-400 mt-1">{sub}</p>}
    </div>
  )
}

function PeriodTabs({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1 bg-neutral-100 p-0.5 rounded-lg">
      {PERIOD_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            value === opt.value
              ? 'bg-white text-neutral-800 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function xAxisFormatter(date: string, period: number) {
  const d = new Date(date)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function tickInterval(period: number) {
  if (period === 7) return 0
  if (period === 30) return 4
  return 14
}

export default function AdminDashboardPage() {
  const [trendPeriod, setTrendPeriod] = useState(30)

  const { data: kpis } = useQuery({
    queryKey: ['admin', 'dashboard', 'kpis'],
    queryFn: () => adminDashboardApi.getKpis().then((r) => r.data.data),
  })

  const { data: userTrend = [] } = useQuery({
    queryKey: ['admin', 'dashboard', 'user-trend', trendPeriod],
    queryFn: () => adminDashboardApi.getUserTrend(trendPeriod).then((r) => r.data.data ?? []),
  })

  const { data: categoryStats = [] } = useQuery({
    queryKey: ['admin', 'dashboard', 'category-stats'],
    queryFn: () => adminDashboardApi.getCategoryStats().then((r) => r.data.data ?? []),
  })

  const { data: reviewTrend = [] } = useQuery({
    queryKey: ['admin', 'dashboard', 'review-trend', trendPeriod],
    queryFn: () => adminDashboardApi.getReviewTrend(trendPeriod).then((r) => r.data.data ?? []),
  })

  const { data: reportStats = [] } = useQuery({
    queryKey: ['admin', 'dashboard', 'report-stats'],
    queryFn: () => adminDashboardApi.getReportStats().then((r) => r.data.data ?? []),
  })

  const categoryChartData = categoryStats.map((s) => ({
    ...s,
    label: CATEGORY_LABELS[s.category] ?? s.category,
  }))

  const reportChartData = reportStats.map((s) => ({
    ...s,
    label: REPORT_LABELS[s.status] ?? s.status,
  }))

  const userTrendFormatted = userTrend.map((d) => ({
    ...d,
    label: xAxisFormatter(d.date, trendPeriod),
  }))

  const reviewTrendFormatted = reviewTrend.map((d) => ({
    ...d,
    label: xAxisFormatter(d.date, trendPeriod),
  }))

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-800">대시보드</h1>
        <p className="text-sm text-neutral-500 mt-0.5">서비스 현황 요약</p>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="총 회원수" value={kpis?.totalUsers ?? 0} sub="활성 회원 기준" />
        <KpiCard label="오늘 신규 가입" value={kpis?.todayNewUsers ?? 0} sub="오늘 00:00 기준" />
        <KpiCard
          label="처리 대기 신고"
          value={kpis?.pendingReports ?? 0}
          sub="콘텐츠 + 게시글 신고 합산"
        />
        <KpiCard
          label="미승인 술 등록 요청"
          value={kpis?.pendingRequests ?? 0}
          sub="PENDING 상태"
        />
      </div>

      {/* 기간 탭 (그래프 공통) */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-600">기간 선택</p>
        <PeriodTabs value={trendPeriod} onChange={setTrendPeriod} />
      </div>

      {/* 그래프 행 1: 신규 가입자 추이 + 카테고리별 술 현황 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 신규 가입자 추이 */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <h2 className="text-sm font-semibold text-neutral-700 mb-4">가입자 추이</h2>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={userTrendFormatted}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                interval={tickInterval(trendPeriod)}
              />
              <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11 }} width={30} />
              <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 11 }} width={35} />
              <Tooltip
                labelFormatter={(label) => `날짜: ${label}`}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                yAxisId="left"
                dataKey="count"
                name="일 신규 가입자"
                fill="#f59e0b"
                radius={[3, 3, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulativeCount"
                name="전체 회원수"
                stroke="#d97706"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* 카테고리별 술 등록 현황 */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <h2 className="text-sm font-semibold text-neutral-700 mb-4">카테고리별 술 등록 현황</h2>
          {categoryChartData.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-sm text-neutral-400">
              데이터 없음
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={categoryChartData}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {categoryChartData.map((entry) => (
                    <Cell
                      key={entry.category}
                      fill={CATEGORY_COLORS[entry.category] ?? '#94a3b8'}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value}종`, name]} />
                <Legend
                  formatter={(value) => (
                    <span className="text-xs text-neutral-600">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 그래프 행 2: 리뷰 작성 추이 + 신고 처리 현황 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 리뷰 작성 추이 */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <h2 className="text-sm font-semibold text-neutral-700 mb-4">리뷰 작성 추이</h2>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={reviewTrendFormatted}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                interval={tickInterval(trendPeriod)}
              />
              <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11 }} width={30} />
              <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 11 }} width={35} />
              <Tooltip
                labelFormatter={(label) => `날짜: ${label}`}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                yAxisId="left"
                dataKey="count"
                name="일 리뷰 작성"
                fill="#8b5cf6"
                radius={[3, 3, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulativeCount"
                name="전체 리뷰수"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* 신고 처리 현황 */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <h2 className="text-sm font-semibold text-neutral-700 mb-4">신고 처리 현황</h2>
          {reportChartData.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-sm text-neutral-400">
              데이터 없음
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={reportChartData}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {reportChartData.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={REPORT_COLORS[entry.status] ?? '#94a3b8'}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value}건`, name]} />
                <Legend
                  formatter={(value) => (
                    <span className="text-xs text-neutral-600">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

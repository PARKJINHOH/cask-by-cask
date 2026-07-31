import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useRanking, useMyRank } from '@/domain/ranking/hooks/useRanking'
import type { RankingItem, RankingPeriod } from '@/domain/ranking/types/ranking.types'
import LevelBadge from '@/shared/components/LevelBadge'
import AdminIcon from '@/shared/components/icons/AdminIcon'
import ProducerIcon from '@/shared/components/icons/ProducerIcon'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'

// ── 기간 탭 ───────────────────────────────────────────────────

const PERIOD_TABS: { value: RankingPeriod; labelKey: string }[] = [
  { value: 'WEEKLY',  labelKey: 'ranking.tabs.weekly' },
  { value: 'MONTHLY', labelKey: 'ranking.tabs.monthly' },
  { value: 'ALL',     labelKey: 'ranking.tabs.all' },
]

// ── 기간별 점수 표시 ──────────────────────────────────────────

function periodScore(item: RankingItem, period: RankingPeriod): number {
  if (period === 'WEEKLY')  return item.weeklyScore
  if (period === 'MONTHLY') return item.monthlyScore
  return item.maturingPower
}

function periodLabel(period: RankingPeriod, t: any): string {
  if (period === 'WEEKLY')  return t('ranking.labels.weeklyScore', '주간 점수')
  if (period === 'MONTHLY') return t('ranking.labels.monthlyScore', '월간 점수')
  return t('ranking.labels.levelScore', '레벨 점수')
}

// ── 유저 아이콘 ───────────────────────────────────────────────

function RankIcon({ item }: { item: RankingItem }) {
  if (item.role === 'ADMIN') return <AdminIcon size={22} />
  if (item.role === 'DISTILLERY') return <ProducerIcon logoUrl={item.producerLogoUrl ?? undefined} size={22} />
  return <LevelBadge level={item.currentLevel} size={22} />
}

// ── 순위 메달 ─────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg leading-none">🥇</span>
  if (rank === 2) return <span className="text-lg leading-none">🥈</span>
  if (rank === 3) return <span className="text-lg leading-none">🥉</span>
  return (
    <span className="w-7 text-center text-sm font-bold text-neutral-500 tabular-nums">
      {rank}
    </span>
  )
}

// ── Top 3 시상대 ──────────────────────────────────────────────

function Podium({ top3, period }: { top3: RankingItem[]; period: RankingPeriod }) {
  if (top3.length === 0) return null

  const order = [top3[1], top3[0], top3[2]].filter(Boolean) // 2위, 1위, 3위 순 배치

  const podiumHeight: Record<number, string> = { 1: 'h-20', 2: 'h-14', 3: 'h-10' }
  const podiumBg: Record<number, string> = {
    1: 'bg-amber-400',
    2: 'bg-neutral-300',
    3: 'bg-amber-700/60',
  }

  return (
    <div className="flex items-end justify-center gap-3 py-6">
      {order.map((item) => (
        <div key={item.userId} className="flex flex-col items-center gap-1.5 flex-1 max-w-[110px]">
          {/* 아이콘 */}
          <RankIcon item={item} />

          {/* 닉네임 */}
          <p className="text-xs font-semibold text-neutral-800 truncate w-full text-center">
            {item.nickname}
          </p>

          {/* 점수 */}
          <p className="text-xs text-amber-700 font-bold tabular-nums">
            {periodScore(item, period).toLocaleString()}
          </p>

          {/* 시상대 블록 */}
          <div className={`w-full rounded-t-lg ${podiumHeight[item.rank]} ${podiumBg[item.rank]}
            flex items-center justify-center`}>
            <RankBadge rank={item.rank} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 4위 이하 테이블 행 ────────────────────────────────────────

function RankRow({
  item,
  period,
  isMe,
}: {
  item: RankingItem
  period: RankingPeriod
  isMe: boolean
}) {
  const { t } = useTranslation()
  return (
    <tr
      className={`border-b border-neutral-50 last:border-0 transition-colors ${
        isMe ? 'bg-amber-50' : 'hover:bg-neutral-50/60'
      }`}
    >
      {/* 순위 */}
      <td className="py-3 pl-4 pr-2 w-12 text-center">
        <RankBadge rank={item.rank} />
      </td>

      {/* 아이콘 + 닉네임 */}
      <td className="py-3 px-2">
        <div className="flex items-center gap-2">
          <RankIcon item={item} />
          <span className={`text-sm font-medium truncate max-w-[160px] ${isMe ? 'text-amber-700' : 'text-neutral-800'}`}>
            {item.nickname}
            {isMe && <span className="ml-1 text-xs text-amber-500">({t('ranking.labels.me', '나')})</span>}
          </span>
        </div>
      </td>

      {/* 레벨 */}
      <td className="py-3 px-2 hidden sm:table-cell">
        {item.role === 'MEMBER' && (
          <span className="text-xs text-neutral-500">
            Lv.{item.currentLevel}
          </span>
        )}
      </td>

      {/* 기간 점수 */}
      <td className="py-3 pr-4 text-right">
        <span className="text-sm font-bold text-amber-700 tabular-nums">
          {periodScore(item, period).toLocaleString()}
        </span>
      </td>
    </tr>
  )
}

// ── 내 순위 고정 바 ───────────────────────────────────────────

function MyRankBar({ period }: { period: RankingPeriod }) {
  const { t } = useTranslation()
  const { data: myRank, isLoading } = useMyRank(period)
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const isAuthReady = useAuthStore((s) => s.isAuthReady)

  if (!isAuthReady || !isLoggedIn) return null

  return (
    <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-30 bg-amber-600/95
      backdrop-blur-sm shadow-lg border-t border-amber-500">
      <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-amber-100 font-medium">
            {t('ranking.labels.myRank', '내 순위')}
          </span>
          {isLoading ? (
            <Spinner className="text-amber-200 w-4 h-4" />
          ) : myRank ? (
            <>
              <span className="text-white font-extrabold text-lg tabular-nums">
                #{myRank.rank}
              </span>
              <span className="text-amber-100 text-sm">{myRank.nickname}</span>
            </>
          ) : null}
        </div>
        {myRank && (
          <div className="text-right">
            <p className="text-xs text-amber-200">{periodLabel(period, t)}</p>
            <p className="text-white font-bold tabular-nums">
              {myRank.periodScore.toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────

export default function RankingPage() {
  const { t, i18n } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const periodParam = (searchParams.get('period') ?? 'WEEKLY') as RankingPeriod
  const [page, setPage] = useState(0)

  const period = PERIOD_TABS.find((t) => t.value === periodParam)
    ? periodParam
    : 'WEEKLY'

  const authUser = useAuthStore((s) => s.user)
  const { data, isLoading } = useRanking(period, page)

  const setPeriod = (p: RankingPeriod) => {
    setSearchParams({ period: p })
    setPage(0)
  }

  const top3 = data?.content.filter((item) => item.rank <= 3) ?? []
  const rest  = data?.content.filter((item) => item.rank > 3)  ?? []

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-24 lg:pb-16 space-y-5">
      <SeoMeta
        title={t('ranking.title', '레벨 랭킹')}
        description={t('ranking.seo.desc', 'CaskByCask 사용자 활동 점수 랭킹. 주간·월간·전체 기간별 리뷰와 활동에 따른 레벨 순위를 확인하세요.')}
        canonical={buildCanonical(`/${i18n.language === 'en' ? 'en' : 'ko'}/ranking`)}
        keywords={t('ranking.seo.keywords', 'CaskByCask 랭킹, 레벨, 위스키 리뷰 랭킹, 사용자 활동 점수')}
      />

      {/* 헤더 */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-extrabold text-neutral-900">🏆 {t('ranking.title', '레벨 랭킹')}</h1>
        <p className="text-sm text-neutral-500">{t('ranking.subtitle', '활발히 활동해서 나만의 레벨을 올려보세요!')}</p>
      </div>

      {/* 기간 탭 */}
      <div className="flex rounded-xl bg-neutral-100 p-1 gap-1">
        {PERIOD_TABS.map(({ value, labelKey }) => (
          <button
            key={value}
            onClick={() => setPeriod(value)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              period === value
                ? 'bg-white text-amber-700 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="text-amber-600" />
        </div>
      ) : !data || data.empty ? (
        <p className="text-center text-neutral-400 py-16">{t('ranking.labels.empty', '랭킹 데이터가 없습니다.')}</p>
      ) : (
        <>
          {/* Top 3 시상대 (1페이지만) */}
          {page === 0 && top3.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
              <Podium top3={top3} period={period} />
            </div>
          )}

          {/* 4위 이하 테이블 */}
          {rest.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50/70">
                    <th className="py-2.5 pl-4 pr-2 text-xs text-neutral-400 font-medium text-center w-12">
                      {t('ranking.labels.rank', '순위')}
                    </th>
                    <th className="py-2.5 px-2 text-xs text-neutral-400 font-medium text-left">
                      {t('ranking.labels.nickname', '닉네임')}
                    </th>
                    <th className="py-2.5 px-2 text-xs text-neutral-400 font-medium text-left hidden sm:table-cell">
                      {t('ranking.labels.level', '레벨')}
                    </th>
                    <th className="py-2.5 pr-4 text-xs text-neutral-400 font-medium text-right">{periodLabel(period, t)}</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((item) => (
                    <RankRow
                      key={item.userId}
                      item={item}
                      period={period}
                      isMe={item.userId === authUser?.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 페이지네이션 */}
          <Pagination
            currentPage={page}
            totalPages={data.totalPages}
            onPageChange={setPage}
            scrollTarget="page"
          />
        </>
      )}

      {/* 내 순위 고정 바 */}
      <MyRankBar period={period} />
    </div>
  )
}

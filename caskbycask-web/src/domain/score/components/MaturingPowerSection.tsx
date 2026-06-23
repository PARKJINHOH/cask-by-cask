import { useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { UserProfile } from '@/domain/user/types/user.types'
import LevelBadge from '@/shared/components/LevelBadge'
import Spinner from '@/shared/components/Spinner'
import EmptyState from '@/shared/components/EmptyState'
import { formatDate } from '@/shared/utils/format'
import { useInfiniteScoreHistory, useLevelConfigs } from '../hooks/useScoreHistory'
import {
  MAX_LEVEL,
  calcProgress,
  ACTION_ICONS,
  LEVELS,
} from '../types/score.types'
import type { ScoreHistoryFilterType, LevelInfo } from '../types/score.types'
import { useState } from 'react'
import AttendanceGrass from './AttendanceGrass'

// ── 진행 바 컴포넌트 ──────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ── 레벨 현황 카드 ────────────────────────────────────────────

function LevelCard({ profile }: { profile: UserProfile }) {
  const { t } = useTranslation()
  const currentLevel = profile.currentLevel ?? 1
  const maturingPower = profile.maturingPower ?? 0
  const pct = calcProgress(maturingPower, currentLevel)
  const isMax = currentLevel >= MAX_LEVEL

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <LevelBadge level={currentLevel} size={56} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-neutral-900">
              Lv.{currentLevel}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {isMax ? t('maturing.maxLevel', '최고 레벨 달성') : t('maturing.nextLevelProgress', { percent: 100 - pct, defaultValue: `다음 레벨까지 ${100 - pct}%` })}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {isMax ? (
          <>
            <ProgressBar pct={100} />
            <p className="text-xs text-center text-amber-600 font-semibold">
              {t('maturing.maxLevelAward', '🏆 최고 레벨 달성!')}
            </p>
          </>
        ) : (
          <>
            <ProgressBar pct={pct} />
            <p className="text-xs text-neutral-500 text-right">
              <span className="font-semibold text-amber-700">Lv.{currentLevel + 1}</span>
              {' '}{t('maturing.until', '까지')}{' '}
              <span className="font-semibold text-neutral-700 tabular-nums">{100 - pct}%</span>
              {' '}{t('maturing.left', '남음')}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ── 레벨 맵 카드 ─────────────────────────────────────────────

function LevelMapCard({ currentLevel }: { currentLevel: number }) {
  const { t } = useTranslation()
  const { data: levels } = useLevelConfigs()
  const all: LevelInfo[] = levels && levels.length > 0 ? levels : LEVELS
  const maxLv = all.length

  // 100레벨 전체 대신 현재 레벨 주변만 보여준다 (앞 2 ~ 뒤 3, 총 6칸).
  const start = Math.max(1, Math.min(currentLevel - 2, maxLv - 5))
  const window = all.filter((lv) => lv.level >= start && lv.level <= start + 5)

  return (
    <div className="bg-white rounded-2xl px-4 py-4 shadow-sm border border-neutral-100">
      <p className="text-xs font-semibold text-neutral-500 mb-3">{t('maturing.levelStatus', '레벨 현황')}</p>
      <div className="flex gap-2 justify-between">
        {window.map((lv) => {
          const isPast    = lv.level < currentLevel
          const isCurrent = lv.level === currentLevel

          return (
            <div
              key={lv.level}
              className={[
                'flex flex-col items-center gap-1.5 px-2 py-2 rounded-xl border transition-colors flex-1',
                isCurrent
                  ? 'bg-amber-50 border-amber-400 shadow-sm'
                  : isPast
                  ? 'bg-neutral-50 border-neutral-200'
                  : 'bg-white border-neutral-100',
              ].join(' ')}
            >
              <LevelBadge level={lv.level} size={isCurrent ? 34 : 26} />
              <span className={[
                'text-[10px] font-bold leading-none tabular-nums',
                isCurrent ? 'text-amber-700' : isPast ? 'text-neutral-500' : 'text-neutral-300',
              ].join(' ')}>
                Lv.{lv.level}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}



// ── 점수 이력 아이템 ──────────────────────────────────────────

function HistoryItem({
  item,
}: {
  item: {
    id: number
    actionType: string
    score: number
    description: string | null
    linkUrl: string | null
    createdAt: string
  }
}) {
  const isPositive = item.score >= 0
  const icon = ACTION_ICONS[item.actionType] ?? '•'
  const hasLink = !!item.linkUrl

  const inner = (
    <>
      <span className="text-lg leading-none w-6 text-center flex-shrink-0">{icon}</span>
      <p
        className={`flex-1 text-sm min-w-0 truncate ${
          hasLink ? 'text-neutral-700 group-hover:text-amber-700' : 'text-neutral-700'
        }`}
      >
        {item.description ?? item.actionType}
      </p>
      <span
        className={`text-sm font-bold tabular-nums flex-shrink-0 ${
          isPositive ? 'text-green-600' : 'text-red-500'
        }`}
      >
        {isPositive ? '+' : ''}{item.score}
      </span>
      <span className="text-xs text-neutral-400 flex-shrink-0 w-20 text-right">
        {formatDate(item.createdAt)}
      </span>
    </>
  )

  if (hasLink) {
    return (
      <Link
        to={item.linkUrl!}
        className="group flex items-center gap-3 py-3 border-b border-neutral-50 last:border-0 -mx-2 px-2 rounded-lg hover:bg-amber-50/40 transition-colors"
      >
        {inner}
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-neutral-50 last:border-0">
      {inner}
    </div>
  )
}

// ── 필터 탭 ───────────────────────────────────────────────────

const FILTER_TABS: { value: ScoreHistoryFilterType; label: string }[] = [
  { value: 'ALL',    label: '전체' },
  { value: 'EARN',   label: '적립' },
  { value: 'DEDUCT', label: '차감' },
]

// ── 점수 이력 목록 ────────────────────────────────────────────

function ScoreHistoryList() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<ScoreHistoryFilterType>('ALL')
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteScoreHistory(filter)

  // 무한 스크롤 Sentinel
  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect()
      if (!node || !hasNextPage) return
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage()
          }
        },
        { rootMargin: '200px' },
      )
      observerRef.current.observe(node)
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  )

  const allItems = data?.pages.flatMap((p) => p.content) ?? []

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
      {/* 필터 탭 */}
      <div className="flex border-b border-neutral-100">
        {FILTER_TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              filter === value
                ? 'text-amber-700 border-b-2 border-amber-600 bg-amber-50/50'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {t(`maturing.filter.${value.toLowerCase()}`, label)}
          </button>
        ))}
      </div>

      <div className="px-4">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="text-amber-600" />
          </div>
        ) : allItems.length === 0 ? (
          <div className="py-8">
            <EmptyState
              title={t('maturing.noHistoryTitle', '점수 이력이 없습니다.')}
              description={t('maturing.noHistoryDesc', '글쓰기, 댓글, 출석 등 다양한 활동으로 레벨을 올려보세요!')}
            />
          </div>
        ) : (
          <>
            {allItems.map((item) => (
              <HistoryItem key={item.id} item={item} />
            ))}

            {/* 무한 스크롤 감지 */}
            <div ref={sentinelRef} className="py-2 flex justify-center">
              {isFetchingNextPage && <Spinner className="text-amber-400" />}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── 메인 export ───────────────────────────────────────────────

export default function MaturingPowerSection({ profile }: { profile: UserProfile }) {
  const currentLevel = profile.currentLevel ?? 1

  return (
    <div className="space-y-4">
      <LevelCard profile={profile} />
      <LevelMapCard currentLevel={currentLevel} />
      <AttendanceGrass streakCount={profile.consecutiveAttendance} />
      <ScoreHistoryList />
    </div>
  )
}

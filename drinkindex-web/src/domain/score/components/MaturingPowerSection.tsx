import { useRef, useCallback } from 'react'
import type { UserProfile } from '@/domain/user/types/user.types'
import LevelIcon from '@/shared/components/icons/LevelIcon'
import Spinner from '@/shared/components/Spinner'
import EmptyState from '@/shared/components/EmptyState'
import { formatDate } from '@/shared/utils/format'
import { useInfiniteScoreHistory, useLevelConfigs } from '../hooks/useScoreHistory'
import {
  MAX_LEVEL,
  getLevelInfo,
  getNextLevelInfo,
  calcProgress,
  ACTION_ICONS,
  LEVELS,
} from '../types/score.types'
import type { ScoreHistoryFilterType, LevelInfo } from '../types/score.types'
import { useState } from 'react'

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
  const currentLevel = profile.currentLevel ?? 1
  const maturingPower = profile.maturingPower ?? 0
  const curInfo = getLevelInfo(currentLevel)
  const nextInfo = getNextLevelInfo(currentLevel)
  const pct = calcProgress(maturingPower, currentLevel)
  const isMax = currentLevel >= MAX_LEVEL

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <LevelIcon level={currentLevel} size={52} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-neutral-900">
              Lv.{currentLevel}
            </span>
            <span className="text-base font-semibold text-amber-700">
              {curInfo.name}
            </span>
          </div>
          <p className="text-2xl font-extrabold text-amber-600 tabular-nums mt-0.5">
            {maturingPower.toLocaleString()}
            <span className="text-sm font-medium text-neutral-400 ml-1">숙성력</span>
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {isMax ? (
          <>
            <ProgressBar pct={100} />
            <p className="text-xs text-center text-amber-600 font-semibold">
              🏆 최고 레벨 달성!
            </p>
          </>
        ) : (
          <>
            <div className="flex justify-between text-xs text-neutral-500">
              <span>다음 레벨까지</span>
              <span className="tabular-nums">
                {maturingPower.toLocaleString()} / {nextInfo!.minScore.toLocaleString()}
              </span>
            </div>
            <ProgressBar pct={pct} />
            <p className="text-xs text-neutral-500 text-right">
              <span className="font-semibold text-amber-700">
                Lv.{currentLevel + 1} {nextInfo!.name}
              </span>
              까지{' '}
              <span className="font-semibold text-neutral-700 tabular-nums">
                {(nextInfo!.minScore - maturingPower).toLocaleString()}
              </span>{' '}
              숙성력 남음
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ── 레벨 맵 카드 ─────────────────────────────────────────────

function LevelMapCard({ maturingPower, currentLevel }: { maturingPower: number; currentLevel: number }) {
  const { data: levels } = useLevelConfigs()
  const displayLevels: LevelInfo[] = levels && levels.length > 0 ? levels : LEVELS

  return (
    <div className="bg-white rounded-2xl px-4 py-4 shadow-sm border border-neutral-100">
      <p className="text-xs font-semibold text-neutral-500 mb-3">레벨 현황</p>
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-2 min-w-max pb-1">
          {displayLevels.map((lv) => {
            const isPast    = lv.level < currentLevel
            const isCurrent = lv.level === currentLevel
            const isFuture  = lv.level > currentLevel

            return (
              <div
                key={lv.level}
                className={[
                  'flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl border transition-colors flex-shrink-0',
                  isCurrent
                    ? 'bg-amber-50 border-amber-400 shadow-sm'
                    : isPast
                    ? 'bg-neutral-50 border-neutral-200'
                    : 'bg-white border-neutral-100',
                ].join(' ')}
              >
                <LevelIcon
                  level={lv.level}
                  size={isCurrent ? 28 : 22}
                />
                <span className={[
                  'text-[10px] font-bold leading-none',
                  isCurrent ? 'text-amber-700' : isPast ? 'text-neutral-500' : 'text-neutral-300',
                ].join(' ')}>
                  {lv.name}
                </span>
                <span className={[
                  'text-[9px] leading-none tabular-nums',
                  isCurrent ? 'text-amber-500' : isFuture ? 'text-neutral-300' : 'text-neutral-400',
                ].join(' ')}>
                  {lv.minScore.toLocaleString()}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── 출석 현황 카드 ────────────────────────────────────────────

function AttendanceCard({ profile }: { profile: UserProfile }) {
  const streak = profile.consecutiveAttendance ?? 0

  // 7일 보너스까지 남은 일수 (streak % 7 기준)
  const toNext7 = streak === 0 ? 7 : 7 - (streak % 7)
  // 30일 보너스까지 남은 일수
  const toNext30 = streak === 0 ? 30 : 30 - (streak % 30)

  // 7칸 마커: 현재 streak의 7일 사이클 내 위치
  const filledDots = streak % 7 === 0 && streak > 0 ? 7 : streak % 7

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">🔥</span>
          <div>
            <p className="text-sm font-semibold text-neutral-800">
              <span className="text-xl font-extrabold text-orange-500 tabular-nums mr-1">
                {streak}
              </span>
              일 연속 출석 중
            </p>
          </div>
        </div>
      </div>

      {/* 7칸 출석 마커 */}
      <div className="flex gap-2 mt-3">
        {Array.from({ length: 7 }, (_, i) => (
          <div
            key={i}
            className={`flex-1 h-2.5 rounded-full transition-colors ${
              i < filledDots
                ? 'bg-orange-400'
                : 'bg-neutral-100'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-neutral-400 mt-1 text-right">
        7일 연속까지 {toNext7}일
      </p>

      {/* 보너스 안내 */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-neutral-500">
        <div className="bg-amber-50 rounded-xl px-3 py-2 text-center">
          <p className="font-semibold text-amber-700">🎉 7일 보너스</p>
          <p className="mt-0.5 tabular-nums">
            {toNext7 === 7 ? '오늘 달성!' : `${toNext7}일 후`}
          </p>
        </div>
        <div className="bg-amber-50 rounded-xl px-3 py-2 text-center">
          <p className="font-semibold text-amber-700">🏆 30일 보너스</p>
          <p className="mt-0.5 tabular-nums">
            {toNext30 === 30 ? '오늘 달성!' : `${toNext30}일 후`}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── 점수 이력 아이템 ──────────────────────────────────────────

function HistoryItem({
  item,
}: {
  item: { id: number; actionType: string; score: number; description: string | null; createdAt: string }
}) {
  const isPositive = item.score >= 0
  const icon = ACTION_ICONS[item.actionType] ?? '•'

  return (
    <div className="flex items-center gap-3 py-3 border-b border-neutral-50 last:border-0">
      <span className="text-lg leading-none w-6 text-center flex-shrink-0">{icon}</span>
      <p className="flex-1 text-sm text-neutral-700 min-w-0 truncate">
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
            {label}
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
              title="점수 이력이 없습니다."
              description="글쓰기, 댓글, 출석 등 다양한 활동으로 숙성력을 쌓아보세요!"
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
  const currentLevel  = profile.currentLevel ?? 1
  const maturingPower = profile.maturingPower ?? 0

  return (
    <div className="space-y-4">
      <LevelCard profile={profile} />
      <LevelMapCard maturingPower={maturingPower} currentLevel={currentLevel} />
      <AttendanceCard profile={profile} />
      <ScoreHistoryList />
    </div>
  )
}

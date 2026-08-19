import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AromaProfile, AromaProfilePhase } from '../types/review.types'

const AromaRadarChart = lazy(() => import('./AromaRadarChart'))

const PHASES: AromaProfilePhase[] = ['NOSE', 'PALATE', 'FINISH']

/**
 * 레이더 높이 — 모드별로 못 박는다.
 *
 * <p>chartOnly 는 예전에 `h-full` + `flex-1` 로 옆 칸(향·맛·피니시 노트) 높이를 따라갔다.
 * 노트가 긴 리뷰에서는 레이더가 세로로 길게 늘어져 원이 찌그러져 보였다.
 * 어느 리뷰에서든 같은 크기로 서도록 고정한다.
 */
const CHART_HEIGHT = { chartOnly: 200, compact: 190, full: 250 } as const

interface Props {
  profiles: AromaProfile[]
  compact?: boolean
  chartOnly?: boolean
}

export function intensityKey(value: number): string {
  return ['veryWeak', 'weak', 'medium', 'strong', 'veryStrong'][Math.max(1, Math.min(5, Math.round(value))) - 1]
}

export default function AromaProfileChartPanel({ profiles, compact = false, chartOnly = false }: Props) {
  const { t } = useTranslation()
  const sorted = useMemo(
    () => PHASES.map((phase) => profiles.find((profile) => profile.phase === phase)).filter(Boolean) as AromaProfile[],
    [profiles],
  )
  const [activePhase, setActivePhase] = useState<AromaProfilePhase | undefined>(sorted[0]?.phase)
  const active = sorted.find((profile) => profile.phase === activePhase) ?? sorted[0]

  useEffect(() => {
    if (!sorted.some((profile) => profile.phase === activePhase)) setActivePhase(sorted[0]?.phase)
  }, [activePhase, sorted])

  if (!active) return null

  const chartHeight = chartOnly ? CHART_HEIGHT.chartOnly : compact ? CHART_HEIGHT.compact : CHART_HEIGHT.full

  return (
    <section className="rounded-2xl border border-amber-200/70 bg-amber-50/30 p-3 sm:p-4">
      {/* 프로파일이 하나뿐이라도 탭과 같은 상자를 쓴다 — 개수에 따라 머리글 높이가 달라지면
          패널 전체 높이가 들쭉날쭉해진다. 하나뿐일 때는 누를 것이 없으니 이름표로 그린다. */}
      <div
        className="mb-2 flex rounded-xl bg-white p-1"
        role={sorted.length > 1 ? 'tablist' : undefined}
        aria-label={sorted.length > 1 ? t('review.aromaProfile.title') : undefined}
      >
        {sorted.map((profile) => (
          sorted.length > 1 ? (
            <button
              key={profile.phase}
              type="button"
              role="tab"
              aria-selected={profile.phase === active.phase}
              onClick={() => setActivePhase(profile.phase)}
              className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-bold transition ${
                profile.phase === active.phase
                  ? 'bg-amber-100 text-amber-900'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              {t(`review.aromaProfile.phase.${profile.phase}`)}
            </button>
          ) : (
            <h3
              key={profile.phase}
              className="flex-1 rounded-lg bg-amber-100 px-2 py-1.5 text-center text-xs font-bold text-amber-900"
            >
              {t('review.aromaProfile.profileName', {
                phase: t(`review.aromaProfile.phase.${profile.phase}`),
              })}
            </h3>
          )
        ))}
      </div>

      <Suspense
        fallback={<div style={{ height: chartHeight }} className="animate-pulse rounded-xl bg-amber-100/50" />}
      >
        <AromaRadarChart items={active.items} height={chartHeight} />
      </Suspense>

      <ul className={chartOnly ? 'sr-only' : 'grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-neutral-600'} aria-label={t('review.aromaProfile.textAlternative')}>
        {active.items.map((item) => (
          <li key={`${item.aromaType}:${item.aromaKey}`} className="flex min-w-0 justify-between gap-2">
            <span className="truncate">{item.labelSnapshot}</span>
            <span className="shrink-0 font-bold text-amber-800" aria-label={t('review.aromaProfile.itemValue', {
              aroma: item.labelSnapshot,
              intensity: item.intensity,
              label: t(`review.aromaProfile.intensity.${intensityKey(item.intensity)}`),
            })}>
              {item.intensity}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AromaProfile, AromaProfilePhase } from '../types/review.types'

const AromaRadarChart = lazy(() => import('./AromaRadarChart'))

const PHASES: AromaProfilePhase[] = ['NOSE', 'PALATE', 'FINISH']

interface Props {
  profiles: AromaProfile[]
  compact?: boolean
  chartOnly?: boolean
}

export function intensityKey(value: number): string {
  return ['veryWeak', 'weak', 'medium', 'strong', 'veryStrong'][Math.max(1, Math.min(5, value)) - 1]
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

  return (
    <section className={`rounded-2xl border border-amber-200/70 bg-amber-50/30 p-3 sm:p-4 ${chartOnly ? 'flex h-full min-h-[180px] flex-col' : ''}`}>
      {sorted.length > 1 ? (
        <div className="mb-2 flex rounded-xl bg-white p-1" role="tablist" aria-label={t('review.aromaProfile.title')}>
          {sorted.map((profile) => (
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
          ))}
        </div>
      ) : (
        <h3 className="mb-1 text-sm font-bold text-neutral-800">
          {t('review.aromaProfile.profileName', {
            phase: t(`review.aromaProfile.phase.${active.phase}`),
          })}
        </h3>
      )}

      <Suspense fallback={<div className={`${chartOnly ? 'min-h-[130px] flex-1' : compact ? 'h-[190px]' : 'h-[250px]'} animate-pulse rounded-xl bg-amber-100/50`} />}>
        {chartOnly ? (
          <div className="min-h-[130px] flex-1">
            <AromaRadarChart items={active.items} height="100%" />
          </div>
        ) : (
          <AromaRadarChart items={active.items} height={compact ? 190 : 250} />
        )}
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

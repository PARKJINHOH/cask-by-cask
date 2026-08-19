import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { AromaProfile, AromaProfileItem, AromaProfilePhase } from '../types/review.types'

const PHASES: AromaProfilePhase[] = ['NOSE', 'PALATE', 'FINISH']

interface Props {
  profiles: AromaProfile[]
  expanded: boolean
  controlsId: string
  onToggle: () => void
  className?: string
}

function polygonPoints(items: AromaProfileItem[], radius: number): string {
  const center = 24
  return items.map((item, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / items.length
    const valueRadius = radius * (item.intensity / 5)
    return `${center + Math.cos(angle) * valueRadius},${center + Math.sin(angle) * valueRadius}`
  }).join(' ')
}

function guidePoints(count: number, radius: number): string {
  const center = 24
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count
    return `${center + Math.cos(angle) * radius},${center + Math.sin(angle) * radius}`
  }).join(' ')
}

export default function AromaProfilePreviewButton({ profiles, expanded, controlsId, onToggle, className = '' }: Props) {
  const { t } = useTranslation()
  const preview = useMemo(
    () => PHASES.map((phase) => profiles.find((profile) => profile.phase === phase)).find(Boolean),
    [profiles],
  )

  if (!preview) return null

  const label = t(expanded ? 'review.aromaProfile.collapse' : 'review.aromaProfile.expand')
  const guide = guidePoints(preview.items.length, 16)
  const data = polygonPoints(preview.items, 16)

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls={controlsId}
      aria-label={label}
      title={label}
      // 켜짐/꺼짐은 색조가 아니라 계열 자체로 가른다 — 앰버 두 단계만으로는 눌린 상태가 구분되지 않았다.
      className={`group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 transition-[border-color,background-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 active:scale-95 motion-reduce:transition-none ${
        expanded
          ? 'border-amber-600 bg-amber-100 shadow-[0_0_0_3px_rgba(245,158,11,0.28)]'
          : 'border-neutral-200 bg-white hover:border-amber-300 hover:bg-amber-50'
      } ${className}`}
    >
      <svg viewBox="0 0 48 48" className="h-9 w-9" aria-hidden="true">
        <polygon points={guide} fill="none" stroke={expanded ? '#d6d3d1' : '#e7e5e4'} strokeWidth="1" />
        <polygon points={guidePoints(preview.items.length, 8)} fill="none" stroke={expanded ? '#e7e5e4' : '#f5f5f4'} strokeWidth="1" />
        <polygon
          points={data}
          fill={expanded ? '#f59e0b' : '#a8a29e'}
          fillOpacity={expanded ? 0.4 : 0.22}
          stroke={expanded ? '#b45309' : '#a8a29e'}
          strokeWidth="1.7"
        />
        <circle cx="24" cy="24" r="1.5" fill={expanded ? '#92400e' : '#a8a29e'} />
      </svg>
      <span
        className={`absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white text-white transition-colors duration-200 motion-reduce:transition-none ${
          expanded ? 'bg-amber-700' : 'bg-neutral-400'
        }`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 10 10"
          className={`h-2 w-2 transition-transform duration-200 motion-reduce:transition-none ${expanded ? 'rotate-45' : ''}`}
        >
          <path d="M5 1.5v7M1.5 5h7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
    </button>
  )
}

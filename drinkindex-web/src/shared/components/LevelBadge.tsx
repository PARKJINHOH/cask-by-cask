import { useId } from 'react'

/**
 * LevelBadge — "위스키 글라스(플루이드 웨이브)" 레벨 뱃지.
 *
 * 컨셉: 둥근 사각 토큰 안에 술이 차오르는 메타포.
 *   - 숫자(레벨)가 항상 한가운데에 굵게, 또렷하게 보인다. (paint-order 로 외곽 헤일로)
 *   - 10레벨마다 밴드(band)가 바뀌며 액체 색과 채움 높이가 올라간다. (총 100레벨 = 10밴드)
 *   - band = floor((level-1)/10) → 0~9. 색상 램프는 스톤→브론즈→앰버→실버→골드
 *     →에메랄드→사파이어→아메시스트→루비→프리즘(91~100, 무지개+샤이머).
 *
 * 작은 아바타(16px)부터 큰 카드(96px)까지 viewBox 로 자연스럽게 스케일된다.
 */

interface LevelBadgeProps {
  level: number
  /** 픽셀 크기(정사각). 기본 40 */
  size?: number
  /** (구버전 호환용 — 현재 밴드는 절대 레벨 기준이라 무시됨) */
  maxLevel?: number
  className?: string
}

type Band = { base: string; deep: string; ring: string; prism?: boolean }

// 10밴드 색 램프 (design-5-cask 와 동일)
const BANDS: Band[] = [
  { base: '#94a3b8', deep: '#475569', ring: '#cbd5e1' }, // 1–10  스톤
  { base: '#cd8b50', deep: '#8a5223', ring: '#e3ab74' }, // 11–20 브론즈
  { base: '#f59e0b', deep: '#b45309', ring: '#fcd34d' }, // 21–30 앰버
  { base: '#cbd5e1', deep: '#64748b', ring: '#f1f5f9' }, // 31–40 실버
  { base: '#fbbf24', deep: '#a16207', ring: '#fde68a' }, // 41–50 골드
  { base: '#34d399', deep: '#047857', ring: '#6ee7b7' }, // 51–60 에메랄드
  { base: '#60a5fa', deep: '#1d4ed8', ring: '#93c5fd' }, // 61–70 사파이어
  { base: '#a78bfa', deep: '#6d28d9', ring: '#c4b5fd' }, // 71–80 아메시스트
  { base: '#fb7185', deep: '#be123c', ring: '#fda4af' }, // 81–90 루비
  { base: '#f472b6', deep: '#6366f1', ring: '#ffffff', prism: true }, // 91–100 프리즘
]

export const BAND_LABELS = ['스톤', '브론즈', '앰버', '실버', '골드', '에메랄드', '사파이어', '아메시스트', '루비', '프리즘']

/** 레벨 → 밴드 인덱스(0~9) */
export function bandOf(level: number): number {
  return Math.min(9, Math.max(0, Math.floor((Math.max(1, level) - 1) / 10)))
}

export default function LevelBadge({ level, size = 40, className = '' }: LevelBadgeProps) {
  const uid = useId().replace(/:/g, '')
  const bi = bandOf(level)
  const b = BANDS[bi]

  // 채움 높이: 밴드가 오를수록 액체가 차오른다 (내부 y 6~88)
  const ratio = (bi + 1) / 10
  const top = 88 - ratio * 82
  const amp = 4.5
  const liquidPath =
    `M6 ${top} C 24 ${top - amp}, 38 ${top + amp}, 50 ${top} ` +
    `S 80 ${top - amp}, 94 ${top} L94 94 L6 94 Z`

  const digits = String(level).length
  const fontSize = digits >= 3 ? 40 : digits === 2 ? 50 : 58
  const ringW = 2.5 + bi * 0.25

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`레벨 ${level}`}
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <defs>
        <clipPath id={`clip${uid}`}>
          <rect x="6" y="6" width="88" height="88" rx="26" />
        </clipPath>
        <linearGradient id={`bg${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b212b" />
          <stop offset="1" stopColor="#0a0d12" />
        </linearGradient>
        {b.prism ? (
          <linearGradient id={`lq${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f472b6" />
            <stop offset=".5" stopColor="#a78bfa" />
            <stop offset="1" stopColor="#38bdf8" />
          </linearGradient>
        ) : (
          <linearGradient id={`lq${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={b.base} />
            <stop offset="1" stopColor={b.deep} />
          </linearGradient>
        )}
      </defs>

      {/* 빈 글라스(어두운 배경) */}
      <rect x="6" y="6" width="88" height="88" rx="26" fill={`url(#bg${uid})`} />

      {/* 액체 + 표면 하이라이트 */}
      <g clipPath={`url(#clip${uid})`}>
        <path d={liquidPath} fill={`url(#lq${uid})`} />
        <path
          d={`M6 ${top} C 24 ${top - amp}, 38 ${top + amp}, 50 ${top} S 80 ${top - amp}, 94 ${top}`}
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.45"
          strokeWidth="2"
        />
        {b.prism && (
          <rect
            x="6" y="6" width="88" height="88"
            fill="#ffffff" opacity="0.12"
            className="motion-safe:animate-[levelShimmer_2.8s_ease-in-out_infinite]"
          />
        )}
        {/* 유리 좌측 세로 광택 */}
        <rect x="20" y="14" width="6" height="72" rx="3" fill="#ffffff" opacity="0.12" />
      </g>

      {/* 테두리 */}
      <rect x="6" y="6" width="88" height="88" rx="26" fill="none" stroke={b.ring} strokeWidth={ringW} />

      {/* 숫자 — 굵게, 정중앙, 외곽 헤일로로 어떤 색 위에서도 가독 */}
      <text
        x="50" y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontWeight="900"
        fontSize={fontSize}
        fill="#ffffff"
        paintOrder="stroke"
        stroke="#0b0d12"
        strokeOpacity="0.5"
        strokeWidth={fontSize * 0.1}
        strokeLinejoin="round"
      >
        {level}
      </text>
    </svg>
  )
}

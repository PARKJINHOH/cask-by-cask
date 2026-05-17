import { useId } from 'react'

interface Props {
  level: number
  size?: number
}

interface LevelCfg {
  r: number       // fill ratio 0~1
  s: string       // stroke color
  f: string       // fill color
  o: number       // fill opacity
  d?: 'flame' | 'star1' | 'star2' | 'crown' | 'sparkle'
  diamond?: boolean
}

const CFG: Record<number, LevelCfg> = {
  1:  { r: 0,    s: '#9CA3AF', f: '#9CA3AF', o: 0 },
  2:  { r: 0.10, s: '#D97706', f: '#FEF9C3', o: 0.60 },
  3:  { r: 0.20, s: '#D97706', f: '#FEF3C7', o: 0.70 },
  4:  { r: 0.30, s: '#B45309', f: '#FDE68A', o: 0.75 },
  5:  { r: 0.50, s: '#B45309', f: '#FCD34D', o: 0.80 },
  6:  { r: 0.60, s: '#92400E', f: '#F59E0B', o: 0.85 },
  7:  { r: 0.70, s: '#78350F', f: '#D97706', o: 0.90, d: 'flame' },
  8:  { r: 0.80, s: '#78350F', f: '#D97706', o: 0.92, d: 'star1' },
  9:  { r: 1.00, s: '#92400E', f: '#D97706', o: 0.95, d: 'star2' },
  10: { r: 1.00, s: '#D97706', f: '#D97706', o: 1.00, d: 'crown' },
  11: { r: 1.00, s: '#1C0A00', f: '#D97706', o: 1.00, d: 'sparkle', diamond: true },
}

// 표준 위스키 잔 (살짝 오므라진 사다리꼴 + 둥근 바닥)
const GLASS = 'M 3.5 4 L 16.5 4 L 14.5 19 Q 10 22.5 5.5 19 Z'
// Lv.11 전용 다이아몬드형 잔 (위가 뾰족한 마름모형 변형)
const DIAMOND = 'M 10 2 L 18 11 L 14.5 19 Q 10 22.5 5.5 19 L 2 11 Z'

// 잔 내부 높이 기준 (아래 기준선 y≈22, 위 y≈4 → 18 unit)
const GLASS_BOTTOM = 22
const GLASS_HEIGHT = 18

export default function LevelIcon({ level, size = 20 }: Props) {
  const uid = useId()
  const clipId = `lv-clip-${uid.replace(/:/g, '')}`

  const cfg = CFG[level] ?? CFG[11]
  const path = cfg.diamond ? DIAMOND : GLASS

  const fillH = cfg.r * GLASS_HEIGHT
  const fillY = GLASS_BOTTOM - fillH

  return (
    <svg
      width={size}
      height={size * 1.2}
      viewBox="0 0 20 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={path} />
        </clipPath>
      </defs>

      {/* 액체 채움 */}
      {cfg.r > 0 && (
        <rect
          x="0"
          y={fillY}
          width="20"
          height={fillH + 4}
          fill={cfg.f}
          fillOpacity={cfg.o}
          clipPath={`url(#${clipId})`}
        />
      )}

      {/* 잔 테두리 */}
      <path
        d={path}
        stroke={cfg.s}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 장식 */}
      {cfg.d === 'flame'   && <FlameDecor />}
      {cfg.d === 'star1'   && <Star cx={10} cy={6} r={1.6} />}
      {cfg.d === 'star2'   && <><Star cx={7.5} cy={2} r={1.2} /><Star cx={12.5} cy={2} r={1.2} /></>}
      {cfg.d === 'crown'   && <CrownDecor color={cfg.s} />}
      {cfg.d === 'sparkle' && <SparkleDecor />}
    </svg>
  )
}

function FlameDecor() {
  return (
    <path
      d="M10 8 C8.8 6.2 9.5 4.8 10.2 5.2 C9.8 6.4 11.2 5.8 11 8 C10.5 7.2 10 8 10 8Z"
      fill="#F97316"
      fillOpacity={0.95}
    />
  )
}

function Star({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const ri = r * 0.45
  const pts = [
    [cx,      cy - r],
    [cx + ri, cy - ri],
    [cx + r,  cy],
    [cx + ri, cy + ri],
    [cx,      cy + r],
    [cx - ri, cy + ri],
    [cx - r,  cy],
    [cx - ri, cy - ri],
  ].map(([x, y]) => `${x},${y}`).join(' ')
  return <polygon points={pts} fill="#F59E0B" />
}

function CrownDecor({ color }: { color: string }) {
  return (
    <path
      d="M 4.5 4 L 4.5 1.5 L 7 3 L 10 1 L 13 3 L 15.5 1.5 L 15.5 4"
      stroke={color}
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

function SparkleDecor() {
  return (
    <g>
      {/* 중앙 4점 별 */}
      <path
        d="M10 0.5 L10.5 1.8 L11.8 2 L10.5 2.3 L10 3.5 L9.5 2.3 L8.2 2 L9.5 1.8 Z"
        fill="#F59E0B"
      />
      {/* 작은 점 장식 */}
      <circle cx="6.5" cy="2" r="0.7" fill="#F59E0B" fillOpacity={0.7} />
      <circle cx="13.5" cy="2" r="0.7" fill="#F59E0B" fillOpacity={0.7} />
    </g>
  )
}

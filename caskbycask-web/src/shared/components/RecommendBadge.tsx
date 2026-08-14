interface RecommendBadgeProps {
  count: number
  className?: string
}

// 무지개 테두리 (10+ 추천)
const RAINBOW_BORDER: React.CSSProperties = {
  borderStyle: 'solid',
  borderWidth: '1.5px',
  borderImage: 'linear-gradient(90deg,#f87171,#fbbf24,#34d399,#60a5fa,#a78bfa) 1',
}

// 특별 테두리 (20+ 추천) — 더 두껍고 채도 높은 무지개 + 그림자
const SPECIAL_BORDER: React.CSSProperties = {
  borderStyle: 'solid',
  borderWidth: '2px',
  borderImage: 'linear-gradient(90deg,#ef4444,#f59e0b,#22c55e,#3b82f6,#a855f7,#ec4899) 1',
  boxShadow: '0 0 0 1px rgba(168,85,247,0.25), 0 1px 4px rgba(245,158,11,0.35)',
}

/**
 * 추천 갯수 배지 — 갯수에 따라 배경이 점점 진해지고 10/20부터 테두리가 특별해짐.
 *  0~2 : 배경 없음(흐림)
 *  3~6 : 연한 amber
 *  7~9 : 중간 amber
 * 10~19: 진한 amber + 무지개 테두리
 *  20+ : 가장 진함 + 특별 테두리
 */
export default function RecommendBadge({ count, className = '' }: RecommendBadgeProps) {
  let tone: string
  let style: React.CSSProperties | undefined

  if (count >= 20) {
    tone = 'bg-amber-600 text-white'
    style = SPECIAL_BORDER
  } else if (count >= 10) {
    tone = 'bg-amber-200 text-amber-900'
    style = RAINBOW_BORDER
  } else if (count >= 7) {
    tone = 'bg-amber-100 text-amber-800 border border-amber-200'
  } else if (count >= 3) {
    tone = 'bg-amber-50 text-amber-700 border border-amber-100'
  } else {
    tone = 'bg-transparent text-neutral-400 border border-neutral-200'
  }

  return (
    <span
      className={[
        'inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums leading-none',
        tone,
        className,
      ].join(' ')}
      style={style}
      title={`추천 ${count}`}
    >
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M2 21h2.5a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H2v11zM22 11.5a2 2 0 0 0-2-2h-5.6l.86-4.1a1.5 1.5 0 0 0-2.86-.86L8.5 9.4A2 2 0 0 0 7.5 11v8a2 2 0 0 0 2 2h8.3a2 2 0 0 0 1.96-1.6l1.2-6A2 2 0 0 0 22 11.5z" />
      </svg>
      {count}
    </span>
  )
}

export interface StarScoreProps {
  /** 0–100 평균 점수. null이면 "리뷰 없음" 표시 */
  score: number | null
  reviewCount?: number
  showBar?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function barColor(score: number): string {
  if (score >= 85) return 'bg-green-500'
  if (score >= 70) return 'bg-amber-500'
  if (score >= 50) return 'bg-orange-500'
  return 'bg-danger-500'
}

const sizeMap = {
  sm: { score: 'text-lg', label: 'text-xs', bar: 'h-1' },
  md: { score: 'text-2xl', label: 'text-xs', bar: 'h-1.5' },
  lg: { score: 'text-3xl', label: 'text-sm',  bar: 'h-2' },
}

export default function StarScore({
  score,
  reviewCount,
  showBar = true,
  size = 'md',
  className = '',
}: StarScoreProps) {
  const cls = sizeMap[size]

  if (score == null) {
    return (
      <div className={`text-neutral-400 ${cls.label} ${className}`} aria-label="리뷰 없음">
        리뷰 없음
      </div>
    )
  }

  const pct = Math.min(100, Math.max(0, score))

  return (
    <div
      className={`space-y-1 ${className}`}
      role="img"
      aria-label={`평균 점수 ${score.toFixed(1)}점${reviewCount != null ? `, 리뷰 ${reviewCount}개` : ''}`}
    >
      {/* Numeric score */}
      <div className="flex items-baseline gap-2">
        <span className={`font-bold tabular-nums text-neutral-900 ${cls.score}`}>
          {score.toFixed(1)}
        </span>
        <span className={`text-neutral-400 ${cls.label}`}>/ 100</span>
        {reviewCount != null && (
          <span className={`text-neutral-400 ${cls.label}`}>
            · {reviewCount.toLocaleString()}개 리뷰
          </span>
        )}
      </div>

      {/* Visual bar */}
      {showBar && (
        <div
          className={`w-full rounded-full bg-neutral-100 overflow-hidden ${cls.bar}`}
          aria-hidden="true"
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor(score)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}

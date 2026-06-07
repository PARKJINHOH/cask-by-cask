/**
 * LevelBadge — 숫자 중심의 "메달형" 레벨 뱃지.
 *
 * 핵심 컨셉: "심플한 원형 메달 + 숫자 + 레벨이 오를수록 임팩트 상승".
 *   - 숫자(레벨)가 항상 메달 한가운데에 또렷이 보인다.
 *   - 임팩트는 '정의된 최고 레벨(maxLevel)에 얼마나 가까운가'로 결정(0~5 티어).
 *     → 관리자가 레벨 개수를 몇 개로 정의하든, 항상 최고 레벨이 가장 화려하게 보인다.
 *
 * 티어별 연출 — 과장 없이 '색의 깊이 + 테두리 링 + 광택'으로만 차별화. (이모지/장식 없음)
 *   t0  무채색 플랫 메달                         (시작 레벨)
 *   t1  앰버 틴트 + 얇은 테두리
 *   t2  솔리드 앰버 + 굵은 테두리
 *   t3  앰버 그라데이션 + 골드 림(테) 1겹
 *   t4  진한 그라데이션 + 흰 간격 + 딥골드 림 (2겹 느낌)
 *   t5  프리미엄 그라데이션 + 두꺼운 딥골드 림 + 은은한 샤이머  (최고 레벨)
 *
 * 링/샤이머는 size 에 비례해 두께가 정해져 작은 아바타~큰 카드 어디서나 자연스럽다.
 * (작은 아바타처럼 overflow-hidden 컨테이너 안에서는 바깥 링이 클립되어 깔끔한 코인으로만 보임)
 */

interface LevelBadgeProps {
  level: number
  /** 정의된 최고 레벨 — 임팩트(티어) 산정 기준. 미지정 시 20 */
  maxLevel?: number
  /** 픽셀 크기(정원). 기본 40 */
  size?: number
  className?: string
}

const DEFAULT_MAX_LEVEL = 20

/** 레벨 → 임팩트 티어(0~5). 최고 레벨에 가까울수록 커진다. */
export function levelTier(level: number, maxLevel: number = DEFAULT_MAX_LEVEL): number {
  if (maxLevel <= 1) return 5
  const r = (Math.max(1, level) - 1) / (maxLevel - 1) // 0~1
  if (r <= 0) return 0
  if (r <= 0.2) return 1
  if (r <= 0.4) return 2
  if (r <= 0.6) return 3
  if (r <= 0.85) return 4
  return 5
}

const TIER_BOX: Record<number, string> = {
  0: 'bg-neutral-100 text-neutral-400 ring-1 ring-inset ring-neutral-200',
  1: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-300',
  2: 'bg-amber-100 text-amber-800 ring-2 ring-inset ring-amber-400',
  3: 'bg-gradient-to-br from-amber-300 to-amber-500 text-white',
  4: 'bg-gradient-to-br from-amber-400 to-amber-600 text-white',
  5: 'bg-gradient-to-br from-amber-500 via-amber-500 to-orange-600 text-white',
}

/**
 * 고티어 메달의 '림(테)'은 box-shadow 로 그린다 — 원을 따라 동심원으로 둘러진다.
 * u = 링 단위 두께(size 비례). 작은 뱃지에서도 비율이 유지된다.
 */
function tierRim(tier: number, u: number): string | undefined {
  if (tier === 3) return `0 0 0 ${u}px rgba(251,191,36,0.9)`
  if (tier === 4) return `0 0 0 ${u}px #ffffff, 0 0 0 ${u * 2}px rgba(217,119,6,0.95)`
  if (tier === 5)
    return `0 0 0 ${u}px #ffffff, 0 0 0 ${u * 2}px rgba(180,83,9,1), 0 0 0 ${Math.round(u * 2.7)}px rgba(255,255,255,0.55)`
  return undefined
}

export default function LevelBadge({
  level,
  maxLevel = DEFAULT_MAX_LEVEL,
  size = 40,
  className = '',
}: LevelBadgeProps) {
  const tier = levelTier(level, maxLevel)
  const digits = String(level).length
  const fontSize = Math.max(9, Math.round(size * (digits >= 2 ? 0.44 : 0.52)))
  const u = Math.max(1, Math.round(size * 0.055)) // 링 단위 두께
  const showShimmer = tier >= 5 && size >= 26 // 너무 작으면 샤이머 생략

  return (
    <span
      role="img"
      aria-label={`레벨 ${level}`}
      className={`relative inline-grid place-items-center overflow-hidden rounded-full font-extrabold tabular-nums leading-none select-none align-middle ${TIER_BOX[tier]} ${className}`}
      style={{ width: size, height: size, boxShadow: tierRim(tier, u), fontSize }}
    >
      {/* 상단 글로시 하이라이트 — 메달의 입체감. 고티어일수록 또렷 */}
      {tier >= 2 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/35 to-transparent"
        />
      )}

      {/* 샤이머 — 최고 티어에서만 은은한 광채 (reduced-motion 시 전역 CSS가 무효화) */}
      {showShimmer && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/45 to-transparent motion-safe:animate-[levelShimmer_2.8s_ease-in-out_infinite]"
        />
      )}

      <span className="relative">{level}</span>
    </span>
  )
}
